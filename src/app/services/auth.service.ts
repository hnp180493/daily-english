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

  constructor() {
    this.initPromise = this.initializeAuth();
  }

  private async initializeAuth(): Promise<void> {
    console.log('[Auth] 🚀 Initializing auth service...');
    console.log('[Auth] Current URL:', window.location.href);
    console.log('[Auth] Has hash fragment:', window.location.hash ? 'YES' : 'NO');
    
    // Subscribe to auth changes FIRST (before getSession)
    // This ensures we catch the SIGNED_IN event from URL hash processing
    this.supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('[Auth] 🔔 Auth state changed:', event);
      console.log('[Auth] Session user:', session?.user?.id);
      console.log('[Auth] Session expires at:', session?.expires_at);
      
      this.updateUserState(session?.user || null);
      
      // Save user profile on successful login
      if (event === 'SIGNED_IN' && session?.user) {
        console.log('[Auth] ✅ User signed in, saving profile...');
        // Small delay to ensure auth context is fully set
        await new Promise(resolve => setTimeout(resolve, 100));
        this.saveUserProfile(session.user);
      }
      
      // Mark as initialized after first auth event
      if (!this.authInitialized()) {
        console.log('[Auth] ✓ Auth initialized via state change');
        this.authInitialized.set(true);
      }
    });

    // Now get initial session (this will trigger onAuthStateChange if URL has tokens)
    console.log('[Auth] 📡 Getting initial session...');
    const { data: { session }, error } = await this.supabase.auth.getSession();
    
    if (error) {
      console.error('[Auth] ❌ Error getting session:', error);
    }
    
    // Only update state if we got a session (otherwise wait for onAuthStateChange)
    if (session?.user) {
      console.log('[Auth] ✓ Found existing session for user:', session.user.id);
      this.updateUserState(session.user);
    } else {
      console.log('[Auth] ℹ️ No existing session found');
    }
    
    // Mark as initialized if no session (user not logged in)
    if (!session) {
      console.log('[Auth] ✓ Auth initialized (no session)');
      this.authInitialized.set(true);
    }
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
      console.log('[Auth] User authenticated:', user.uid);
    } else {
      this.currentUser.set(null);
      this.isAuthenticated.set(false);
      console.log('[Auth] User signed out');
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

    console.log('[Auth] Saving user profile:', { userId, profile });
    
    this.databaseService.saveUserProfile(userId, profile).subscribe({
      next: () => console.log('[Auth] User profile saved successfully'),
      error: (error) => {
        console.error('[Auth] Failed to save user profile:', error);
        console.error('[Auth] Error details:', JSON.stringify(error, null, 2));
      }
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
