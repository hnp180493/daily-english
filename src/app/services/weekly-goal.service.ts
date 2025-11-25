import { Injectable, inject, effect } from '@angular/core';
import { DatabaseService } from './database/database.service';
import { ProgressService } from './progress.service';
import { WeeklyGoal } from '../models/weekly-goal.model';
import { getWeekStartLocalDate } from '../utils/date.utils';

/**
 * Service to automatically track and update weekly goals
 * Subscribes to progress updates and updates goal progress in background
 */
@Injectable({
  providedIn: 'root'
})
export class WeeklyGoalService {
  private databaseService = inject(DatabaseService);
  private progressService = inject(ProgressService);
  private isUpdating = false;
  private lastProgressTimestamp: Date | null = null;

  constructor() {
    console.log('[WeeklyGoalService] 🚀 Service initialized');
    console.log('[WeeklyGoalService] 🔧 Setting up effect...');
    
    // Subscribe to progress changes and auto-update weekly goal
    effect(() => {
      console.log('[WeeklyGoalService] 💥 EFFECT RUNNING!');
      const progress = this.progressService.getProgressSignal()();
      
      // Use lastActivityDate to detect ANY progress change (including retries)
      const currentTimestamp = progress?.lastActivityDate;
      
      console.log('[WeeklyGoalService] ⚡ Effect triggered:', {
        hasProgress: !!progress,
        currentTimestamp,
        lastTimestamp: this.lastProgressTimestamp,
        isUpdating: this.isUpdating
      });
      
      // Trigger update if lastActivityDate changed (means user completed an exercise)
      const timestampChanged = currentTimestamp && 
        (!this.lastProgressTimestamp || 
         new Date(currentTimestamp).getTime() !== new Date(this.lastProgressTimestamp).getTime());
      
      console.log('[WeeklyGoalService] 🔍 Checking for changes:', {
        timestampChanged,
        hasProgress: !!progress
      });
      
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
      } else {
        console.log('[WeeklyGoalService] ⏭️ Skipping update:', {
          reason: !progress ? 'no progress' : 
                  !timestampChanged ? 'no timestamp change' :
                  this.isUpdating ? 'already updating' :
                  'no changes detected'
        });
      }
    });
  }

  /**
   * Update weekly goal progress based on current exercise history
   */
  async updateWeeklyGoalProgress(): Promise<void> {
    if (this.isUpdating) {
      console.log('[WeeklyGoalService] ⚠️ Already updating, skipping...');
      return;
    }
    
    console.log('[WeeklyGoalService] 🔄 Starting update...');
    this.isUpdating = true;
    
    try {
      const weekStart = getWeekStartLocalDate();
      console.log('[WeeklyGoalService] updateWeeklyGoalProgress called, weekStart:', weekStart);
      
      const goal = await this.databaseService.loadWeeklyGoalByDateAuto(weekStart).toPromise();
      console.log('[WeeklyGoalService] Goal loaded:', goal);
      
      if (!goal) {
        console.log('[WeeklyGoalService] ⚠️ No goal set for this week, skipping update');
        this.isUpdating = false; // Reset flag before return
        return;
      }

      const progress = await this.progressService.getUserProgress().toPromise();
      const history = progress?.exerciseHistory || {};
      
      // Calculate week range
      const weekStartDate = new Date(goal.weekStartDate);
      weekStartDate.setHours(0, 0, 0, 0);
      const weekEndDate = new Date(weekStartDate);
      weekEndDate.setDate(weekEndDate.getDate() + 7);
      weekEndDate.setHours(23, 59, 59, 999);

      // Count exercises completed this week with score >= 60
      const allAttempts = Object.values(history);
      console.log('[WeeklyGoalService] All attempts:', allAttempts.length);
      console.log('[WeeklyGoalService] Week range:', {
        start: weekStartDate.toISOString(),
        end: weekEndDate.toISOString()
      });
      
      const completedThisWeek = allAttempts.filter((attempt: any) => {
        const date = new Date(attempt.timestamp);
        const inRange = date >= weekStartDate && date < weekEndDate;
        const passingScore = attempt.accuracyScore >= 60;
        console.log('[WeeklyGoalService] Checking attempt:', {
          exerciseId: attempt.exerciseId,
          timestamp: date.toISOString(),
          score: attempt.accuracyScore,
          inRange,
          passingScore
        });
        return inRange && passingScore;
      }).length;

      console.log('[WeeklyGoalService] 📊 Completed this week:', completedThisWeek);
      console.log('[WeeklyGoalService] 📊 Current goal.completedExercises:', goal.completedExercises);
      console.log('[WeeklyGoalService] 📊 Comparison:', {
        completedThisWeek,
        goalCompleted: goal.completedExercises,
        areEqual: completedThisWeek === goal.completedExercises,
        willUpdate: completedThisWeek !== goal.completedExercises
      });

      // Only update if count changed
      if (completedThisWeek === goal.completedExercises) {
        console.log('[WeeklyGoalService] ℹ️ Count unchanged, skipping database update');
        this.isUpdating = false; // Reset flag before return
        return;
      }
      
      console.log('[WeeklyGoalService] 🚀 Count changed! Updating from', goal.completedExercises, 'to', completedThisWeek);

      console.log('[WeeklyGoalService] Updating goal progress:', completedThisWeek, '/', goal.targetExercises);

      goal.completedExercises = completedThisWeek;
      
      // Check if goal is achieved
      if (completedThisWeek >= goal.targetExercises && !goal.isAchieved) {
        goal.isAchieved = true;
        goal.bonusPointsEarned = 500;
        console.log('[WeeklyGoalService] Goal achieved! Adding bonus points');
        this.progressService.addBonusPoints(500);
      }

      // Save updated goal
      await this.databaseService.saveWeeklyGoalAuto(goal).toPromise();
      console.log('[WeeklyGoalService] ✅ Goal updated successfully');
    } catch (error) {
      console.error('[WeeklyGoalService] ❌ Error updating weekly goal:', error);
    } finally {
      console.log('[WeeklyGoalService] 🏁 Resetting isUpdating flag');
      this.isUpdating = false;
    }
  }
}
