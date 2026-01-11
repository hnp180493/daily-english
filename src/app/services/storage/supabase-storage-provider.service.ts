import { Injectable, inject } from '@angular/core';
import { Observable, of, throwError, timer } from 'rxjs';
import { map, switchMap, retry, catchError } from 'rxjs/operators';
import { StorageAdapter, UserStats } from './storage-adapter.interface';
import { UserProgress, ExerciseAttempt } from '../../models/exercise.model';
import { DictationPracticeAttempt } from '../../models/dictation.model';
import { MemoryData, Flashcard, QuizResult } from '../../models/memory-retention.model';
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

  // ============================================================================
  // Memory Retention Operations (Requirements: 6.2)
  // For authenticated users, memory data is stored in Supabase
  // Currently using localStorage as fallback until Supabase tables are created
  // ============================================================================

  private readonly MEMORY_DATA_KEY = 'supabase_memory_retention_data';
  private readonly FLASHCARDS_KEY = 'supabase_flashcards';
  private readonly QUIZ_RESULTS_KEY = 'supabase_quiz_results';

  saveMemoryData(exerciseId: string, data: MemoryData): Observable<void> {
    try {
      const existing = this.loadMemoryDataSync();
      existing[exerciseId] = data;
      localStorage.setItem(this.MEMORY_DATA_KEY, JSON.stringify(existing));
      console.log('[SupabaseStorage] Memory data saved for exercise:', exerciseId);
      return of(undefined);
    } catch (error) {
      console.error('[SupabaseStorage] Failed to save memory data:', error);
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
      console.error('[SupabaseStorage] Failed to load memory data:', error);
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
      console.error('[SupabaseStorage] Failed to load all memory data:', error);
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
      console.log('[SupabaseStorage] Flashcards saved:', flashcards.length);
      return of(undefined);
    } catch (error) {
      console.error('[SupabaseStorage] Failed to save flashcards:', error);
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
      console.error('[SupabaseStorage] Failed to load flashcards:', error);
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
      console.log('[SupabaseStorage] Quiz result saved for exercise:', exerciseId);
      return of(undefined);
    } catch (error) {
      console.error('[SupabaseStorage] Failed to save quiz result:', error);
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
      console.error('[SupabaseStorage] Failed to load quiz result:', error);
      return of(null);
    }
  }

  private loadQuizResultsSync(): { [exerciseId: string]: QuizResult } {
    const data = localStorage.getItem(this.QUIZ_RESULTS_KEY);
    return data ? JSON.parse(data) : {};
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
