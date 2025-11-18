import { Injectable, inject } from '@angular/core';
import { Observable, of, throwError, timer } from 'rxjs';
import { map, switchMap, retry, catchError } from 'rxjs/operators';
import { StorageAdapter, UserStats } from './storage-adapter.interface';
import { UserProgress, ExerciseAttempt } from '../../models/exercise.model';
import { DictationPracticeAttempt } from '../../models/dictation.model';
import { DatabaseService } from '../database/database.service';
import { ToastService } from '../toast.service';

/**
 * Supabase implementation of StorageAdapter for authenticated users
 * Wraps existing DatabaseService to provide unified storage interface
 */
@Injectable({
  providedIn: 'root'
})
export class SupabaseStorageProvider implements StorageAdapter {
  private databaseService = inject(DatabaseService);
  private toastService = inject(ToastService);
  private readonly MAX_RETRIES = 2;
  private readonly RETRY_DELAY = 1000; // 1 second

  saveProgress(progress: UserProgress): Observable<void> {
    console.log('[SupabaseStorage] Saving progress');
    return this.databaseService.saveProgressAuto(progress).pipe(
      retry({
        count: this.MAX_RETRIES,
        delay: (error, retryCount) => {
          console.log(`[SupabaseStorage] Retry attempt ${retryCount} after error:`, error);
          return timer(this.RETRY_DELAY * retryCount);
        }
      }),
      catchError(error => {
        console.error('[SupabaseStorage] Failed to save progress after retries:', error);
        this.toastService.error(
          'Failed to sync progress to cloud. Will retry automatically.',
          5000
        );
        return throwError(() => error);
      })
    );
  }

  loadProgress(): Observable<UserProgress | null> {
    console.log('[SupabaseStorage] Loading progress');
    return this.databaseService.loadProgressAuto().pipe(
      retry({
        count: this.MAX_RETRIES,
        delay: (error, retryCount) => {
          console.log(`[SupabaseStorage] Retry attempt ${retryCount} after error:`, error);
          return timer(this.RETRY_DELAY * retryCount);
        }
      }),
      catchError(error => {
        console.error('[SupabaseStorage] Failed to load progress after retries:', error);
        this.toastService.error(
          'Failed to load progress from cloud. Please check your connection.',
          5000
        );
        return of(null);
      })
    );
  }

  saveExerciseAttempt(attempt: ExerciseAttempt): Observable<void> {
    return this.loadProgress().pipe(
      switchMap(progress => {
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
        
        return this.saveProgress(updated);
      })
    );
  }

  getExerciseHistory(): Observable<{ [exerciseId: string]: ExerciseAttempt }> {
    return this.loadProgress().pipe(
      map(progress => progress?.exerciseHistory || {})
    );
  }

  saveDictationAttempt(attempt: DictationPracticeAttempt): Observable<void> {
    return this.loadProgress().pipe(
      switchMap(progress => {
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
        
        return this.saveProgress(updated);
      })
    );
  }

  getDictationHistory(): Observable<{ [exerciseId: string]: DictationPracticeAttempt }> {
    return this.loadProgress().pipe(
      map(progress => progress?.dictationHistory || {})
    );
  }

  getStats(): Observable<UserStats> {
    return this.loadProgress().pipe(
      map(progress => {
        if (!progress) {
          return this.getDefaultStats();
        }
        
        return {
          totalPoints: progress.totalPoints,
          totalCredits: progress.totalCredits,
          currentStreak: progress.currentStreak,
          longestStreak: progress.longestStreak,
          lastStreakDate: progress.lastStreakDate,
          lastActivityDate: progress.lastActivityDate,
          achievements: progress.achievements
        };
      })
    );
  }

  updateStats(stats: Partial<UserStats>): Observable<void> {
    return this.loadProgress().pipe(
      switchMap(progress => {
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
        
        return this.saveProgress(updated);
      })
    );
  }

  clearAll(): Observable<void> {
    // Supabase data persists - not implemented for authenticated users
    console.log('[SupabaseStorage] clearAll() not implemented - data persists in cloud');
    return of(undefined);
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
