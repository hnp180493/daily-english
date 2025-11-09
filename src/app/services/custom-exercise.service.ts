import { Injectable, inject, effect } from '@angular/core';
import { BehaviorSubject, Observable, from } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import {
  CustomExercise,
  DifficultyLevel,
  ValidationResult,
  ValidationError
} from '../models/exercise.model';
import { AuthService } from './auth.service';
import { DatabaseService } from './database/database.service';

/**
 * CustomExerciseService
 * 
 * IMPORTANT: This service uses a dual-storage strategy with Firestore as primary and localStorage for offline support.
 * 
 * Storage Strategy:
 * - PRIMARY: Firestore (cloud database) - Source of truth for custom exercises
 * - SECONDARY: localStorage - Offline cache and backup
 * 
 * Why localStorage is retained here:
 * - Enables offline creation and editing of custom exercises
 * - Provides instant access without network latency
 * - Acts as a local cache for better performance
 * - Syncs with Firestore when online
 * 
 * Data flow:
 * 1. User creates/edits exercise → Saved to BOTH localStorage AND Firestore
 * 2. User loads exercises → Loaded from Firestore, cached in localStorage
 * 3. Conflict resolution → Firestore data takes precedence (based on updatedAt timestamp)
 * 4. Offline mode → Uses localStorage, syncs to Firestore when connection restored
 * 
 * Sync behavior:
 * - On login: Load from Firestore, merge with localStorage, update both
 * - On create/update: Save to localStorage immediately, then sync to Firestore
 * - On delete: Remove from both localStorage and Firestore
 * - Merge strategy: Most recent updatedAt wins
 * 
 * This is one of TWO services that use localStorage (the other is ExercisePersistenceService).
 * All other user data (progress, achievements, favorites, rewards) is stored ONLY in Firestore.
 */
@Injectable({
  providedIn: 'root'
})
export class CustomExerciseService {
  private authService = inject(AuthService);
  private databaseService = inject(DatabaseService);

  // State management
  private exercises$ = new BehaviorSubject<CustomExercise[]>([]);

  // Storage key constants
  private readonly STORAGE_KEY_PREFIX = 'custom_exercises_';
  private isInitialized = false;

  constructor() {
    this.loadFromLocalStorage();

    // Listen to auth state changes and sync when user logs in
    effect(() => {
      const isAuth = this.authService.isAuthenticated();
      if (isAuth && !this.isInitialized) {
        // Load from Firestore only once per user session
        this.isInitialized = true;
        this.loadFromFirestore();
      } else if (!isAuth) {
        this.isInitialized = false;
      }
    });
  }

  // Observable streams
  getCustomExercises(): Observable<CustomExercise[]> {
    return this.exercises$.asObservable();
  }

  getCustomExerciseById(id: string): Observable<CustomExercise | undefined> {
    return this.exercises$.pipe(
      map(exercises => exercises.find(ex => ex.id === id))
    );
  }

  getCustomExercisesByLevel(level: DifficultyLevel): Observable<CustomExercise[]> {
    return this.exercises$.pipe(
      map(exercises => exercises.filter(ex => ex.level === level))
    );
  }

  getCustomExercisesByCategory(category: string): Observable<CustomExercise[]> {
    return this.exercises$.pipe(
      map(exercises => exercises.filter(ex =>
        ex.customCategories?.includes(category)
      ))
    );
  }

  getCustomExercisesByTags(tags: string[]): Observable<CustomExercise[]> {
    return this.exercises$.pipe(
      map(exercises => exercises.filter(ex =>
        tags.every(tag => ex.tags?.includes(tag))
      ))
    );
  }

  // CRUD operations
  createExercise(exercise: Partial<CustomExercise>): Observable<CustomExercise> {
    return new Observable(observer => {
      try {
        const userId = this.authService.getUserId();
        if (!userId) {
          throw new Error('User must be authenticated to create exercises');
        }

        const newExercise: CustomExercise = {
          ...exercise,
          id: this.generateExerciseId(),
          isCustom: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          userId,
          customCategories: exercise.customCategories || [],
          tags: exercise.tags || []
        } as CustomExercise;

        // Validate the exercise
        const validation = this.validateExercise(newExercise);
        if (!validation.isValid) {
          throw new Error(`Validation failed: ${validation.errors.map(e => e.message).join(', ')}`);
        }

        const currentExercises = this.exercises$.value;
        const updatedExercises = [...currentExercises, newExercise];

        this.exercises$.next(updatedExercises);
        this.saveToLocalStorage(updatedExercises);

        // Sync to database
        this.syncToFirestore(newExercise).subscribe({
          error: (error) => console.error('Failed to sync to database:', error)
        });

        observer.next(newExercise);
        observer.complete();
      } catch (error) {
        observer.error(error);
      }
    });
  }

