import { Injectable, inject, signal } from '@angular/core';
import { Observable, of, forkJoin } from 'rxjs';
import { map, tap, catchError, switchMap } from 'rxjs/operators';
import {
  MemoryData,
  QuizResult,
  ContentSummaryData,
  Flashcard,
  FLASHCARD_DEFAULTS
} from '../models/memory-retention.model';
import { Exercise } from '../models/exercise.model';
import { QuizGeneratorService } from './quiz-generator.service';
import { SummaryGeneratorService } from './summary-generator.service';
import { FlashcardService } from './flashcard.service';
import { AuthService } from './auth.service';

/**
 * MemoryRetentionService orchestrates memory content generation and caching.
 * Requirements: 4.6, 6.1, 6.5, 6.6
 */
@Injectable({
  providedIn: 'root'
})
export class MemoryRetentionService {
  private quizGenerator = inject(QuizGeneratorService);
  private summaryGenerator = inject(SummaryGeneratorService);
  private flashcardService = inject(FlashcardService);
  private authService = inject(AuthService);

  // Cache for memory data by exercise ID
  // Requirements: 6.5 - Store generated summaries to avoid regenerating
  private memoryDataCache = signal<Map<string, MemoryData>>(new Map());

  // Storage key for localStorage
  private readonly STORAGE_KEY = 'memory_retention_data';

  constructor() {
    // Load cached data on initialization
    this.loadCachedData();
  }

  /**
   * Generate memory content (quiz and summary) for an exercise.
   * Uses forkJoin to run quiz and summary generation in parallel.
   * Requirements: 6.5 - Check cache first before regenerating
   */
  generateMemoryContent(exercise: Exercise, userTranslation: string): Observable<MemoryData> {
    // Check cache first
    const cached = this.memoryDataCache().get(exercise.id);
    if (cached) {
      console.log(`[MemoryRetentionService] Using cached data for exercise ${exercise.id}`);
      return of(cached);
    }

    // Generate quiz and summary in parallel
    return forkJoin({
      quiz: this.quizGenerator.generateQuiz(exercise, userTranslation).pipe(
        catchError(error => {
          console.error('[MemoryRetentionService] Quiz generation failed:', error);
          return of([]);
        })
      ),
      summary: this.summaryGenerator.generateSummary(exercise, userTranslation).pipe(
        catchError(error => {
          console.error('[MemoryRetentionService] Summary generation failed:', error);
          return of(this.summaryGenerator.createFallbackSummary(exercise));
        })
      )
    }).pipe(
      map(({ quiz, summary }) => {
        const memoryData: MemoryData = {
          exerciseId: exercise.id,
          quiz: { questions: quiz },
          summary,
          flashcards: this.createFlashcardsFromSummary(summary, exercise.id),
          generatedAt: new Date()
        };

        // Cache the result
        this.cacheMemoryData(memoryData);

        return memoryData;
      })
    );
  }

  /**
   * Save quiz result for an exercise.
   * Requirements: 6.1 - Save quiz results including questions, answers, and score
   */
  saveQuizResult(result: QuizResult): Observable<void> {
    return new Observable(observer => {
      try {
        // Update cache with quiz result
        const cache = this.memoryDataCache();
        const existing = cache.get(result.exerciseId);

        if (existing) {
          const updated: MemoryData = {
            ...existing,
            quiz: {
              ...existing.quiz,
              questions: existing.quiz?.questions || result.questions,
              result
            }
          };
          this.cacheMemoryData(updated);
        }

        // Persist to storage
        this.persistCache();

        observer.next();
        observer.complete();
      } catch (error) {
        observer.error(error);
      }
    });
  }

  /**
   * Load memory data for an exercise.
   * Requirements: 6.6 - Check for existing memory data and display if available
   */
  loadMemoryData(exerciseId: string): Observable<MemoryData | null> {
    // Check cache first
    const cached = this.memoryDataCache().get(exerciseId);
    if (cached) {
      return of(cached);
    }

    // Try to load from storage
    return this.loadFromStorage(exerciseId);
  }

  /**
   * Get cached memory data synchronously (for components that need immediate access).
   */
  getCachedMemoryData(exerciseId: string): MemoryData | null {
    return this.memoryDataCache().get(exerciseId) || null;
  }

  /**
   * Check if memory data exists for an exercise.
   */
  hasMemoryData(exerciseId: string): boolean {
    return this.memoryDataCache().has(exerciseId);
  }

  /**
   * Add flashcards from memory data to the user's flashcard deck.
   */
  addFlashcardsToDecks(flashcards: Flashcard[]): Observable<void> {
    return this.flashcardService.addFlashcards(flashcards);
  }

