import { Injectable, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { from, Observable, of } from 'rxjs';
import { tap, switchMap, map } from 'rxjs/operators';
import { supabaseClient } from './supabase.client';
import { DatabaseService } from './database/database.service';
import { ModalService } from './modal.service';
import { AnalyticsService } from './analytics.service';
import { RegistrationLimitModal } from '../components/registration-limit-modal/registration-limit-modal';
import { LoginWarningModal } from '../components/login-warning-modal/login-warning-modal';
import { AccountInactiveModal } from '../components/account-inactive-modal/account-inactive-modal';
import { clearAllGuestData } from '../constants/storage-keys';
import type { User as SupabaseUser } from '@supabase/supabase-js';

// Maximum database size allowed in MB
const MAX_DATABASE_SIZE_MB = 410;

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
  private analyticsService = inject(AnalyticsService);
  
  currentUser = signal<User | null>(null);
  isAuthenticated = signal(false);
  private authInitialized = signal(false);
  private initPromise: Promise<void>;
  private profileSavedForSession = new Set<string>(); // Track saved profiles by session
  private sessionStartTime: number | null = null;

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
      const wasAuthenticated = this.isAuthenticated();
      const isNewUser = !wasAuthenticated;

      this.currentUser.set(user);
      this.isAuthenticated.set(true);

      // Track login if this is a new authentication
      if (!wasAuthenticated) {
        this.sessionStartTime = Date.now();
        this.analyticsService.trackLogin('google', isNewUser);

        // Set user ID for analytics
        this.analyticsService.setUserId(user.uid);

        // Set user properties
        this.analyticsService.setUserProperties({
          account_type: 'authenticated'
        });
      }
    } else {
      const wasAuthenticated = this.isAuthenticated();

      this.currentUser.set(null);
      this.isAuthenticated.set(false);

      // Track logout if user was authenticated
      if (wasAuthenticated && this.sessionStartTime) {
        const sessionDuration = Math.floor((Date.now() - this.sessionStartTime) / 1000);
        this.analyticsService.trackLogout(sessionDuration);
        this.sessionStartTime = null;
      }

      // Clear user ID
      this.analyticsService.setUserId(null);
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
    
    // First check if user exists and their status
    this.databaseService.loadUserProfile(userId).subscribe({
      next: (existingProfile) => {
        // Check if user is inactive
        if (existingProfile && existingProfile.status === 'Inactive') {
          console.error('[Auth] ❌ User account is inactive');
          // Sign out the user
          this.signOut().subscribe({
            next: () => {
              console.log('[Auth] User signed out due to inactive status');
              // Redirect to login page
              this.router.navigate(['/login']);
              // Show inactive account modal
              setTimeout(() => {
                this.showAccountInactiveModal();
              }, 100);
            }
          });
          return;
        }

        // If user exists and is active, just update last login
        if (existingProfile) {
          const profile = {
            ...existingProfile,
            lastLogin: new Date()
          };
          
          this.databaseService.saveUserProfile(userId, profile).subscribe({
            next: () => {
              console.log('[Auth] ✓ Profile updated');
            },
            error: (error) => {
              console.error('[Auth] ❌ Profile update failed:', error.message);
            }
          });
          return;
        }

        // New user - check registration limit
        this.canRegisterNewUser(userId).subscribe({
          next: ({ canRegister, currentSize }) => {
            if (!canRegister) {
              console.error(`[Auth] ❌ Registration limit reached (${currentSize}MB/${MAX_DATABASE_SIZE_MB}MB). Cannot create new account.`);
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
              lastLogin: new Date(),
              status: 'Active' as const
            };
            
            this.databaseService.saveUserProfile(userId, profile).subscribe({
              next: () => {
                console.log('[Auth] ✓ Profile saved');
                
                // Track registration for new users
                this.analyticsService.trackRegistration();
              },
              error: (error) => {
                console.error('[Auth] ❌ Profile save failed:', error.message);
                
                // Track auth error
                this.analyticsService.trackAuthError('profile_save_failed');
              }
            });
          },
          error: (error) => {
            console.error('[Auth] ❌ Error checking registration limit:', error);
          }
        });
      },
      error: (error) => {
        console.error('[Auth] ❌ Error loading user profile:', error);
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
   * Check if user has any guest data in localStorage
   * Checks all keys starting with 'guest_'
   */
  private hasGuestProgress(): boolean {
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('guest_')) {
          const value = localStorage.getItem(key);
          if (value && value !== '' && value !== '[]' && value !== '{}') {
            console.log(`[Auth] Found guest data in key: ${key}`);
            return true;
          }
        }
      }
      return false;
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
        
        // Track guest to auth conversion
        this.analyticsService.trackGuestToAuthConversion();
        
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
   * Clear all guest data from localStorage before login
   * Uses dynamic clearing to automatically handle any guest_* keys
   */
  private clearGuestData(): void {
    clearAllGuestData();
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
        if (error) {
          // Track auth error
          this.analyticsService.trackAuthError('google_oauth_failed');
          throw error;
        }
      })
    );
  }

  /**
   * Check if new user registration is allowed
   * Returns object with canRegister flag and current database size
   */
  canRegisterNewUser(userId: string): Observable<{ canRegister: boolean; currentSize: number }> {
    return this.databaseService.checkUserExists(userId).pipe(
      tap(exists => {
        if (exists) {
          console.log('[Auth] ✓ Existing user, allowing login');
        }
      }),
      // If user exists, allow them
      // If user doesn't exist, check database size
      switchMap(exists => {
        if (exists) {
          return of({ canRegister: true, currentSize: 0 });
        }
        
        return this.databaseService.getDatabaseSizeMB().pipe(
          map(sizeMB => {
            const canRegister = sizeMB < MAX_DATABASE_SIZE_MB;
            if (!canRegister) {
              console.log(`[Auth] ❌ Registration limit reached: ${sizeMB}MB/${MAX_DATABASE_SIZE_MB}MB`);
            } else {
              console.log(`[Auth] ✓ Registration allowed, current size: ${sizeMB}MB/${MAX_DATABASE_SIZE_MB}MB`);
            }
            return { canRegister, currentSize: sizeMB };
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

  private showAccountInactiveModal(): void {
    const modalRef = this.modalService.open(AccountInactiveModal);
    if (modalRef) {
      // Subscribe to close event
      modalRef.instance.close.subscribe(() => {
        this.modalService.close();
      });
    }
  }
}