  updateExercise(id: string, updates: Partial<CustomExercise>): Observable<CustomExercise> {
    return new Observable(observer => {
      try {
        const currentExercises = this.exercises$.value;
        const index = currentExercises.findIndex(ex => ex.id === id);

        if (index === -1) {
          throw new Error(`Exercise with id ${id} not found`);
        }

        const updatedExercise: CustomExercise = {
          ...currentExercises[index],
          ...updates,
          id, // Preserve original ID
          updatedAt: new Date()
        };

        // Validate the updated exercise
        const validation = this.validateExercise(updatedExercise);
        if (!validation.isValid) {
          throw new Error(`Validation failed: ${validation.errors.map(e => e.message).join(', ')}`);
        }

        const updatedExercises = [...currentExercises];
        updatedExercises[index] = updatedExercise;

        this.exercises$.next(updatedExercises);
        this.saveToLocalStorage(updatedExercises);

        // Sync to database
        this.syncToFirestore(updatedExercise).subscribe({
          error: (error) => console.error('Failed to sync to database:', error)
        });

        observer.next(updatedExercise);
        observer.complete();
      } catch (error) {
        observer.error(error);
      }
    });
  }

  deleteExercise(id: string): Observable<void> {
    return new Observable(observer => {
      try {
        const currentExercises = this.exercises$.value;
        const updatedExercises = currentExercises.filter(ex => ex.id !== id);

        if (currentExercises.length === updatedExercises.length) {
          throw new Error(`Exercise with id ${id} not found`);
        }

        this.exercises$.next(updatedExercises);
        this.saveToLocalStorage(updatedExercises);

        // Delete from database
        this.databaseService.deleteCustomExerciseAuto(id).subscribe({
          error: (error) => console.error('Failed to delete from database:', error)
        });

        observer.next();
        observer.complete();
      } catch (error) {
        observer.error(error);
      }
    });
  }

