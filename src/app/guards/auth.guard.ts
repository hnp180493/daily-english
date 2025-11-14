import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = async () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // console.log('[AuthGuard] Checking authentication...');
  // console.log('[AuthGuard] Current URL:', window.location.href);
  // console.log('[AuthGuard] Has hash:', window.location.hash ? 'YES' : 'NO');

  // Wait for auth to initialize
  await authService.waitForAuth();

  // If URL has hash fragment (OAuth callback), give Supabase extra time to process
  if (window.location.hash.includes('access_token')) {
    // console.log('[AuthGuard] Detected OAuth callback, waiting for token processing...');
    // Wait up to 3 seconds for auth state to update
    for (let i = 0; i < 30; i++) {
      await new Promise(resolve => setTimeout(resolve, 100));
      if (authService.isAuthenticated()) {
        // console.log('[AuthGuard] ✅ Authentication successful after', (i + 1) * 100, 'ms');
        return true;
      }
    }
    // console.log('[AuthGuard] ⚠️ Timeout waiting for authentication');
  }

  // Check if user is authenticated
  if (authService.isAuthenticated()) {
    // console.log('[AuthGuard] ✅ User is authenticated');
    return true;
  }
  
  // console.log('[AuthGuard] ❌ User not authenticated, redirecting to login');
  // Not authenticated, redirect to login
  router.navigate(['/login']);
  return false;
};