  /**
   * Create flashcards from content summary vocabulary.
   */
  createFlashcardsFromSummary(summary: ContentSummaryData, exerciseId: string): Flashcard[] {
    return summary.vocabulary.map(vocab => ({
      id: this.generateId(),
      front: vocab.word,
      back: vocab.meaning,
      example: vocab.exampleSentence, // English example sentence from the passage
      exerciseId,
      category: summary.exerciseId,
      createdAt: new Date(),
      easeFactor: FLASHCARD_DEFAULTS.easeFactor,
      interval: FLASHCARD_DEFAULTS.interval,
      nextReviewDate: new Date(),
      reviewCount: FLASHCARD_DEFAULTS.reviewCount
    }));
  }

  /**
   * Clear cached memory data for an exercise.
   */
  clearMemoryData(exerciseId: string): void {
    this.memoryDataCache.update(cache => {
      const newCache = new Map(cache);
      newCache.delete(exerciseId);
      return newCache;
    });
    this.persistCache();
  }

  /**
   * Clear all cached memory data.
   */
  clearAllMemoryData(): void {
    this.memoryDataCache.set(new Map());
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(this.STORAGE_KEY);
    }
  }

  // Private helper methods

  /**
   * Cache memory data and persist to storage.
   */
  private cacheMemoryData(data: MemoryData): void {
    this.memoryDataCache.update(cache => {
      const newCache = new Map(cache);
      newCache.set(data.exerciseId, data);
      return newCache;
    });
    this.persistCache();
  }

  /**
   * Load cached data from storage on initialization.
   */
  private loadCachedData(): void {
    if (typeof localStorage === 'undefined') return;

    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const data = JSON.parse(stored) as { [key: string]: MemoryData };
        const cache = new Map<string, MemoryData>();

        for (const [key, value] of Object.entries(data)) {
          // Convert date strings back to Date objects
          cache.set(key, {
            ...value,
            generatedAt: new Date(value.generatedAt),
            quiz: value.quiz
              ? {
                  ...value.quiz,
                  result: value.quiz.result
                    ? {
                        ...value.quiz.result,
                        completedAt: new Date(value.quiz.result.completedAt)
                      }
                    : undefined
                }
              : undefined,
            summary: value.summary
              ? {
                  ...value.summary,
                  generatedAt: new Date(value.summary.generatedAt)
                }
              : undefined,
            flashcards: value.flashcards?.map(fc => ({
              ...fc,
              createdAt: new Date(fc.createdAt),
              nextReviewDate: new Date(fc.nextReviewDate),
              lastReviewDate: fc.lastReviewDate ? new Date(fc.lastReviewDate) : undefined
            }))
          });
        }

        this.memoryDataCache.set(cache);
        console.log(`[MemoryRetentionService] Loaded ${cache.size} cached memory data entries`);
      }
    } catch (error) {
      console.error('[MemoryRetentionService] Failed to load cached data:', error);
    }
  }

  /**
   * Persist cache to storage.
   */
  private persistCache(): void {
    if (typeof localStorage === 'undefined') return;

    try {
      const cache = this.memoryDataCache();
      const data: { [key: string]: MemoryData } = {};

      cache.forEach((value, key) => {
        data[key] = value;
      });

      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.error('[MemoryRetentionService] Failed to persist cache:', error);
    }
  }

  /**
   * Load memory data from storage for a specific exercise.
   */
  private loadFromStorage(exerciseId: string): Observable<MemoryData | null> {
    return new Observable(observer => {
      if (typeof localStorage === 'undefined') {
        observer.next(null);
        observer.complete();
        return;
      }

      try {
        const stored = localStorage.getItem(this.STORAGE_KEY);
        if (stored) {
          const data = JSON.parse(stored) as { [key: string]: MemoryData };
          const memoryData = data[exerciseId];

          if (memoryData) {
            // Convert date strings and cache
            const parsed: MemoryData = {
              ...memoryData,
              generatedAt: new Date(memoryData.generatedAt),
              quiz: memoryData.quiz
                ? {
                    ...memoryData.quiz,
                    result: memoryData.quiz.result
                      ? {
                          ...memoryData.quiz.result,
                          completedAt: new Date(memoryData.quiz.result.completedAt)
                        }
                      : undefined
                  }
                : undefined,
              summary: memoryData.summary
                ? {
                    ...memoryData.summary,
                    generatedAt: new Date(memoryData.summary.generatedAt)
                  }
                : undefined,
              flashcards: memoryData.flashcards?.map(fc => ({
                ...fc,
                createdAt: new Date(fc.createdAt),
                nextReviewDate: new Date(fc.nextReviewDate),
                lastReviewDate: fc.lastReviewDate ? new Date(fc.lastReviewDate) : undefined
              }))
            };

            // Update cache
            this.cacheMemoryData(parsed);
            observer.next(parsed);
          } else {
            observer.next(null);
          }
        } else {
          observer.next(null);
        }
        observer.complete();
      } catch (error) {
        console.error('[MemoryRetentionService] Failed to load from storage:', error);
        observer.next(null);
        observer.complete();
      }
    });
  }

  /**
   * Generate a unique ID.
   */
  private generateId(): string {
    return `mr_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }
}
