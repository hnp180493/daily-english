import { Injectable, inject } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { StorageAdapter, UserStats } from './storage-adapter.interface';
import { UserProgress, ExerciseAttempt } from '../../models/exercise.model';
import { DictationPracticeAttempt } from '../../models/dictation.model';
import { ToastService } from '../toast.service';
import { GuestAnalyticsService } from '../guest-analytics.service';

/**
 * LocalStorage implementation of StorageAdapter for guest users
 * Stores all progress data in browser localStorage with validation and error handling
 */
@Injectable({
  providedIn: 'root'
})
export class LocalStorageProvider implements StorageAdapter {
  private readonly STORAGE_KEY = 'guest_progress';
  private readonly MAX_STORAGE_SIZE = 5 * 1024 * 1024; // 5MB limit
  private toastService = inject(ToastService);
  private guestAnalytics = inject(GuestAnalyticsService);

  saveProgress(progress: UserProgress): Observable<void> {
    try {
      const data = JSON.stringify(progress);
      
      // Check storage size limit
      if (data.length > this.MAX_STORAGE_SIZE) {
        console.error('[LocalStorage] Storage quota exceeded');
        this.toastService.error(
          'Storage limit reached. Please login to continue saving progress.',
          7000
        );
        return throwError(() => new Error('Storage quota exceeded'));
      }
      
      localStorage.setItem(this.STORAGE_KEY, data);
      console.log('[LocalStorage] Progress saved successfully');
      return of(undefined);
    } catch (error: any) {
      console.error('[LocalStorage] Failed to save progress:', error);
      
      // Handle QuotaExceededError specifically
      if (error.name === 'QuotaExceededError') {
        this.toastService.error(
          'Storage limit reached. Please login to save your progress in the cloud.',
          7000
        );
      } else {
        this.toastService.error(
          'Failed to save progress. Please try again.',
          5000
        );
      }
      
      return throwError(() => error);
    }
  }

  loadProgress(): Observable<UserProgress | null> {
    try {
      const data = localStorage.getItem(this.STORAGE_KEY);
      if (!data) {
        console.log('[LocalStorage] No progress data found');
        return of(null);
      }
      
      const progress = JSON.parse(data);
      const validated = this.validateProgress(progress);
      console.log('[LocalStorage] Progress loaded successfully');
      return of(validated);
    } catch (error) {
      console.error('[LocalStorage] Corrupted data detected, resetting:', error);
      this.toastService.warning(
        'Your progress data was corrupted and has been reset. Please login to prevent data loss.',
        7000
      );
      this.clearAll().subscribe();
      return of(null);
    }
  }

  saveExerciseAttempt(attempt: ExerciseAttempt): Observable<void> {
    return new Observable(observer => {
      this.loadProgress().subscribe({
        next: (progress) => {
          const current = progress || this.getDefaultProgress();
          
          // Update exercise history
          const updatedHistory = {
            ...current.exerciseHistory,
            [attempt.exerciseId]: attempt
          };
          
          const updated: UserProgress = {
            ...current,
            exerciseHistory: updatedHistory
          };
          
          this.saveProgress(updated).subscribe({
            next: () => {
              observer.next();
              observer.complete();
            },
            error: (error) => observer.error(error)
          });
        },
        error: (error) => observer.error(error)
      });
    });
  }

  getExerciseHistory(): Observable<{ [exerciseId: string]: ExerciseAttempt }> {
    return new Observable(observer => {
      this.loadProgress().subscribe({
        next: (progress) => {
          observer.next(progress?.exerciseHistory || {});
          observer.complete();
        },
        error: (error) => observer.error(error)
      });
    });
  }

  saveDictationAttempt(attempt: DictationPracticeAttempt): Observable<void> {
    return new Observable(observer => {
      this.loadProgress().subscribe({
        next: (progress) => {
          const current = progress || this.getDefaultProgress();
          
          // Update dictation history
          const updatedHistory = {
            ...current.dictationHistory,
            [attempt.exerciseId]: attempt
          };
          
          const updated: UserProgress = {
            ...current,
            dictationHistory: updatedHistory
          };
          
          this.saveProgress(updated).subscribe({
            next: () => {
              observer.next();
              observer.complete();
            },
            error: (error) => observer.error(error)
          });
        },
        error: (error) => observer.error(error)
      });
    });
  }

