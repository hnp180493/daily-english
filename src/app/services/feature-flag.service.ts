import { Injectable, inject, computed } from '@angular/core';
import { AuthService } from './auth.service';

/**
 * Feature Flag Service
 * Controls access to beta/experimental features based on user email.
 */
@Injectable({
  providedIn: 'root'
})
export class FeatureFlagService {
  private authService = inject(AuthService);

  // List of beta tester emails who can access new features
  private readonly BETA_TESTERS = [
    'phuochnsw@gmail.com'
  ];

  /**
   * Check if current user is a beta tester.
   */
  isBetaTester = computed(() => {
    const email = this.authService.getEmail();
    if (!email) return false;
    return this.BETA_TESTERS.includes(email.toLowerCase());
  });

  /**
   * Check if Memory Boost feature is enabled for current user.
   */
  isMemoryBoostEnabled = computed(() => {
    return this.isBetaTester();
  });

  /**
   * Check if Flashcard Deck page is enabled for current user.
   */
  isFlashcardDeckEnabled = computed(() => {
    return this.isBetaTester();
  });
}
