import { Injectable, inject } from '@angular/core';
import { Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { StreakData, StreakHistoryEntry } from '../models/daily-challenge.model';
import { ProgressService } from './progress.service';
import { DatabaseService } from './database/database.service';
import { AuthService } from './auth.service';
import { toLocalDateString } from '../utils/date.utils';

@Injectable({
  providedIn: 'root',
})
export class StreakService {
  private progressService = inject(ProgressService);
  private db = inject(DatabaseService);
  private auth = inject(AuthService);

  // Streak tracking methods
  getCurrentStreak(): Observable<number> {
    return this.progressService.getUserProgress().pipe(
      map((progress) => progress?.currentStreak || 0)
    );
  }

  getLongestStreak(): Observable<number> {
    return this.progressService.getUserProgress().pipe(
      map((progress) => {
        if (!progress) return 0;
        
        // Return stored longest streak, or current streak if it's higher
        const longestStreak = progress.longestStreak || 0;
        const currentStreak = progress.currentStreak || 0;
        
        return Math.max(longestStreak, currentStreak);
      })
    );
  }

  updateStreak(completed: boolean): Observable<void> {
    // This is a wrapper around ProgressService's existing streak tracking
    // The actual streak update happens in ProgressService.recordAttempt()
    return of(undefined);
  }

  getStreakHistory(days: number = 30): Observable<StreakHistoryEntry[]> {
    return this.progressService.getUserProgress().pipe(
      map((progress) => {
        const history = Object.values(progress.exerciseHistory);
        const today = new Date();
        const streakHistory: StreakHistoryEntry[] = [];

        // Generate history for the last N days
        for (let i = 0; i < days; i++) {
          const date = new Date(today);
          date.setDate(date.getDate() - i);
          const dateStr = toLocalDateString(date);

          // Check if there's an exercise completed on this date
          const hasActivity = history.some((h) => {
            const attemptDate = toLocalDateString(new Date(h.timestamp));
            return attemptDate === dateStr;
          });

          streakHistory.push({
            date: dateStr,
            maintained: hasActivity,
          });
        }

        return streakHistory.reverse();
      })
    );
  }

  // Multiplier methods
  getStreakMultiplier(): number {
    const progress = this.progressService.getProgressSignal()();
    const streak = progress.currentStreak || 0;
    return streak >= 7 ? 1.5 : 1.0;
  }

  applyStreakBonus(basePoints: number): number {
    const multiplier = this.getStreakMultiplier();
    return Math.round(basePoints * multiplier);
  }

  // Notification methods (to be called by NotificationService)
  sendStreakReminder(): void {
    // This will be implemented by NotificationService
    console.log('Streak reminder should be sent');
  }

  sendStreakAchievement(days: number): void {
    // This will be implemented by NotificationService
    console.log(`Streak achievement: ${days} days`);
  }

  // Helper method to check if streak is at risk
  isStreakAtRisk(): Observable<boolean> {
    return this.progressService.getUserProgress().pipe(
      map((progress) => {
        if (!progress || progress.currentStreak === 0) {
          return false;
        }

        const lastActivity = new Date(progress.lastActivityDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        lastActivity.setHours(0, 0, 0, 0);

        const daysDiff = Math.floor(
          (today.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24)
        );

        // Streak is at risk if last activity was yesterday and today's challenge not completed
        return daysDiff === 1;
      })
    );
  }

  // Get streak milestone (5, 7, 14, 30, etc.)
  getStreakMilestone(streak: number): number | null {
    const milestones = [5, 7, 14, 30, 60, 90, 180, 365];
    if (milestones.includes(streak)) {
      return streak;
    }
    return null;
  }
}
