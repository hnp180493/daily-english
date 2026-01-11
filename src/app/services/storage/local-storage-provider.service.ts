import { Injectable, inject } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { StorageAdapter, UserStats } from './storage-adapter.interface';
import { UserProgress, ExerciseAttempt } from '../../models/exercise.model';
import { DictationPracticeAttempt } from '../../models/dictation.model';
import { MemoryData, Flashcard, QuizResult } from '../../models/memory-retention.model';
import { ToastService } from '../toast.service';
import { GuestAnalyticsService } from '../guest-analytics.service';
import { GUEST_PROGRESS_KEY } from '../../constants/storage-keys';

/**
 * LocalStorage implementation of StorageAdapter for guest users
 * Stores all progress data in browser localStorage with validation and error handling
 */
@Injectable({
  providedIn: 'root'
})
export class LocalStorageProvider implements StorageAdapter {
  private readonly STORAGE_KEY = GUEST_PROGRESS_KEY;
  private readonly MEMORY_DATA_KEY = 'memory_retention_data';
  private readonly FLASHCARDS_KEY = 'flashcards';
  private readonly QUIZ_RESULTS_KEY = 'quiz_results';
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
      localStorage.removeItem(this.MEMORY_DATA_KEY);
      localStorage.removeItem(this.FLASHCARDS_KEY);
      localStorage.removeItem(this.QUIZ_RESULTS_KEY);
      // Also clear guest analytics data
      this.guestAnalytics.clearAnalytics();
      console.log('[LocalStorage] All data cleared including analytics');
      return of(undefined);
    } catch (error) {
      console.error('[LocalStorage] Failed to clear data:', error);
      return throwError(() => error);
    }
  }

  // ============================================================================
  // Memory Retention Operations (Requirements: 6.3)
  // ============================================================================

  saveMemoryData(exerciseId: string, data: MemoryData): Observable<void> {
    try {
      const existing = this.loadMemoryDataSync();
      existing[exerciseId] = data;
      localStorage.setItem(this.MEMORY_DATA_KEY, JSON.stringify(existing));
      console.log('[LocalStorage] Memory data saved for exercise:', exerciseId);
      return of(undefined);
    } catch (error) {
      console.error('[LocalStorage] Failed to save memory data:', error);
      return throwError(() => error);
    }
  }

  loadMemoryData(exerciseId: string): Observable<MemoryData | null> {
    try {
      const all = this.loadMemoryDataSync();
      const data = all[exerciseId] || null;
      if (data) {
        return of(this.parseMemoryData(data));
      }
      return of(null);
    } catch (error) {
      console.error('[LocalStorage] Failed to load memory data:', error);
      return of(null);
    }
  }

  loadAllMemoryData(): Observable<{ [exerciseId: string]: MemoryData }> {
    try {
      const all = this.loadMemoryDataSync();
      const parsed: { [exerciseId: string]: MemoryData } = {};
      for (const [key, value] of Object.entries(all)) {
        parsed[key] = this.parseMemoryData(value as MemoryData);
      }
      return of(parsed);
    } catch (error) {
      console.error('[LocalStorage] Failed to load all memory data:', error);
      return of({});
    }
  }

  private loadMemoryDataSync(): { [exerciseId: string]: MemoryData } {
    const data = localStorage.getItem(this.MEMORY_DATA_KEY);
    return data ? JSON.parse(data) : {};
  }

  private parseMemoryData(data: MemoryData): MemoryData {
    return {
      ...data,
      generatedAt: new Date(data.generatedAt),
      quiz: data.quiz ? {
        ...data.quiz,
        result: data.quiz.result ? {
          ...data.quiz.result,
          completedAt: new Date(data.quiz.result.completedAt)
        } : undefined
      } : undefined,
      summary: data.summary ? {
        ...data.summary,
        generatedAt: new Date(data.summary.generatedAt)
      } : undefined,
      flashcards: data.flashcards?.map(fc => ({
        ...fc,
        createdAt: new Date(fc.createdAt),
        nextReviewDate: new Date(fc.nextReviewDate),
        lastReviewDate: fc.lastReviewDate ? new Date(fc.lastReviewDate) : undefined
      }))
    };
  }

  // ============================================================================
  // Flashcard Operations (Requirements: 3.7)
  // ============================================================================

  saveFlashcards(flashcards: Flashcard[]): Observable<void> {
    try {
      localStorage.setItem(this.FLASHCARDS_KEY, JSON.stringify(flashcards));
      console.log('[LocalStorage] Flashcards saved:', flashcards.length);
      return of(undefined);
    } catch (error) {
      console.error('[LocalStorage] Failed to save flashcards:', error);
      return throwError(() => error);
    }
  }

  loadFlashcards(): Observable<Flashcard[]> {
    try {
      const data = localStorage.getItem(this.FLASHCARDS_KEY);
      if (!data) return of([]);
      
      const flashcards = JSON.parse(data) as Flashcard[];
      // Parse dates
      const parsed = flashcards.map(fc => ({
        ...fc,
        createdAt: new Date(fc.createdAt),
        nextReviewDate: new Date(fc.nextReviewDate),
        lastReviewDate: fc.lastReviewDate ? new Date(fc.lastReviewDate) : undefined
      }));
      return of(parsed);
    } catch (error) {
      console.error('[LocalStorage] Failed to load flashcards:', error);
      return of([]);
    }
  }

  // ============================================================================
  // Quiz Results Operations (Requirements: 6.1)
  // ============================================================================

  saveQuizResult(exerciseId: string, result: QuizResult): Observable<void> {
    try {
      const existing = this.loadQuizResultsSync();
      existing[exerciseId] = result;
      localStorage.setItem(this.QUIZ_RESULTS_KEY, JSON.stringify(existing));
      console.log('[LocalStorage] Quiz result saved for exercise:', exerciseId);
      return of(undefined);
    } catch (error) {
      console.error('[LocalStorage] Failed to save quiz result:', error);
      return throwError(() => error);
    }
  }

  loadQuizResult(exerciseId: string): Observable<QuizResult | null> {
    try {
      const all = this.loadQuizResultsSync();
      const result = all[exerciseId];
      if (result) {
        return of({
          ...result,
          completedAt: new Date(result.completedAt)
        });
      }
      return of(null);
    } catch (error) {
      console.error('[LocalStorage] Failed to load quiz result:', error);
      return of(null);
    }
  }

  private loadQuizResultsSync(): { [exerciseId: string]: QuizResult } {
    const data = localStorage.getItem(this.QUIZ_RESULTS_KEY);
    return data ? JSON.parse(data) : {};
  }

  /**
   * Validate and sanitize progress data structure
   */
  private validateProgress(progress: any): UserProgress {
    // Ensure all required fields exist with proper types
    return {
      exerciseHistory: this.validateObject(progress.exerciseHistory),
      dictationHistory: this.validateObject(progress.dictationHistory),
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
      currentStreak: 0,
      longestStreak: 0,
      lastStreakDate: '',
      lastActivityDate: new Date(),
      achievements: []
    };
  }
}
