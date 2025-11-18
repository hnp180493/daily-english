import { Injectable, inject, computed } from '@angular/core';
import { StorageAdapter } from './storage-adapter.interface';
import { LocalStorageProvider } from './local-storage-provider.service';
import { SupabaseStorageProvider } from './supabase-storage-provider.service';
import { AuthService } from '../auth.service';

/**
 * Factory service that selects the appropriate storage adapter
 * based on authentication state
 * 
 * - Guest users: LocalStorageProvider
 * - Authenticated users: SupabaseStorageProvider
 */
@Injectable({
  providedIn: 'root'
})
export class StorageAdapterFactory {
  private authService = inject(AuthService);
  private localStorageProvider = inject(LocalStorageProvider);
  private supabaseProvider = inject(SupabaseStorageProvider);

  /**
   * Get the current storage adapter based on authentication state
   */
  getAdapter(): StorageAdapter {
    const isAuthenticated = this.authService.isAuthenticated();
    const adapter = isAuthenticated ? this.supabaseProvider : this.localStorageProvider;
    
    console.log(`[StorageFactory] Using ${isAuthenticated ? 'Supabase' : 'LocalStorage'} adapter`);
    return adapter;
  }

  /**
   * Computed signal that returns the current adapter based on auth state
   * Useful for reactive components
   */
  getAdapterSignal() {
    return computed(() => {
      const user = this.authService.currentUser();
      const adapter = user ? this.supabaseProvider : this.localStorageProvider;
      console.log(`[StorageFactory] Adapter signal: ${user ? 'Supabase' : 'LocalStorage'}`);
      return adapter;
    });
  }

  /**
   * Check if currently using localStorage (guest mode)
   */
  isUsingLocalStorage(): boolean {
    return !this.authService.isAuthenticated();
  }

  /**
   * Check if currently using Supabase (authenticated mode)
   */
  isUsingSupabase(): boolean {
    return this.authService.isAuthenticated();
  }
}
