import { Injectable, Injector, inject, effect } from '@angular/core';
import { CurriculumService } from './curriculum.service';
import { ProgressService } from './progress.service';
import { AuthService } from './auth.service';

/**
 * Service to automatically track and update weekly goals
 * Subscribes to progress updates and updates goal progress in background
 */
@Injectable({
  providedIn: 'root'
})
export class WeeklyGoalService {
  private curriculum = inject(CurriculumService);
  private progressService = inject(ProgressService);
  private authService = inject(AuthService);
  private injector = inject(Injector);
  private isUpdating = false;
  private lastProgressTimestamp: Date | null = null;
  private isInitialized = false;

  constructor() {
    console.log('[WeeklyGoalService] 🚀 Service initialized');
    
    // Wait for auth to be stable before setting up effect
    this.initAfterAuth();
  }

  private async initAfterAuth(): Promise<void> {
    await this.authService.waitForAuth();
    this.isInitialized = true;
    console.log('[WeeklyGoalService] 🔧 Auth stable, setting up effect...');
    
    // Subscribe to progress changes and auto-update weekly goal
    effect(() => {
      if (!this.isInitialized) return;
      
      const progress = this.progressService.getProgressSignal()();
      
      // Use lastActivityDate to detect ANY progress change (including retries)
      const currentTimestamp = progress?.lastActivityDate;
      
      // Trigger update if lastActivityDate changed (means user completed an exercise)
      const timestampChanged = currentTimestamp && 
        (!this.lastProgressTimestamp || 
         new Date(currentTimestamp).getTime() !== new Date(this.lastProgressTimestamp).getTime());
      
      if (progress && timestampChanged && !this.isUpdating) {
        console.log('[WeeklyGoalService] ✅ Progress detected, triggering update');
        
        // Update timestamp BEFORE calling update to prevent duplicate triggers
        this.lastProgressTimestamp = currentTimestamp;
        
        // Call update and handle completion
        this.updateWeeklyGoalProgress()
          .then(() => {
            console.log('[WeeklyGoalService] 🎉 Update completed successfully');
          })
          .catch(error => {
            console.error('[WeeklyGoalService] ❌ Failed to update weekly goal:', error);
            // Reset timestamp on error to allow retry
            this.lastProgressTimestamp = null;
          });
      }
    }, { injector: this.injector }); // past an await: pass the injection context explicitly
  }

  /**
   * Recount this week's goal. Delegates to CurriculumService, the single place
   * that awards the weekly bonus (and serializes concurrent recounts).
   */
  async updateWeeklyGoalProgress(): Promise<void> {
    if (this.isUpdating) {
      console.log('[WeeklyGoalService] Already updating, skipping...');
      return;
    }
    this.isUpdating = true;
    try {
      await this.curriculum.recalculateWeeklyGoal();
    } finally {
      this.isUpdating = false;
    }
  }
}
