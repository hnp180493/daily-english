import { Injectable, inject, signal } from '@angular/core';
import { from, Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { supabaseClient } from './supabase.client';
import { DatabaseService } from './database/database.service';
import type { User as SupabaseUser } from '@supabase/supabase-js';

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

    console.log('[Auth] 🚀 Initializing auth service...');
    
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
  }

  signInAnonymously(): Observable<void> {
    // Supabase doesn't support anonymous auth
    // Return error or implement alternative
    throw new Error('Anonymous authentication is not supported with Supabase');
  }

  signInWithGoogle(): Observable<void> {
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
}
