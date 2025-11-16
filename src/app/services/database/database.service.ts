import { Injectable, inject, Injector } from '@angular/core';
import { Observable, of, throwError, timer } from 'rxjs';
import { retry, catchError } from 'rxjs/operators';
import { AuthService } from '../auth.service';
import { UserProgress, CustomExercise } from '../../models/exercise.model';
import { UserAchievementData } from '../../models/achievement.model';
import { ReviewData, ReviewDataWithMetadata } from '../../models/review.model';
import { ExerciseHistoryRecord } from '../../models/exercise-history.model';
import { UserPathProgress } from '../../models/learning-path.model';
import { DailyChallenge } from '../../models/daily-challenge.model';
import { WeeklyGoal } from '../../models/weekly-goal.model';
import { NotificationPreferences } from '../notification.service';
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

  // Custom Exercise Operations - REMOVED
  // Custom exercises are now stored in localStorage only
  // See CustomExerciseService for implementation

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

  // Custom Exercise Auto methods - REMOVED
  // Custom exercises are now stored in localStorage only

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

  // Review Data Operations
  saveReviewData(userId: string, exerciseId: string, reviewData: ReviewData): Observable<void> {
    if (!userId) {
      console.log('[DatabaseService] No userId provided, skipping save');
      return of(undefined);
    }
    return this.database.saveReviewData(userId, exerciseId, reviewData);
  }

  loadReviewData(userId: string, exerciseId: string): Observable<ReviewDataWithMetadata | null> {
    if (!userId) {
      console.log('[DatabaseService] No userId provided, returning null');
      return of(null);
    }
    return this.database.loadReviewData(userId, exerciseId);
  }

  loadAllReviewData(userId: string): Observable<ReviewDataWithMetadata[]> {
    if (!userId) {
      console.log('[DatabaseService] No userId provided, returning empty array');
      return of([]);
    }
    return this.database.loadAllReviewData(userId);
  }

  updateReviewSchedule(userId: string, exerciseId: string, nextReviewDate: Date, interval: number, easinessFactor: number): Observable<void> {
    if (!userId) {
      console.log('[DatabaseService] No userId provided, skipping update');
      return of(undefined);
    }
    return this.database.updateReviewSchedule(userId, exerciseId, nextReviewDate, interval, easinessFactor);
  }

  deleteReviewData(userId: string, exerciseId: string): Observable<void> {
    if (!userId) {
      console.log('[DatabaseService] No userId provided, skipping delete');
      return of(undefined);
    }
    return this.database.deleteReviewData(userId, exerciseId);
  }

  // Auto methods for review data
  saveReviewDataAuto(exerciseId: string, reviewData: ReviewData): Observable<void> {
    const userId = this.authService.getUserId();
    if (!userId) return of(undefined);
    return this.saveWithRetry(this.saveReviewData(userId, exerciseId, reviewData));
  }

  loadReviewDataAuto(exerciseId: string): Observable<ReviewDataWithMetadata | null> {
    const userId = this.authService.getUserId();
    if (!userId) return of(null);
    return this.loadReviewData(userId, exerciseId);
  }

  loadAllReviewDataAuto(): Observable<ReviewDataWithMetadata[]> {
    const userId = this.authService.getUserId();
    if (!userId) return of([]);
    return this.loadAllReviewData(userId);
  }

  updateReviewScheduleAuto(exerciseId: string, nextReviewDate: Date, interval: number, easinessFactor: number): Observable<void> {
    const userId = this.authService.getUserId();
    if (!userId) return of(undefined);
    return this.saveWithRetry(this.updateReviewSchedule(userId, exerciseId, nextReviewDate, interval, easinessFactor));
  }

  deleteReviewDataAuto(exerciseId: string): Observable<void> {
    const userId = this.authService.getUserId();
    if (!userId) return of(undefined);
    return this.deleteReviewData(userId, exerciseId);
  }

  // Exercise History Operations
  insertExerciseHistory(record: ExerciseHistoryRecord): Observable<void> {
    if (!record.userId) {
      console.log('[DatabaseService] No userId provided, skipping save');
      return of(undefined);
    }
    return this.database.insertExerciseHistory(record);
  }

  loadRecentHistory(userId: string, limit: number): Observable<ExerciseHistoryRecord[]> {
    if (!userId) {
      console.log('[DatabaseService] No userId provided, returning empty array');
      return of([]);
    }
    return this.database.loadRecentHistory(userId, limit);
  }

  loadExerciseHistory(userId: string, exerciseId: string): Observable<ExerciseHistoryRecord[]> {
    if (!userId) {
      console.log('[DatabaseService] No userId provided, returning empty array');
      return of([]);
    }
    return this.database.loadExerciseHistory(userId, exerciseId);
  }

  loadHistoryForDateRange(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Observable<ExerciseHistoryRecord[]> {
    if (!userId) {
      console.log('[DatabaseService] No userId provided, returning empty array');
      return of([]);
    }
    return this.database.loadHistoryForDateRange(userId, startDate, endDate);
  }

  // Learning Path Operations
  saveLearningPathProgress(userId: string, progress: UserPathProgress): Observable<void> {
    if (!userId) return of(undefined);
    return this.database.saveLearningPathProgress(userId, progress);
  }

  loadLearningPathProgress(userId: string): Observable<UserPathProgress | null> {
    if (!userId) return of(null);
    return this.database.loadLearningPathProgress(userId);
  }

  saveLearningPathProgressAuto(progress: UserPathProgress): Observable<void> {
    const userId = this.authService.getUserId();
    if (!userId) return of(undefined);
    return this.saveWithRetry(this.saveLearningPathProgress(userId, progress));
  }

  loadLearningPathProgressAuto(): Observable<UserPathProgress | null> {
    const userId = this.authService.getUserId();
    if (!userId) return of(null);
    return this.loadLearningPathProgress(userId);
  }

  // Daily Challenge Operations
  saveDailyChallenge(userId: string, challenge: DailyChallenge): Observable<void> {
    if (!userId) return of(undefined);
    return this.database.saveDailyChallenge(userId, challenge);
  }

  loadDailyChallenge(userId: string, challengeId: string): Observable<DailyChallenge | null> {
    if (!userId) return of(null);
    return this.database.loadDailyChallenge(userId, challengeId);
  }

  loadDailyChallengeByDate(userId: string, date: string): Observable<DailyChallenge | null> {
    if (!userId) return of(null);
    return this.database.loadDailyChallengeByDate(userId, date);
  }

  saveDailyChallengeAuto(challenge: DailyChallenge): Observable<void> {
    const userId = this.authService.getUserId();
    if (!userId) return of(undefined);
    return this.saveWithRetry(this.saveDailyChallenge(userId, challenge));
  }

  loadTodaysDailyChallengeAuto(): Observable<DailyChallenge | null> {
    const userId = this.authService.getUserId();
    if (!userId) return of(null);
    const today = new Date().toISOString().split('T')[0];
    return this.loadDailyChallengeByDate(userId, today);
  }

  // Weekly Goal Operations
  saveWeeklyGoal(userId: string, goal: WeeklyGoal): Observable<void> {
    if (!userId) return of(undefined);
    return this.database.saveWeeklyGoal(userId, goal);
  }

  loadWeeklyGoal(userId: string, goalId: string): Observable<WeeklyGoal | null> {
    if (!userId) return of(null);
    return this.database.loadWeeklyGoal(userId, goalId);
  }

  loadWeeklyGoalByDate(userId: string, weekStartDate: string): Observable<WeeklyGoal | null> {
    if (!userId) return of(null);
    return this.database.loadWeeklyGoalByDate(userId, weekStartDate);
  }

  saveWeeklyGoalAuto(goal: WeeklyGoal): Observable<void> {
    const userId = this.authService.getUserId();
    if (!userId) return of(undefined);
    return this.saveWithRetry(this.saveWeeklyGoal(userId, goal));
  }

  loadCurrentWeeklyGoalAuto(): Observable<WeeklyGoal | null> {
    const userId = this.authService.getUserId();
    if (!userId) return of(null);
    
    // Calculate Monday of current week
    const now = new Date();
    const dayOfWeek = now.getDay();
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Adjust when day is Sunday
    const monday = new Date(now);
    monday.setDate(now.getDate() + diff);
    monday.setHours(0, 0, 0, 0);
    const weekStartDate = monday.toISOString().split('T')[0];
    
    return this.loadWeeklyGoalByDate(userId, weekStartDate);
  }

  // Notification Preferences Operations
  saveNotificationPreferences(userId: string, preferences: NotificationPreferences): Observable<void> {
    if (!userId) return of(undefined);
    return this.database.saveNotificationPreferences(userId, preferences);
  }

  loadNotificationPreferences(userId: string): Observable<NotificationPreferences | null> {
    if (!userId) return of(null);
    return this.database.loadNotificationPreferences(userId);
  }

  saveNotificationPreferencesAuto(preferences: NotificationPreferences): Observable<void> {
    const userId = this.authService.getUserId();
    if (!userId) return of(undefined);
    return this.saveWithRetry(this.saveNotificationPreferences(userId, preferences));
  }

  loadNotificationPreferencesAuto(): Observable<NotificationPreferences | null> {
    const userId = this.authService.getUserId();
    if (!userId) return of(null);
    return this.loadNotificationPreferences(userId);
  }

  // Additional helper methods for learning path components
  loadDailyChallengeByDateAuto(date: string): Observable<DailyChallenge | null> {
    const userId = this.authService.getUserId();
    if (!userId) return of(null);
    return this.loadDailyChallengeByDate(userId, date);
  }

  loadWeeklyGoalByDateAuto(weekStartDate: string): Observable<WeeklyGoal | null> {
    const userId = this.authService.getUserId();
    if (!userId) return of(null);
    return this.loadWeeklyGoalByDate(userId, weekStartDate);
  }

  // User Count Operations
  getTotalUserCount(): Observable<number> {
    return this.database.getTotalUserCount();
  }

  checkUserExists(userId: string): Observable<boolean> {
    if (!userId) return of(false);
    return this.database.checkUserExists(userId);
  }
}
