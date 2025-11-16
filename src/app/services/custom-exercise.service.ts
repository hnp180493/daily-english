import { Injectable, inject, effect } from '@angular/core';
import { BehaviorSubject, Observable, from } from 'rxjs';
import { map } from 'rxjs/operators';
import {
  CustomExercise,
  DifficultyLevel,
  ValidationResult,
  ValidationError
} from '../models/exercise.model';
import { AuthService } from './auth.service';

/**
 * CustomExerciseService
 * 
 * Storage Strategy:
 * - Uses ONLY localStorage for custom exercises
 * - No cloud sync - exercises are stored locally on the device
 * - Users can export/import exercises for manual sync across devices
 * 
 * Data flow:
 * 1. User creates/edits exercise → Saved to localStorage only
 * 2. User loads exercises → Loaded from localStorage
 * 3. User can export exercises to JSON file for backup
 * 4. User can import exercises from JSON file to restore or sync
 */
@Injectable({
  providedIn: 'root'
})
export class CustomExerciseService {
  private authService = inject(AuthService);

  // State management
  private exercises$ = new BehaviorSubject<CustomExercise[]>([]);

  // Storage key constants
  private readonly STORAGE_KEY_PREFIX = 'custom_exercises_';

  constructor() {
    this.loadFromLocalStorage();

    // Reload from localStorage when user changes
    effect(() => {
      const isAuth = this.authService.isAuthenticated();
      if (isAuth) {
        this.loadFromLocalStorage();
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
  private loadFromLocalStorage(): void {
    try {
      const userId = this.authService.getUserId();
      if (!userId) {
        console.log('[CustomExerciseService] No user ID, skipping load');
        this.exercises$.next([]);
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
      } else {
        this.exercises$.next([]);
      }
    } catch (error) {
      console.error('[CustomExerciseService] Failed to load from localStorage:', error);
      this.exercises$.next([]);
    }
  }

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

  // Import/Export functionality
  exportExercises(): string {
    const exercises = this.exercises$.value;
    const exportData = {
      version: '1.0',
      exportDate: new Date().toISOString(),
      exercises: exercises,
      count: exercises.length
    };
    return JSON.stringify(exportData, null, 2);
  }

  importExercises(jsonData: string): Observable<{ imported: number; skipped: number; errors: string[] }> {
    return new Observable(observer => {
      try {
        const data = JSON.parse(jsonData);
        
        if (!data.exercises || !Array.isArray(data.exercises)) {
          throw new Error('Invalid import format: exercises array not found');
        }

        const currentExercises = this.exercises$.value;
        const existingIds = new Set(currentExercises.map(ex => ex.id));
        
        let imported = 0;
        let skipped = 0;
        const errors: string[] = [];
        const newExercises: CustomExercise[] = [];

        data.exercises.forEach((ex: any, index: number) => {
          try {
            // Convert date strings back to Date objects
            const exercise: CustomExercise = {
              ...ex,
              createdAt: new Date(ex.createdAt),
              updatedAt: new Date(ex.updatedAt),
              isCustom: true
            };

            // Validate the exercise
            const validation = this.validateExercise(exercise);
            if (!validation.isValid) {
              errors.push(`Exercise ${index + 1}: ${validation.errors.map(e => e.message).join(', ')}`);
              skipped++;
              return;
            }

            // Skip if already exists
            if (existingIds.has(exercise.id)) {
              skipped++;
              return;
            }

            newExercises.push(exercise);
            imported++;
          } catch (error) {
            errors.push(`Exercise ${index + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            skipped++;
          }
        });

        if (newExercises.length > 0) {
          const updatedExercises = [...currentExercises, ...newExercises];
          this.exercises$.next(updatedExercises);
          this.saveToLocalStorage(updatedExercises);
        }

        observer.next({ imported, skipped, errors });
        observer.complete();
      } catch (error) {
        observer.error(error instanceof Error ? error : new Error('Failed to import exercises'));
      }
    });
  }
}
