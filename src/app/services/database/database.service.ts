import { Injectable, inject, Injector } from '@angular/core';
import { Observable, of, throwError, timer } from 'rxjs';
import { retry, catchError } from 'rxjs/operators';
import { AuthService } from '../auth.service';
import { UserProgress, CustomExercise } from '../../models/exercise.model';
import { UserAchievementData } from '../../models/achievement.model';
import { IDatabase, FavoriteData, UserProfile, UserRewards, UnsubscribeFunction } from './database.interface';
import { SupabaseDatabase } from './supabase-database.service';

/**
 * Centralized database service
 * Acts as a facade for all database operations
 * Switch database implementation by changing the provider
 */
@Injectable({
  providedIn: 'root'
})
export class DatabaseService implements IDatabase {
  private database = inject(SupabaseDatabase); // Changed from FirebaseDatabase to SupabaseDatabase
  private injector = inject(Injector);
  private _authService?: AuthService;
  
  // Lazy inject to avoid circular dependency
  private get authService(): AuthService {
    if (!this._authService) {
      this._authService = this.injector.get(AuthService);
    }
    return this._authService;
  }

  /**
   * Retry logic for Firestore operations with exponential backoff
   * @param operation The observable operation to retry
   * @param maxRetries Maximum number of retry attempts (default: 3)
   * @returns Observable with retry logic applied
   */
  private saveWithRetry<T>(operation: Observable<T>, maxRetries: number = 3): Observable<T> {
    return operation.pipe(
      retry({
        count: maxRetries,
        delay: (error, retryCount) => {
          const delayMs = Math.min(1000 * Math.pow(2, retryCount), 10000);
          console.log(`[DatabaseService] Retry ${retryCount} after ${delayMs}ms due to error:`, error);
          return timer(delayMs);
        }
      }),
      catchError((error: Error) => {
        console.error('[DatabaseService] Operation failed after retries:', error);
        return throwError(() => error);
      })
    );
  }

  // User Profile Operations
  saveUserProfile(userId: string, profile: UserProfile): Observable<void> {
    if (!userId) {
      console.log('[DatabaseService] No userId provided, skipping save');
      return of(undefined);
    }
    return this.database.saveUserProfile(userId, profile);
  }

  loadUserProfile(userId: string): Observable<UserProfile | null> {
    if (!userId) {
      console.log('[DatabaseService] No userId provided, returning null');
      return of(null);
    }
    return this.database.loadUserProfile(userId);
  }

  // Progress Operations
  saveProgress(userId: string, progress: UserProgress): Observable<void> {
    if (!userId) {
      console.log('[DatabaseService] No userId provided, skipping save');
      return of(undefined);
    }
    return this.database.saveProgress(userId, progress);
  }

  loadProgress(userId: string): Observable<UserProgress | null> {
    if (!userId) {
      console.log('[DatabaseService] No userId provided, returning null');
      return of(null);
    }
    return this.database.loadProgress(userId);
  }

  subscribeToProgress(
    userId: string,
    callback: (progress: UserProgress | null) => void
  ): UnsubscribeFunction {
    if (!userId) {
      console.log('[DatabaseService] No userId provided, returning no-op unsubscribe');
      return () => {};
    }
    return this.database.subscribeToProgress(userId, callback);
  }

  // Favorites Operations
  saveFavorites(userId: string, favorites: FavoriteData[]): Observable<void> {
    if (!userId) {
      console.log('[DatabaseService] No userId provided, skipping save');
      return of(undefined);
    }
    return this.database.saveFavorites(userId, favorites);
  }

  loadFavorites(userId: string): Observable<FavoriteData[] | null> {
    if (!userId) {
      console.log('[DatabaseService] No userId provided, returning null');
      return of(null);
    }
    return this.database.loadFavorites(userId);
  }

  subscribeToFavorites(
    userId: string,
    callback: (favorites: FavoriteData[] | null) => void
  ): UnsubscribeFunction {
    if (!userId) {
      console.log('[DatabaseService] No userId provided, returning no-op unsubscribe');
      return () => {};
    }
    return this.database.subscribeToFavorites(userId, callback);
  }

  // Custom Exercise Operations
  saveCustomExercise(userId: string, exercise: CustomExercise): Observable<void> {
    if (!userId) {
      console.log('[DatabaseService] No userId provided, skipping save');
      return of(undefined);
    }
    return this.database.saveCustomExercise(userId, exercise);
  }

  loadCustomExercises(userId: string): Observable<CustomExercise[]> {
    if (!userId) {
      console.log('[DatabaseService] No userId provided, returning empty array');
      return of([]);
    }
    return this.database.loadCustomExercises(userId);
  }

  deleteCustomExercise(userId: string, exerciseId: string): Observable<void> {
    if (!userId) {
      console.log('[DatabaseService] No userId provided, skipping delete');
      return of(undefined);
    }
    return this.database.deleteCustomExercise(userId, exerciseId);
  }

