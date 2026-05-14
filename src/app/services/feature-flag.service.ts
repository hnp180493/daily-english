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
   * Memory Boost is public (open to all users) — the BETA label in UI stays as a quality marker.
   */
  isMemoryBoostEnabled = computed(() => {
    return true;
  });

  /**
   * Flashcards are public (open to all users) — the BETA label in UI is quality, not access.
   */
  isFlashcardDeckEnabled = computed(() => {
    return true;
  });

  /**
   * Check if Pronunciation Practice is enabled.
   * Open to all users — the BETA label in UI is for feature quality, not access gating.
   */
  isPronunciationPracticeEnabled = computed(() => {
    return true;
  });

  /** Phase 2 features. Grammar opened to all 2026-05-14 (BETA label kept as quality marker). */
  isGrammarLessonsEnabled = computed(() => true);
  isReadingEnabled = computed(() => this.isBetaTester());
  isWritingEnabled = computed(() => this.isBetaTester());
  isListeningEnabled = computed(() => this.isBetaTester());
}
