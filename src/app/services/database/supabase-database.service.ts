import { Injectable } from '@angular/core';
import { Observable, from, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { supabaseClient } from '../supabase.client';
import { UserProgress, CustomExercise } from '../../models/exercise.model';
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

/**
 * Supabase implementation of the database interface
 */
@Injectable({
  providedIn: 'root'
})
export class SupabaseDatabase implements IDatabase {
  private supabase = supabaseClient;

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
          last_login: profile.lastLogin.toISOString()
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
            lastLogin: new Date(data.last_login)
          } as UserProfile;
        })
    ).pipe(catchError(this.handleError));
  }

  // Progress Operations
  saveProgress(userId: string, progress: UserProgress): Observable<void> {
    return from(
      this.supabase
        .from('user_progress')
        .upsert({
          user_id: userId,
          data: progress,
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
          return data?.data as UserProgress | null;
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
            callback(payload.new['data'] as UserProgress);
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
          favorites: favorites.map((f) => ({
            exercise_id: f.exerciseId,
            added_at: f.addedAt.toISOString()
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
            exerciseId: f.exercise_id,
            addedAt: new Date(f.added_at)
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
    return from(
      this.supabase
        .from('user_achievements')
        .upsert({
          user_id: userId,
          data: data,
          updated_at: new Date().toISOString()
        })
        .then(({ error }) => {
          if (error) throw error;
        })
    ).pipe(catchError(this.handleError));
  }

  loadAchievements(userId: string): Observable<UserAchievementData | null> {
    return from(
      this.supabase
        .from('user_achievements')
        .select('data')
        .eq('user_id', userId)
        .maybeSingle()
        .then(({ data, error }) => {
          if (error) throw error;
          if (!data) return null;

          const achievementData = data.data as any;

          // Convert date strings back to Date objects
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
    return from(
      this.supabase
        .from('user_rewards')
        .upsert({
          user_id: userId,
          themes: rewards.themes,
          hints: rewards.hints,
          avatar_frames: rewards.avatarFrames,
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
    // Clean up reviewData to remove metadata fields that shouldn't be in data column
    const cleanReviewData = {
      easinessFactor: reviewData.easinessFactor,
      interval: reviewData.interval,
      nextReviewDate: reviewData.nextReviewDate,
      repetitionCount: reviewData.repetitionCount,
      lastReviewDate: reviewData.lastReviewDate,
      lastScore: reviewData.lastScore,
      incorrectSentenceIndices: reviewData.incorrectSentenceIndices || []
    };

    return from(
      this.supabase
        .from('user_reviews')
        .upsert(
          {
            user_id: userId,
            exercise_id: exerciseId,
            data: cleanReviewData,
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
          // Convert date strings back to Date objects and merge with metadata from columns
          return {
            ...reviewData,
            exerciseId: data.exercise_id,
            userId: data.user_id,
            nextReviewDate: new Date(reviewData.nextReviewDate),
            lastReviewDate: new Date(reviewData.lastReviewDate),
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
            return {
              ...reviewData,
              exerciseId: row.exercise_id,
              userId: row.user_id,
              nextReviewDate: new Date(reviewData.nextReviewDate),
              lastReviewDate: new Date(reviewData.lastReviewDate),
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

  // Exercise History Operations
  insertExerciseHistory(record: ExerciseHistoryRecord): Observable<void> {
    return from(
      this.supabase
        .from('user_exercise_history')
        .insert({
          user_id: record.userId,
          exercise_id: record.exerciseId,
          completed_at: record.completedAt.toISOString(),
          final_score: record.finalScore,
          time_spent_seconds: record.timeSpentSeconds,
          hints_used: record.hintsUsed,
          sentence_attempts: record.sentenceAttempts,
          penalty_metrics: record.penaltyMetrics
        })
        .then(({ error }) => {
          if (error) throw error;
        })
    ).pipe(catchError(this.handleError));
  }

  loadRecentHistory(userId: string, limit: number): Observable<ExerciseHistoryRecord[]> {
    return from(
      this.supabase
        .from('user_exercise_history')
        .select('*')
        .eq('user_id', userId)
        .order('completed_at', { ascending: false })
        .limit(limit)
        .then(({ data, error }) => {
          if (error) throw error;
          if (!data) return [];

          return data.map((row) => ({
            id: row.id,
            userId: row.user_id,
            exerciseId: row.exercise_id,
            completedAt: new Date(row.completed_at),
            finalScore: row.final_score,
            timeSpentSeconds: row.time_spent_seconds,
            hintsUsed: row.hints_used,
            sentenceAttempts: row.sentence_attempts,
            penaltyMetrics: row.penalty_metrics,
            createdAt: new Date(row.created_at)
          }));
        })
    ).pipe(catchError(this.handleError));
  }

  loadExerciseHistory(userId: string, exerciseId: string): Observable<ExerciseHistoryRecord[]> {
    return from(
      this.supabase
        .from('user_exercise_history')
        .select('*')
        .eq('user_id', userId)
        .eq('exercise_id', exerciseId)
        .order('completed_at', { ascending: false })
        .then(({ data, error }) => {
          if (error) throw error;
          if (!data) return [];

          return data.map((row) => ({
            id: row.id,
            userId: row.user_id,
            exerciseId: row.exercise_id,
            completedAt: new Date(row.completed_at),
            finalScore: row.final_score,
            timeSpentSeconds: row.time_spent_seconds,
            hintsUsed: row.hints_used,
            sentenceAttempts: row.sentence_attempts,
            penaltyMetrics: row.penalty_metrics,
            createdAt: new Date(row.created_at)
          }));
        })
    ).pipe(catchError(this.handleError));
  }

  loadHistoryForDateRange(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Observable<ExerciseHistoryRecord[]> {
    return from(
      this.supabase
        .from('user_exercise_history')
        .select('*')
        .eq('user_id', userId)
        .gte('completed_at', startDate.toISOString())
        .lte('completed_at', endDate.toISOString())
        .order('completed_at', { ascending: false })
        .then(({ data, error }) => {
          if (error) throw error;
          if (!data) return [];

          return data.map((row) => ({
            id: row.id,
            userId: row.user_id,
            exerciseId: row.exercise_id,
            completedAt: new Date(row.completed_at),
            finalScore: row.final_score,
            timeSpentSeconds: row.time_spent_seconds,
            hintsUsed: row.hints_used,
            sentenceAttempts: row.sentence_attempts,
            penaltyMetrics: row.penalty_metrics,
            createdAt: new Date(row.created_at)
          }));
        })
    ).pipe(catchError(this.handleError));
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

  // Daily Challenge Operations
  saveDailyChallenge(userId: string, challenge: DailyChallenge): Observable<void> {
    return from(
      this.supabase
        .from('daily_challenges')
        .upsert({
          id: challenge.id,
          user_id: userId,
          date: challenge.date,
          exercise_id: challenge.exerciseId,
          is_completed: challenge.isCompleted,
          completed_at: challenge.completedAt?.toISOString(),
          score: challenge.score,
          bonus_points: challenge.bonusPoints,
          is_weekend_challenge: challenge.isWeekendChallenge
        })
        .then(({ error }) => {
          if (error) throw error;
        })
    ).pipe(catchError(this.handleError));
  }

  loadDailyChallenge(userId: string, challengeId: string): Observable<DailyChallenge | null> {
    return from(
      this.supabase
        .from('daily_challenges')
        .select('*')
        .eq('user_id', userId)
        .eq('id', challengeId)
        .maybeSingle()
        .then(({ data, error }) => {
          if (error) throw error;
          if (!data) return null;

          return {
            id: data.id,
            userId: data.user_id,
            date: data.date,
            exerciseId: data.exercise_id,
            isCompleted: data.is_completed,
            completedAt: data.completed_at ? new Date(data.completed_at) : undefined,
            score: data.score,
            bonusPoints: data.bonus_points,
            isWeekendChallenge: data.is_weekend_challenge
          } as DailyChallenge;
        })
    ).pipe(catchError(this.handleError));
  }

  loadDailyChallengeByDate(userId: string, date: string): Observable<DailyChallenge | null> {
    return from(
      this.supabase
        .from('daily_challenges')
        .select('*')
        .eq('user_id', userId)
        .eq('date', date)
        .maybeSingle()
        .then(({ data, error }) => {
          if (error) throw error;
          if (!data) return null;

          return {
            id: data.id,
            userId: data.user_id,
            date: data.date,
            exerciseId: data.exercise_id,
            isCompleted: data.is_completed,
            completedAt: data.completed_at ? new Date(data.completed_at) : undefined,
            score: data.score,
            bonusPoints: data.bonus_points,
            isWeekendChallenge: data.is_weekend_challenge
          } as DailyChallenge;
        })
    ).pipe(catchError(this.handleError));
  }

  // Weekly Goal Operations
  saveWeeklyGoal(userId: string, goal: WeeklyGoal): Observable<void> {
    return from(
      this.supabase
        .from('weekly_goals')
        .upsert({
          user_id: userId,
          week_start_date: goal.weekStartDate,
          target_exercises: goal.targetExercises,
          completed_exercises: goal.completedExercises,
          is_achieved: goal.isAchieved,
          bonus_points_earned: goal.bonusPointsEarned,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,week_start_date'
        })
        .then(({ error }) => {
          if (error) throw error;
        })
    ).pipe(catchError(this.handleError));
  }

  loadWeeklyGoal(userId: string, goalId: string): Observable<WeeklyGoal | null> {
    return from(
      this.supabase
        .from('weekly_goals')
        .select('*')
        .eq('user_id', userId)
        .eq('id', goalId)
        .maybeSingle()
        .then(({ data, error }) => {
          if (error) throw error;
          if (!data) return null;

          return {
            userId: data.user_id,
            weekStartDate: data.week_start_date,
            targetExercises: data.target_exercises,
            completedExercises: data.completed_exercises,
            isAchieved: data.is_achieved,
            bonusPointsEarned: data.bonus_points_earned
          } as WeeklyGoal;
        })
    ).pipe(catchError(this.handleError));
  }

  loadWeeklyGoalByDate(userId: string, weekStartDate: string): Observable<WeeklyGoal | null> {
    return from(
      this.supabase
        .from('weekly_goals')
        .select('*')
        .eq('user_id', userId)
        .eq('week_start_date', weekStartDate)
        .maybeSingle()
        .then(({ data, error }) => {
          if (error) throw error;
          if (!data) return null;

          return {
            userId: data.user_id,
            weekStartDate: data.week_start_date,
            targetExercises: data.target_exercises,
            completedExercises: data.completed_exercises,
            isAchieved: data.is_achieved,
            bonusPointsEarned: data.bonus_points_earned
          } as WeeklyGoal;
        })
    ).pipe(catchError(this.handleError));
  }

  // User Count Operations
  getTotalUserCount(): Observable<number> {
    return from(
      this.supabase
        .rpc('get_total_user_count')
        .then(({ data, error }) => {
          if (error) throw error;
          return data as number;
        })
    ).pipe(catchError(this.handleError));
  }

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
}
