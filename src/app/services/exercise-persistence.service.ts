import { Injectable, inject } from '@angular/core';
import { AuthService } from './auth.service';
import { ExerciseState } from './exercise-state.service';

/**
 * ExercisePersistenceService
 * 
 * IMPORTANT: This service uses localStorage for temporary in-progress exercise state ONLY.
 * 
 * Purpose:
 * - Saves the current state of an exercise while the user is actively working on it
 * - Allows users to reload the page without losing their current work
 * - Data is cleared immediately after exercise completion
 * 
 * Why localStorage is retained here:
 * - This is temporary, session-specific data that doesn't need server persistence
 * - Provides instant save/restore without network latency
 * - Reduces server load by not persisting every keystroke
 * - Data is ephemeral and cleared after exercise completion
 * 
 * Data lifecycle:
 * 1. User starts exercise → No data saved yet
 * 2. User types translation → State saved to localStorage
 * 3. User reloads page → State restored from localStorage
 * 4. User completes exercise → State cleared from localStorage
 * 5. Final results saved to Firestore via ProgressService
 * 
 * This is the ONLY service that should use localStorage for user data.
 * All persistent user data (progress, achievements, favorites, rewards) is stored in Firestore.
 */
@Injectable({
  providedIn: 'root'
})
export class ExercisePersistenceService {
  private authService = inject(AuthService);

  private getProgressKey(exerciseId: string): string {
    const userId = this.authService.getUserId();
    // Use 'guest' prefix for unauthenticated users
    const userPrefix = userId || 'guest';
    return `exercise_progress_${userPrefix}_${exerciseId}`;
  }

  /**
   * Saves the current in-progress exercise state to localStorage
   * This is temporary data that will be cleared after exercise completion
   */
  saveProgress(exerciseId: string, state: ExerciseState): void {
    const key = this.getProgressKey(exerciseId);
    try {
      localStorage.setItem(key, JSON.stringify(state));
      console.log('[ExercisePersistenceService] Progress saved for', key);
    } catch (error) {
      console.error('[ExercisePersistenceService] Failed to save progress:', error);
    }
  }

  /**
   * Loads the in-progress exercise state from localStorage
   * Returns null if no saved state exists
   */
  loadProgress(exerciseId: string): ExerciseState | null {
    const key = this.getProgressKey(exerciseId);
    const stored = localStorage.getItem(key);
    
    if (!stored) {
      console.log('[ExercisePersistenceService] No saved progress found for', key);
      return null;
    }

    try {
      const state = JSON.parse(stored);
      console.log('[ExercisePersistenceService] Progress loaded successfully from', key);
      return state;
    } catch (error) {
      console.error('[ExercisePersistenceService] Failed to load in-progress state:', error);
      return null;
    }
  }

  /**
   * Clears the in-progress exercise state from localStorage
   * Called after exercise completion to clean up temporary data
   */
  clearProgress(exerciseId: string): void {
    const key = this.getProgressKey(exerciseId);
    localStorage.removeItem(key);
    console.log('[ExercisePersistenceService] Cleared in-progress state for', key);
  }
}