  getDictationHistory(): Observable<{ [exerciseId: string]: DictationPracticeAttempt }> {
    return new Observable(observer => {
      this.loadProgress().subscribe({
        next: (progress) => {
          observer.next(progress?.dictationHistory || {});
          observer.complete();
        },
        error: (error) => observer.error(error)
      });
    });
  }

  getStats(): Observable<UserStats> {
    return new Observable(observer => {
      this.loadProgress().subscribe({
        next: (progress) => {
          if (!progress) {
            observer.next(this.getDefaultStats());
            observer.complete();
            return;
          }
          
          const stats: UserStats = {
            totalPoints: progress.totalPoints,
            totalCredits: progress.totalCredits,
            currentStreak: progress.currentStreak,
            longestStreak: progress.longestStreak,
            lastStreakDate: progress.lastStreakDate,
            lastActivityDate: progress.lastActivityDate,
            achievements: progress.achievements
          };
          
          observer.next(stats);
          observer.complete();
        },
        error: (error) => observer.error(error)
      });
    });
  }

  updateStats(stats: Partial<UserStats>): Observable<void> {
    return new Observable(observer => {
      this.loadProgress().subscribe({
        next: (progress) => {
          const current = progress || this.getDefaultProgress();
          
          const updated: UserProgress = {
            ...current,
            totalPoints: stats.totalPoints ?? current.totalPoints,
            totalCredits: stats.totalCredits ?? current.totalCredits,
            currentStreak: stats.currentStreak ?? current.currentStreak,
            longestStreak: stats.longestStreak ?? current.longestStreak,
            lastStreakDate: stats.lastStreakDate ?? current.lastStreakDate,
            lastActivityDate: stats.lastActivityDate ?? current.lastActivityDate,
            achievements: stats.achievements ?? current.achievements
          };
          
          this.saveProgress(updated).subscribe({
            next: () => {
              observer.next();
              observer.complete();
            },
            error: (error) => observer.error(error)
          });
        },
        error: (error) => observer.error(error)
      });
    });
  }

  clearAll(): Observable<void> {
    try {
      localStorage.removeItem(this.STORAGE_KEY);
      // Also clear guest analytics data
      this.guestAnalytics.clearAnalytics();
      console.log('[LocalStorage] All data cleared including analytics');
      return of(undefined);
    } catch (error) {
      console.error('[LocalStorage] Failed to clear data:', error);
      return throwError(() => error);
    }
  }

  /**
   * Validate and sanitize progress data structure
   */
  private validateProgress(progress: any): UserProgress {
    // Ensure all required fields exist with proper types
    return {
      exerciseHistory: this.validateObject(progress.exerciseHistory),
      dictationHistory: this.validateObject(progress.dictationHistory),
      totalCredits: this.validateNumber(progress.totalCredits),
      totalPoints: this.validateNumber(progress.totalPoints),
      lastActivityDate: this.validateDate(progress.lastActivityDate),
      currentStreak: this.validateNumber(progress.currentStreak),
      longestStreak: this.validateNumber(progress.longestStreak),
      lastStreakDate: this.validateString(progress.lastStreakDate),
      achievements: this.validateArray(progress.achievements)
    };
  }

  private validateObject(value: any): any {
    return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  }

  private validateNumber(value: any): number {
    const num = Number(value);
    return isNaN(num) ? 0 : num;
  }

  private validateString(value: any): string {
    return typeof value === 'string' ? value : '';
  }

  private validateDate(value: any): Date {
    if (value instanceof Date && !isNaN(value.getTime())) {
      return value;
    }
    if (typeof value === 'string' || typeof value === 'number') {
      const date = new Date(value);
      if (!isNaN(date.getTime())) {
        return date;
      }
    }
    return new Date();
  }

  private validateArray(value: any): any[] {
    return Array.isArray(value) ? value : [];
  }

  private getDefaultProgress(): UserProgress {
    return {
      exerciseHistory: {},
      dictationHistory: {},
      totalCredits: 0,
      totalPoints: 0,
      lastActivityDate: new Date(),
      currentStreak: 0,
      longestStreak: 0,
      lastStreakDate: '',
      achievements: []
    };
  }

  private getDefaultStats(): UserStats {
    return {
      totalPoints: 0,
      totalCredits: 0,
      currentStreak: 0,
      longestStreak: 0,
      lastStreakDate: '',
      lastActivityDate: new Date(),
      achievements: []
    };
  }
}
