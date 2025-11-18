import { Injectable, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { from, Observable, of } from 'rxjs';
import { tap, switchMap, map } from 'rxjs/operators';
import { supabaseClient } from './supabase.client';
import { DatabaseService } from './database/database.service';
import { ModalService } from './modal.service';
import { RegistrationLimitModal } from '../components/registration-limit-modal/registration-limit-modal';
import { LoginWarningModal } from '../components/login-warning-modal/login-warning-modal';
import type { User as SupabaseUser } from '@supabase/supabase-js';

// Maximum number of users allowed to register
const MAX_USER_LIMIT = 400;

// App User interface matching Firebase User structure
interface User {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  isAnonymous: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private supabase = supabaseClient;
  private databaseService = inject(DatabaseService);
  private modalService = inject(ModalService);
  private router = inject(Router);
  
  currentUser = signal<User | null>(null);
  isAuthenticated = signal(false);
  private authInitialized = signal(false);
  private initPromise: Promise<void>;
  private profileSavedForSession = new Set<string>(); // Track saved profiles by session

  constructor() {
    this.initPromise = this.initializeAuth();
  }

  private async initializeAuth(): Promise<void> {
    if (this.authInitialized()) {
      return;
    }

    // console.log('[Auth] 🚀 Initializing auth service...');
    
    // Subscribe to auth changes FIRST (before getSession)
    // This ensures we catch the SIGNED_IN event from URL hash processing
    this.supabase.auth.onAuthStateChange(async (event, session) => {
      // Only log important events to reduce console noise
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED') {
        console.log('[Auth] 🔔 Auth state:', event);
      }
      
      this.updateUserState(session?.user || null);
      
      // Only save profile on INITIAL_SESSION (first load) or actual SIGNED_IN from OAuth
      // Don't save on TOKEN_REFRESHED or visibility change SIGNED_IN events
      if (event === 'INITIAL_SESSION' && session?.user) {
        const sessionKey = `${session.user.id}-${session.access_token.substring(0, 20)}`;
        if (!this.profileSavedForSession.has(sessionKey)) {
          console.log('[Auth] ✅ Initial session, updating profile...');
          this.saveUserProfile(session.user);
          this.profileSavedForSession.add(sessionKey);
        }
      }
      
      // Clear saved sessions on sign out
      if (event === 'SIGNED_OUT') {
        this.profileSavedForSession.clear();
      }
      
      // Mark as initialized after first auth event
      if (!this.authInitialized()) {
        this.authInitialized.set(true);
      }
    });

    // Now get initial session (this will trigger onAuthStateChange if URL has tokens)
    const { data: { session }, error } = await this.supabase.auth.getSession();
    
    if (error) {
      console.error('[Auth] ❌ Error getting session:', error);
    }
    
    // Only update state if we got a session (otherwise wait for onAuthStateChange)
    if (session?.user) {
      this.updateUserState(session.user);
    }
    
    // Mark as initialized
    this.authInitialized.set(true);
  }

  async waitForAuth(): Promise<void> {
    return this.initPromise;
  }

  isAuthInitialized(): boolean {
    return this.authInitialized();
  }

  private updateUserState(supabaseUser: SupabaseUser | null): void {
    if (supabaseUser) {
      const user: User = this.mapSupabaseUserToAppUser(supabaseUser);
      this.currentUser.set(user);
      this.isAuthenticated.set(true);
    } else {
      this.currentUser.set(null);
      this.isAuthenticated.set(false);
    }
  }

  private mapSupabaseUserToAppUser(supabaseUser: SupabaseUser): User {
    return {
      uid: supabaseUser.id,
      email: supabaseUser.email || null,
      displayName: supabaseUser.user_metadata?.['full_name'] || supabaseUser.user_metadata?.['name'] || null,
      photoURL: supabaseUser.user_metadata?.['avatar_url'] || supabaseUser.user_metadata?.['picture'] || null,
      isAnonymous: false // Supabase doesn't support anonymous auth
    };
  }

  private saveUserProfile(supabaseUser: SupabaseUser): void {
    const userId = supabaseUser.id;
    
    // Check if user can register before saving profile
    this.canRegisterNewUser(userId).subscribe({
      next: (canRegister) => {
        if (!canRegister) {
          console.error(`[Auth] ❌ Registration limit reached (${MAX_USER_LIMIT} users). Cannot create new account.`);
          // Sign out the user since they can't register
          this.signOut().subscribe({
            next: () => {
              console.log('[Auth] User signed out due to registration limit');
              // Redirect to login page
              this.router.navigate(['/login']);
              // Show modal to user after a short delay to ensure navigation completes
              setTimeout(() => {
                this.showRegistrationLimitModal();
              }, 100);
            }
          });
          return;
        }

        // User can register, save profile
        const profile = {
          email: supabaseUser.email || null,
          displayName: supabaseUser.user_metadata?.['full_name'] || supabaseUser.user_metadata?.['name'] || null,
          photoURL: supabaseUser.user_metadata?.['avatar_url'] || supabaseUser.user_metadata?.['picture'] || null,
          createdAt: new Date(),
          lastLogin: new Date()
        };
        
        this.databaseService.saveUserProfile(userId, profile).subscribe({
          next: () => console.log('[Auth] ✓ Profile saved'),
          error: (error) => console.error('[Auth] ❌ Profile save failed:', error.message)
        });
      },
      error: (error) => {
        console.error('[Auth] ❌ Error checking registration limit:', error);
      }
    });
  }

  signInAnonymously(): Observable<void> {
    // Supabase doesn't support anonymous auth
    // Return error or implement alternative
    throw new Error('Anonymous authentication is not supported with Supabase');
  }

  signInWithGoogle(): Observable<void> {
    // Check if user has guest data
    const hasGuestData = this.hasGuestProgress();
    
    if (!hasGuestData) {
      // No guest data, proceed directly with login
      return this.proceedWithGoogleLogin();
    }
    
    // Show warning modal before login
    return this.showLoginWarning();
  }

  /**
   * Check if user has guest progress data in localStorage
   */
  private hasGuestProgress(): boolean {
    try {
      const guestData = localStorage.getItem('guest_progress');
      return guestData !== null && guestData !== '';
    } catch (error) {
      console.error('[Auth] Error checking guest progress:', error);
      return false;
    }
  }

  /**
   * Show login warning modal and handle user response
   */
  private showLoginWarning(): Observable<void> {
    return new Observable(observer => {
      const modalRef = this.modalService.open(LoginWarningModal);
      
      if (!modalRef) {
        // Modal failed to open, proceed with login anyway
        console.warn('[Auth] Failed to open login warning modal');
        this.proceedWithGoogleLogin().subscribe({
          next: () => {
            observer.next();
            observer.complete();
          },
          error: (error) => observer.error(error)
        });
        return;
      }

      // Handle confirm - user wants to proceed with login
      const confirmSub = modalRef.instance.confirm.subscribe(() => {
        this.modalService.close();
        
        // Clear guest data before login
        this.clearGuestData();
        
        // Proceed with Google login
        this.proceedWithGoogleLogin().subscribe({
          next: () => {
            observer.next();
            observer.complete();
          },
          error: (error) => observer.error(error)
        });
      });

      // Handle cancel - user cancelled login
      const cancelSub = modalRef.instance.cancel.subscribe(() => {
        this.modalService.close();
        observer.complete(); // Complete without error
      });

      // Cleanup subscriptions when observable is unsubscribed
      return () => {
        confirmSub.unsubscribe();
        cancelSub.unsubscribe();
      };
    });
  }

  /**
   * Clear guest progress data from localStorage
   */
  private clearGuestData(): void {
    try {
      localStorage.removeItem('guest_progress');
      localStorage.removeItem('guest_analytics');
      console.log('[Auth] Guest data and analytics cleared before login');
    } catch (error) {
      console.error('[Auth] Error clearing guest data:', error);
    }
  }

  /**
   * Proceed with Google OAuth login
   */
  private proceedWithGoogleLogin(): Observable<void> {
    return from(
      this.supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/home`,
          skipBrowserRedirect: false
        }
      }).then(({ error }) => {
        if (error) throw error;
      })
    );
  }

  /**
   * Check if new user registration is allowed
   * Returns true if user can register (existing user or under limit)
   */
  canRegisterNewUser(userId: string): Observable<boolean> {
    return this.databaseService.checkUserExists(userId).pipe(
      tap(exists => {
        if (exists) {
          console.log('[Auth] ✓ Existing user, allowing login');
        }
      }),
      // If user exists, allow them
      // If user doesn't exist, check total count
      switchMap(exists => {
        if (exists) {
          return of(true);
        }
        
        return this.databaseService.getTotalUserCount().pipe(
          map(count => {
            const canRegister = count < MAX_USER_LIMIT;
            if (!canRegister) {
              console.log(`[Auth] ❌ Registration limit reached: ${count}/${MAX_USER_LIMIT}`);
            } else {
              console.log(`[Auth] ✓ Registration allowed, current count: ${count}/${MAX_USER_LIMIT}`);
            }
            return canRegister;
          })
        );
      })
    );
  }

  linkAnonymousWithGoogle(): Observable<void> {
    // Supabase doesn't support anonymous auth, so this is not needed
    throw new Error('Link anonymous with Google is not supported with Supabase');
  }

  signOut(): Observable<void> {
    return from(
      this.supabase.auth.signOut().then(({ error }) => {
        if (error) throw error;
      })
    );
  }

  getUserId(): string | null {
    return this.currentUser()?.uid || null;
  }

  isAnonymous(): boolean {
    return this.currentUser()?.isAnonymous || false;
  }

  getDisplayName(): string | null {
    return this.currentUser()?.displayName || null;
  }

  getEmail(): string | null {
    return this.currentUser()?.email || null;
  }

  getPhotoURL(): string | null {
    return this.currentUser()?.photoURL || null;
  }

  private showRegistrationLimitModal(): void {
    const modalRef = this.modalService.open(RegistrationLimitModal);
    if (modalRef) {
      // Subscribe to close event
      modalRef.instance.close.subscribe(() => {
        this.modalService.close();
      });
    }
  }
}
