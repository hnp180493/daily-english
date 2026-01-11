import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { FeatureFlagService } from '../services/feature-flag.service';
import { AuthService } from '../services/auth.service';

/**
 * Guard to protect beta features.
 * Only allows access if user is a beta tester.
 */
export const betaFeatureGuard: CanActivateFn = async () => {
  const featureFlagService = inject(FeatureFlagService);
  const authService = inject(AuthService);
  const router = inject(Router);

  // Wait for auth to be ready
  await authService.waitForAuth();

  if (featureFlagService.isBetaTester()) {
    return true;
  }

  // Redirect non-beta users to home
  return router.createUrlTree(['/']);
};
