import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = async () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Wait for auth to initialize
  await authService.waitForAuth();

  // Check if user is authenticated
  if (authService.isAuthenticated()) {
    return true;
  }
  
  // Not authenticated, redirect to login
  router.navigate(['/login']);
  return false;
};