  subscribeToCustomExercises(
    userId: string,
    callback: (exercises: CustomExercise[]) => void
  ): UnsubscribeFunction {
    if (!userId) {
      console.log('[DatabaseService] No userId provided, returning no-op unsubscribe');
      return () => {};
    }
    return this.database.subscribeToCustomExercises(userId, callback);
  }

  // Convenience methods that automatically get userId from AuthService
  saveUserProfileAuto(): Observable<void> {
    const userId = this.authService.getUserId();
    if (!userId) return of(undefined);

    const profile: UserProfile = {
      email: this.authService.getEmail(),
      displayName: this.authService.getDisplayName(),
      photoURL: this.authService.getPhotoURL(),
      createdAt: new Date(),
      lastLogin: new Date()
    };

    return this.saveUserProfile(userId, profile);
  }

  saveProgressAuto(progress: UserProgress): Observable<void> {
    const userId = this.authService.getUserId();
    if (!userId) return of(undefined);
    return this.saveWithRetry(this.saveProgress(userId, progress));
  }

  loadProgressAuto(): Observable<UserProgress | null> {
    const userId = this.authService.getUserId();
    if (!userId) return of(null);
    return this.loadProgress(userId);
  }

  subscribeToProgressAuto(
    callback: (progress: UserProgress | null) => void
  ): UnsubscribeFunction {
    const userId = this.authService.getUserId();
    if (!userId) return () => {};
    return this.subscribeToProgress(userId, callback);
  }

  saveFavoritesAuto(favorites: FavoriteData[]): Observable<void> {
    const userId = this.authService.getUserId();
    if (!userId) return of(undefined);
    return this.saveWithRetry(this.saveFavorites(userId, favorites));
  }

  loadFavoritesAuto(): Observable<FavoriteData[] | null> {
    const userId = this.authService.getUserId();
    if (!userId) return of(null);
    return this.loadFavorites(userId);
  }

  subscribeToFavoritesAuto(
    callback: (favorites: FavoriteData[] | null) => void
  ): UnsubscribeFunction {
    const userId = this.authService.getUserId();
    if (!userId) return () => {};
    return this.subscribeToFavorites(userId, callback);
  }

  saveCustomExerciseAuto(exercise: CustomExercise): Observable<void> {
    const userId = this.authService.getUserId();
    if (!userId) return of(undefined);
    return this.saveCustomExercise(userId, exercise);
  }

  loadCustomExercisesAuto(): Observable<CustomExercise[]> {
    const userId = this.authService.getUserId();
    if (!userId) return of([]);
    return this.loadCustomExercises(userId);
  }

  deleteCustomExerciseAuto(exerciseId: string): Observable<void> {
    const userId = this.authService.getUserId();
    if (!userId) return of(undefined);
    return this.deleteCustomExercise(userId, exerciseId);
  }

  subscribeToCustomExercisesAuto(
    callback: (exercises: CustomExercise[]) => void
  ): UnsubscribeFunction {
    const userId = this.authService.getUserId();
    if (!userId) return () => {};
    return this.subscribeToCustomExercises(userId, callback);
  }

  loadUserProfileAuto(): Observable<UserProfile | null> {
    const userId = this.authService.getUserId();
    if (!userId) return of(null);
    return this.loadUserProfile(userId);
  }

  // Achievement Operations
  saveAchievements(userId: string, data: UserAchievementData): Observable<void> {
    if (!userId) {
      console.log('[DatabaseService] No userId provided, skipping save');
      return of(undefined);
    }
    return this.database.saveAchievements(userId, data);
  }

  loadAchievements(userId: string): Observable<UserAchievementData | null> {
    if (!userId) {
      console.log('[DatabaseService] No userId provided, returning null');
      return of(null);
    }
    return this.database.loadAchievements(userId);
  }

  saveAchievementsAuto(data: UserAchievementData): Observable<void> {
    const userId = this.authService.getUserId();
    if (!userId) return of(undefined);
    return this.saveWithRetry(this.saveAchievements(userId, data));
  }

  loadAchievementsAuto(): Observable<UserAchievementData | null> {
    const userId = this.authService.getUserId();
    if (!userId) return of(null);
    return this.loadAchievements(userId);
  }

  // Reward Operations
  saveRewards(userId: string, rewards: UserRewards): Observable<void> {
    if (!userId) {
      console.log('[DatabaseService] No userId provided, skipping save');
      return of(undefined);
    }
    return this.database.saveRewards(userId, rewards);
  }

  loadRewards(userId: string): Observable<UserRewards | null> {
    if (!userId) {
      console.log('[DatabaseService] No userId provided, returning null');
      return of(null);
    }
    return this.database.loadRewards(userId);
  }

  saveRewardsAuto(rewards: UserRewards): Observable<void> {
    const userId = this.authService.getUserId();
    if (!userId) return of(undefined);
    return this.saveWithRetry(this.saveRewards(userId, rewards));
  }

  loadRewardsAuto(): Observable<UserRewards | null> {
    const userId = this.authService.getUserId();
    if (!userId) return of(null);
    return this.loadRewards(userId);
  }
}
