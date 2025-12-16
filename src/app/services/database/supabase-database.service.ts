import { Injectable, inject } from '@angular/core';
import { Observable, from, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { supabaseClient } from '../supabase.client';
import { UserProgress } from '../../models/exercise.model';
import { UserAchievementData } from '../../models/achievement.model';
import { ReviewData, ReviewDataWithMetadata } from '../../models/review.model';
import { ExerciseHistoryRecord } from '../../models/exercise-history.model';
import { UserPathProgress } from '../../models/learning-path.model';
import { DailyChallenge } from '../../models/daily-challenge.model';
import { WeeklyGoal } from '../../models/weekly-goal.model';
import {
  IDatabase,
  FavoriteData,
  UserProfile,
  UserRewards,
  UnsubscribeFunction
} from './database.interface';
import { ProgressDecompressor } from './progress-decompressor';
import { ProgressCompressor } from './progress-compressor';
import { AchievementCompressor } from './achievement-compressor';
import { ReviewCompressor } from './review-compressor';
import { ReviewDecompressor } from './review-decompressor';
import { SupabaseTrackingService } from './supabase-tracking.service';

/**
 * Supabase implementation of the database interface
 * Delegates tracking operations to SupabaseTrackingService
 */
@Injectable({
  providedIn: 'root'
})
export class SupabaseDatabase implements IDatabase {
  private supabase = supabaseClient;
  private trackingService = inject(SupabaseTrackingService);

  // User Profile Operations
  saveUserProfile(userId: string, profile: UserProfile): Observable<void> {
    return from(
      this.supabase
        .from('users')
        .upsert({
          id: userId,
          email: profile.email,
          display_name: profile.displayName,
          photo_url: profile.photoURL,
          created_at: profile.createdAt.toISOString(),
          last_login: profile.lastLogin.toISOString(),
          status: profile.status || 'Active'
        })
        .then(({ error }) => {
          if (error) throw error;
        })
    ).pipe(catchError(this.handleError));
  }

  loadUserProfile(userId: string): Observable<UserProfile | null> {
    return from(
      this.supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .maybeSingle()
        .then(({ data, error }) => {
          if (error) throw error;
          if (!data) return null;

          return {
            email: data.email,
            displayName: data.display_name,
            photoURL: data.photo_url,
            createdAt: new Date(data.created_at),
            lastLogin: new Date(data.last_login),
            status: data.status || 'Active'
          } as UserProfile;
        })
    ).pipe(catchError(this.handleError));
  }

  // Progress Operations
  saveProgress(userId: string, progress: UserProgress): Observable<void> {
    // Compress progress data before saving
    const compressed = ProgressCompressor.compress(progress);
    
    return from(
      this.supabase
        .from('user_progress')
        .upsert({
          user_id: userId,
          data: compressed,
          updated_at: new Date().toISOString()
        })
        .then(({ error }) => {
          if (error) throw error;
        })
    ).pipe(catchError(this.handleError));
  }

  loadProgress(userId: string): Observable<UserProgress | null> {
    return from(
      this.supabase
        .from('user_progress')
        .select('data')
        .eq('user_id', userId)
        .maybeSingle()
        .then(({ data, error }) => {
          if (error) throw error;
          if (!data?.data) return null;
          
          const progress = data.data as any;
          
          // Decompress exerciseHistory if in compressed format
          if (progress.exerciseHistory && ProgressDecompressor.isCompressed(progress.exerciseHistory)) {
            progress.exerciseHistory = ProgressDecompressor.decompressExerciseHistory(progress.exerciseHistory);
          }
          
          // Decompress dictationHistory if in compressed format
          if (progress.dictationHistory && ProgressDecompressor.isCompressed(progress.dictationHistory)) {
            progress.dictationHistory = ProgressDecompressor.decompressDictationHistory(progress.dictationHistory);
          }
          
          return progress as UserProgress;
        })
    ).pipe(catchError(this.handleError));
  }

  subscribeToProgress(
    userId: string,
    callback: (progress: UserProgress | null) => void
  ): UnsubscribeFunction {
    const channel = this.supabase
      .channel(`progress:${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_progress',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          if (payload.new && 'data' in payload.new) {
            const progress = payload.new['data'] as any;
            
            // Decompress exerciseHistory if in compressed format
            if (progress.exerciseHistory && ProgressDecompressor.isCompressed(progress.exerciseHistory)) {
              progress.exerciseHistory = ProgressDecompressor.decompressExerciseHistory(progress.exerciseHistory);
            }
            
            // Decompress dictationHistory if in compressed format
            if (progress.dictationHistory && ProgressDecompressor.isCompressed(progress.dictationHistory)) {
              progress.dictationHistory = ProgressDecompressor.decompressDictationHistory(progress.dictationHistory);
            }
            
            callback(progress as UserProgress);
          } else {
            callback(null);
          }
        }
      )
      .subscribe();

    return () => {
      this.supabase.removeChannel(channel);
    };
  }

  // Favorites Operations
  saveFavorites(userId: string, favorites: FavoriteData[]): Observable<void> {
    return from(
      this.supabase
        .from('user_favorites')
        .upsert({
          user_id: userId,
          // Use compressed format to save space
          favorites: favorites.map((f) => ({
            id: f.exerciseId,
            at: f.addedAt.toISOString()
          })),
          updated_at: new Date().toISOString()
        })
        .then(({ error }) => {
          if (error) throw error;
        })
    ).pipe(catchError(this.handleError));
  }

  loadFavorites(userId: string): Observable<FavoriteData[] | null> {
    return from(
      this.supabase
        .from('user_favorites')
        .select('favorites')
        .eq('user_id', userId)
        .maybeSingle()
        .then(({ data, error }) => {
          if (error) throw error;
          if (!data || !data.favorites || data.favorites.length === 0) return null;

          return data.favorites.map((f: any) => ({
            // Support both compressed (id, at) and full format (exercise_id, added_at)
            exerciseId: f.id || f.exercise_id,
            addedAt: new Date(f.at || f.added_at)
          }));
        })
    ).pipe(catchError(this.handleError));
  }

  subscribeToFavorites(
    userId: string,
    callback: (favorites: FavoriteData[] | null) => void
  ): UnsubscribeFunction {
    const channel = this.supabase
      .channel(`favorites:${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_favorites',
          filter: `user_id=eq.${userId}`
        },
        async () => {
          // Reload favorites
          const { data, error } = await this.supabase
            .from('user_favorites')
            .select('favorites')
            .eq('user_id', userId)
            .maybeSingle();

          if (error) {
            console.error('[SupabaseDatabase] Error loading favorites:', error);
            callback(null);
            return;
          }

          if (!data || !data.favorites || data.favorites.length === 0) {
            callback(null);
            return;
          }

          callback(
            data.favorites.map((f: any) => ({
              exerciseId: f.exercise_id,
              addedAt: new Date(f.added_at)
            }))
          );
        }
      )
      .subscribe();

    return () => {
      this.supabase.removeChannel(channel);
    };
  }

  // Custom Exercise Operations - REMOVED
  // Custom exercises are now stored in localStorage only
  // See CustomExerciseService for implementation

  // Achievement Operations
  saveAchievements(userId: string, data: UserAchievementData): Observable<void> {
    const compressed = AchievementCompressor.compress(data);
    return from(
      this.supabase
        .from('user_achievements')
        .upsert({
          user_id: userId,
          data: compressed,
          updated_at: new Date().toISOString()
        })
        .then(({ error }) => {
          if (error) throw error;
        })
    ).pipe(catchError(this.handleError));
  }

  loadAchievements(userId: string): Observable<UserAchievementData | null> {
    console.log('[SupabaseDatabase] Loading achievements for user:', userId);
    return from(
      this.supabase
        .from('user_achievements')
        .select('data')
        .eq('user_id', userId)
        .maybeSingle()
        .then(({ data, error }) => {
          if (error) {
            console.error('[SupabaseDatabase] Error loading achievements:', error);
            throw error;
          }
          
          if (!data) {
            console.log('[SupabaseDatabase] No achievement data found for user');
            return null;
          }

          console.log('[SupabaseDatabase] Raw achievement data:', data);
          const achievementData = data.data as any;

          // Decompress if in compressed format
          if (AchievementCompressor.isCompressed(achievementData)) {
            console.log('[SupabaseDatabase] Decompressing achievement data');
            const decompressed = AchievementCompressor.decompress(achievementData);
            console.log('[SupabaseDatabase] Decompressed:', {
              unlockedCount: decompressed.unlockedAchievements.length,
              claimedCount: decompressed.unlockedAchievements.filter(ua => ua.rewardsClaimed).length
            });
            return decompressed;
          }

          // Legacy format - convert date strings back to Date objects
          return {
            userId: achievementData.userId,
            unlockedAchievements: (achievementData.unlockedAchievements || []).map((ua: any) => ({
              achievementId: ua.achievementId,
              unlockedAt: new Date(ua.unlockedAt),
              rewardsClaimed: ua.rewardsClaimed ?? false
            })),
            progress: Object.keys(achievementData.progress || {}).reduce((acc, key) => {
              const progressData = achievementData.progress[key];
              acc[key] = {
                ...progressData,
                lastUpdated: new Date(progressData.lastUpdated)
              };
              return acc;
            }, {} as any),
            lastEvaluated: new Date(achievementData.lastEvaluated)
          } as UserAchievementData;
        })
    ).pipe(catchError(this.handleError));
  }

  // Reward Operations
  saveRewards(userId: string, rewards: UserRewards): Observable<void> {
    // Remove duplicates to keep data clean
    const uniqueThemes = [...new Set(rewards.themes)];
    const uniqueFrames = [...new Set(rewards.avatarFrames)];
    
    return from(
      this.supabase
        .from('user_rewards')
        .upsert({
          user_id: userId,
          themes: uniqueThemes,
          hints: rewards.hints,
          avatar_frames: uniqueFrames,
          updated_at: new Date().toISOString()
        })
        .then(({ error }) => {
          if (error) throw error;
        })
    ).pipe(catchError(this.handleError));
  }

  loadRewards(userId: string): Observable<UserRewards | null> {
    return from(
      this.supabase
        .from('user_rewards')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle()
        .then(({ data, error }) => {
          if (error) throw error;
          if (!data) return null;

          return {
            themes: data.themes || [],
            hints: data.hints || 0,
            avatarFrames: data.avatar_frames || []
          } as UserRewards;
        })
    ).pipe(catchError(this.handleError));
  }

  // Review Data Operations
  saveReviewData(userId: string, exerciseId: string, reviewData: ReviewData): Observable<void> {
    // Compress review data before saving
    const compressedData = ReviewCompressor.compress(reviewData);

    return from(
      this.supabase
        .from('user_reviews')
        .upsert(
          {
            user_id: userId,
            exercise_id: exerciseId,
            data: compressedData,
            updated_at: new Date().toISOString()
          },
          {
            onConflict: 'user_id,exercise_id'
          }
        )
        .then(({ error }) => {
          if (error) throw error;
        })
    ).pipe(catchError(this.handleError));
  }

  loadReviewData(userId: string, exerciseId: string): Observable<ReviewDataWithMetadata | null> {
    return from(
      this.supabase
        .from('user_reviews')
        .select('exercise_id, user_id, data, created_at, updated_at')
        .eq('user_id', userId)
        .eq('exercise_id', exerciseId)
        .maybeSingle()
        .then(({ data, error }) => {
          if (error) throw error;
          if (!data) return null;

          const reviewData = data.data as any;
          
          // Decompress if in compressed format
          const decompressed = ReviewCompressor.isCompressed(reviewData)
            ? ReviewDecompressor.decompress(reviewData)
            : {
                easinessFactor: reviewData.easinessFactor,
                interval: reviewData.interval,
                nextReviewDate: new Date(reviewData.nextReviewDate),
                repetitionCount: reviewData.repetitionCount,
                lastReviewDate: new Date(reviewData.lastReviewDate),
                lastScore: reviewData.lastScore,
                incorrectSentenceIndices: reviewData.incorrectSentenceIndices || []
              };
          
          // Merge with metadata from columns
          return {
            ...decompressed,
            exerciseId: data.exercise_id,
            userId: data.user_id,
            createdAt: new Date(data.created_at),
            updatedAt: new Date(data.updated_at)
          } as ReviewDataWithMetadata;
        })
    ).pipe(catchError(this.handleError));
  }

  loadAllReviewData(userId: string): Observable<ReviewDataWithMetadata[]> {
    return from(
      this.supabase
        .from('user_reviews')
        .select('exercise_id, user_id, data, created_at, updated_at')
        .eq('user_id', userId)
        .then(({ data, error }) => {
          if (error) throw error;
          if (!data) return [];

          return data.map((row) => {
            const reviewData = row.data as any;
            
            // Decompress if in compressed format
            const decompressed = ReviewCompressor.isCompressed(reviewData)
              ? ReviewDecompressor.decompress(reviewData)
              : {
                  easinessFactor: reviewData.easinessFactor,
                  interval: reviewData.interval,
                  nextReviewDate: new Date(reviewData.nextReviewDate),
                  repetitionCount: reviewData.repetitionCount,
                  lastReviewDate: new Date(reviewData.lastReviewDate),
                  lastScore: reviewData.lastScore,
                  incorrectSentenceIndices: reviewData.incorrectSentenceIndices || []
                };
            
            return {
              ...decompressed,
              exerciseId: row.exercise_id,
              userId: row.user_id,
              createdAt: new Date(row.created_at),
              updatedAt: new Date(row.updated_at)
            } as ReviewDataWithMetadata;
          });
        })
    ).pipe(catchError(this.handleError));
  }

  updateReviewSchedule(
    userId: string,
    exerciseId: string,
    nextReviewDate: Date,
    interval: number,
    easinessFactor: number
  ): Observable<void> {
    // Load existing review data, update it, and save back
    return from(
      this.supabase
        .from('user_reviews')
        .select('data')
        .eq('user_id', userId)
        .eq('exercise_id', exerciseId)
        .maybeSingle()
        .then(({ data, error }) => {
          if (error) throw error;
          if (!data) throw new Error('Review data not found');

          const reviewData = data.data as any;
          reviewData.nextReviewDate = nextReviewDate.toISOString();
          reviewData.interval = interval;
          reviewData.easinessFactor = easinessFactor;

          return this.supabase
            .from('user_reviews')
            .update({
              data: reviewData,
              updated_at: new Date().toISOString()
            })
            .eq('user_id', userId)
            .eq('exercise_id', exerciseId);
        })
        .then(({ error }) => {
          if (error) throw error;
        })
    ).pipe(catchError(this.handleError));
  }

  deleteReviewData(userId: string, exerciseId: string): Observable<void> {
    return from(
      this.supabase
        .from('user_reviews')
        .delete()
        .eq('user_id', userId)
        .eq('exercise_id', exerciseId)
        .then(({ error }) => {
          if (error) throw error;
        })
    ).pipe(catchError(this.handleError));
  }

  // Exercise History Operations (delegated to tracking service)
  insertExerciseHistory(record: ExerciseHistoryRecord): Observable<void> {
    return this.trackingService.insertExerciseHistory(record);
  }

  loadRecentHistory(userId: string, limit: number): Observable<ExerciseHistoryRecord[]> {
    return this.trackingService.loadRecentHistory(userId, limit);
  }

  loadExerciseHistory(userId: string, exerciseId: string): Observable<ExerciseHistoryRecord[]> {
    return this.trackingService.loadExerciseHistory(userId, exerciseId);
  }

  loadHistoryForDateRange(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Observable<ExerciseHistoryRecord[]> {
    return this.trackingService.loadHistoryForDateRange(userId, startDate, endDate);
  }

  // Error handling
  private handleError(error: any): Observable<never> {
    console.error('[SupabaseDatabase] Error:', error);

    if (error.code === 'PGRST301') {
      return throwError(() => new Error('Permission denied'));
    }

    if (error.message?.includes('network')) {
      return throwError(() => error);
    }

    return throwError(() => new Error('Database operation failed'));
  }

  // Learning Path Operations
  saveLearningPathProgress(userId: string, progress: UserPathProgress): Observable<void> {
    return from(
      this.supabase
        .from('learning_path_progress')
        .upsert({
          user_id: userId,
          current_path_id: progress.currentPathId,
          current_module_id: progress.currentModuleId,
          start_date: progress.startDate.toISOString(),
          completed_modules: progress.completedModules,
          module_progress: progress.moduleProgress,
          path_completions: progress.pathCompletions,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        })
        .then(({ error }) => {
          if (error) throw error;
        })
    ).pipe(catchError(this.handleError));
  }

  loadLearningPathProgress(userId: string): Observable<UserPathProgress | null> {
    return from(
      this.supabase
        .from('learning_path_progress')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle()
        .then(({ data, error }) => {
          if (error) throw error;
          if (!data) return null;

          return {
            userId: data.user_id,
            currentPathId: data.current_path_id,
            currentModuleId: data.current_module_id,
            startDate: new Date(data.start_date),
            completedModules: data.completed_modules || [],
            moduleProgress: data.module_progress || {},
            pathCompletions: data.path_completions || []
          } as UserPathProgress;
        })
    ).pipe(catchError(this.handleError));
  }

  // Daily Challenge Operations (delegated to tracking service)
  saveDailyChallenge(userId: string, challenge: DailyChallenge): Observable<void> {
    return this.trackingService.saveDailyChallenge(userId, challenge);
  }

  loadDailyChallenge(userId: string, challengeId: string): Observable<DailyChallenge | null> {
    return this.trackingService.loadDailyChallenge(userId, challengeId);
  }

  loadDailyChallengeByDate(userId: string, date: string): Observable<DailyChallenge | null> {
    return this.trackingService.loadDailyChallengeByDate(userId, date);
  }

  // Weekly Goal Operations (delegated to tracking service)
  saveWeeklyGoal(userId: string, goal: WeeklyGoal): Observable<void> {
    return this.trackingService.saveWeeklyGoal(userId, goal);
  }

  loadWeeklyGoal(userId: string, goalId: string): Observable<WeeklyGoal | null> {
    return this.trackingService.loadWeeklyGoal(userId, goalId);
  }

  loadWeeklyGoalByDate(userId: string, weekStartDate: string): Observable<WeeklyGoal | null> {
    return this.trackingService.loadWeeklyGoalByDate(userId, weekStartDate);
  }

  // User Operations
  checkUserExists(userId: string): Observable<boolean> {
    return from(
      this.supabase
        .from('users')
        .select('id')
        .eq('id', userId)
        .maybeSingle()
        .then(({ data, error }) => {
          if (error) throw error;
          return data !== null;
        })
    ).pipe(catchError(this.handleError));
  }

  getDatabaseSizeMB(): Observable<number> {
    return from(
      this.supabase
        .rpc('get_database_size_mb')
        .then(({ data, error }) => {
          if (error) throw error;
          return data as number;
        })
    ).pipe(catchError(this.handleError));
  }
}