  // Validation logic
  validateExercise(exercise: Partial<CustomExercise>): ValidationResult {
    const errors: ValidationError[] = [];

    // Title validation (3-100 characters)
    if (!exercise.title || exercise.title.trim().length < 3) {
      errors.push({
        field: 'title',
        message: 'Title must be at least 3 characters long'
      });
    }
    if (exercise.title && exercise.title.length > 100) {
      errors.push({
        field: 'title',
        message: 'Title must not exceed 100 characters'
      });
    }

    // Source text validation (minimum 10 characters)
    if (!exercise.sourceText || exercise.sourceText.trim().length < 10) {
      errors.push({
        field: 'sourceText',
        message: 'Source text must be at least 10 characters long'
      });
    }

    // Category validation (max 5, each 2-50 characters)
    if (exercise.customCategories && exercise.customCategories.length > 5) {
      errors.push({
        field: 'customCategories',
        message: 'Maximum 5 categories allowed'
      });
    }
    if (exercise.customCategories) {
      const invalidCategories = exercise.customCategories.filter(
        cat => cat.length < 2 || cat.length > 50
      );
      if (invalidCategories.length > 0) {
        errors.push({
          field: 'customCategories',
          message: 'Each category must be between 2 and 50 characters'
        });
      }
    }

    // Tag validation (max 10, each 2-30 characters)
    if (exercise.tags && exercise.tags.length > 10) {
      errors.push({
        field: 'tags',
        message: 'Maximum 10 tags allowed'
      });
    }
    if (exercise.tags) {
      const invalidTags = exercise.tags.filter(
        tag => tag.length < 2 || tag.length > 30
      );
      if (invalidTags.length > 0) {
        errors.push({
          field: 'tags',
          message: 'Each tag must be between 2 and 30 characters'
        });
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Utility methods
  extractSentences(text: string): string[] {
    if (!text || text.trim().length === 0) {
      return [];
    }

    // Split by sentence-ending punctuation followed by space or end of string
    // This regex handles periods, question marks, and exclamation points
    const sentenceRegex = /[^.!?]+[.!?]+/g;
    const sentences = text.match(sentenceRegex) || [];

    return sentences
      .map(s => s.trim())
      .filter(s => s.length > 0);
  }

  generateExerciseId(): string {
    // Generate a proper UUID v4 for Supabase compatibility
    return crypto.randomUUID();
  }

  // LocalStorage persistence methods
  /**
   * Loads custom exercises from localStorage (offline cache)
   * This provides instant access and offline support
   */
  private loadFromLocalStorage(): void {
    try {
      const userId = this.authService.getUserId();
      if (!userId) {
        console.log('[CustomExerciseService] No user ID, skipping load');
        return;
      }

      const storageKey = this.getStorageKey(userId);
      const stored = localStorage.getItem(storageKey);

      if (stored) {
        const data = JSON.parse(stored);
        const exercises = data.exercises.map((ex: any) => ({
          ...ex,
          createdAt: new Date(ex.createdAt),
          updatedAt: new Date(ex.updatedAt)
        }));

        this.exercises$.next(exercises);
        console.log(`[CustomExerciseService] Loaded ${exercises.length} exercises from localStorage`);
      }
    } catch (error) {
      console.error('[CustomExerciseService] Failed to load from localStorage:', error);
      // Reset to empty state on parse error
      this.exercises$.next([]);
    }
  }

  /**
   * Saves custom exercises to localStorage (offline cache)
   * This enables offline access and provides instant save without network latency
   */
  private saveToLocalStorage(exercises: CustomExercise[]): void {
    try {
      const userId = this.authService.getUserId();
      if (!userId) {
        console.warn('[CustomExerciseService] No user ID, skipping save');
        return;
      }

      const storageKey = this.getStorageKey(userId);
      const data = {
        exercises,
        lastModified: new Date().toISOString()
      };

      localStorage.setItem(storageKey, JSON.stringify(data));
      console.log(`[CustomExerciseService] Saved ${exercises.length} exercises to localStorage`);
    } catch (error) {
      if (error instanceof Error && error.name === 'QuotaExceededError') {
        console.error('[CustomExerciseService] LocalStorage quota exceeded');
        throw new Error('Storage quota exceeded. Please delete some exercises to free up space.');
      } else {
        console.error('[CustomExerciseService] Failed to save to localStorage:', error);
        throw error;
      }
    }
  }

  private getStorageKey(userId: string): string {
    return `${this.STORAGE_KEY_PREFIX}${userId}`;
  }

  // Database sync methods
  /**
   * Syncs a custom exercise to Firestore (primary storage)
   * Continues gracefully if sync fails (offline mode)
   */
  private syncToFirestore(exercise: CustomExercise): Observable<void> {
    try {
      return this.databaseService.saveCustomExerciseAuto(exercise).pipe(
        catchError(error => {
          console.error('[CustomExerciseService] Database sync failed:', error);
          return from(Promise.resolve()); // Continue even if sync fails
        })
      );
    } catch (error) {
      console.error('[CustomExerciseService] Database sync error:', error);
      return from(Promise.resolve());
    }
  }

  /**
   * Loads custom exercises from Firestore and merges with localStorage
   * Firestore is the source of truth - most recent updatedAt wins
   */
  private loadFromFirestore(): void {
    try {
      const userId = this.authService.getUserId();
      if (!userId) {
        console.log('[CustomExerciseService] No user ID, skipping database load');
        return;
      }

      this.databaseService.loadCustomExercisesAuto().subscribe({
        next: (cloudExercises) => {
          if (cloudExercises && cloudExercises.length > 0) {
            console.log(`[CustomExerciseService] Loaded ${cloudExercises.length} exercises from database`);

            // Merge with local exercises (cloud takes precedence based on updatedAt)
            const localExercises = this.exercises$.value;
            const mergedExercises = this.mergeExercises(localExercises, cloudExercises);

            this.exercises$.next(mergedExercises);
            this.saveToLocalStorage(mergedExercises);
          }
        },
        error: (error) => {
          console.error('[CustomExerciseService] Failed to load from database:', error);
        }
      });
    } catch (error) {
      console.error('[CustomExerciseService] Database load error:', error);
    }
  }

  /**
   * Merges local and cloud exercises
   * Conflict resolution: Most recent updatedAt timestamp wins
   */
  private mergeExercises(local: CustomExercise[], cloud: CustomExercise[]): CustomExercise[] {
    const merged = new Map<string, CustomExercise>();

    // Add local exercises
    local.forEach(ex => merged.set(ex.id, ex));

    // Add/update with cloud exercises (cloud takes precedence on conflicts based on updatedAt)
    cloud.forEach(ex => {
      const existing = merged.get(ex.id);
      if (!existing || ex.updatedAt > existing.updatedAt) {
        merged.set(ex.id, ex);
      }
    });

    return Array.from(merged.values()).sort((a, b) =>
      b.updatedAt.getTime() - a.updatedAt.getTime()
    );
  }
}
