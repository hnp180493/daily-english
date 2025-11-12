import { Injectable } from '@angular/core';
import { Observable, from, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { supabaseClient } from '../supabase.client';
import { UserProgress, CustomExercise } from '../../models/exercise.model';
import { UserAchievementData } from '../../models/achievement.model';
import { ReviewData, ReviewDataWithMetadata } from '../../models/review.model';
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

  // Custom Exercise Operations
  saveCustomExercise(userId: string, exercise: CustomExercise): Observable<void> {
    return from(
      this.supabase
        .from('custom_exercises')
        .upsert({
          id: exercise.id,
          user_id: userId,
          data: exercise,
          created_at: exercise.createdAt.toISOString(),
          updated_at: exercise.updatedAt.toISOString()
        })
        .then(({ error }) => {
          if (error) throw error;
        })
    ).pipe(catchError(this.handleError));
  }

  loadCustomExercises(userId: string): Observable<CustomExercise[]> {
    return from(
      this.supabase
        .from('custom_exercises')
        .select('*')
        .eq('user_id', userId)
        .then(({ data, error }) => {
          if (error) throw error;
          if (!data) return [];

          return data.map((row) => {
            const exercise = row.data as CustomExercise;
            return {
              ...exercise,
              id: row.id,
              createdAt: new Date(row.created_at),
              updatedAt: new Date(row.updated_at)
            };
          });
        })
    ).pipe(catchError(this.handleError));
  }

  deleteCustomExercise(userId: string, exerciseId: string): Observable<void> {
    return from(
      this.supabase
        .from('custom_exercises')
        .delete()
        .eq('id', exerciseId)
        .eq('user_id', userId)
        .then(({ error }) => {
          if (error) throw error;
        })
    ).pipe(catchError(this.handleError));
  }

  subscribeToCustomExercises(
    userId: string,
    callback: (exercises: CustomExercise[]) => void
  ): UnsubscribeFunction {
    const channel = this.supabase
      .channel(`custom_exercises:${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'custom_exercises',
          filter: `user_id=eq.${userId}`
        },
        async () => {
          // Reload all exercises
          const { data, error } = await this.supabase
            .from('custom_exercises')
            .select('*')
            .eq('user_id', userId);

          if (error) {
            console.error('[SupabaseDatabase] Error loading custom exercises:', error);
            callback([]);
            return;
          }

          if (!data) {
            callback([]);
            return;
          }

          callback(
            data.map((row) => {
              const exercise = row.data as CustomExercise;
              return {
                ...exercise,
                id: row.id,
                createdAt: new Date(row.created_at),
                updatedAt: new Date(row.updated_at)
              };
            })
          );
        }
      )
      .subscribe();

    return () => {
      this.supabase.removeChannel(channel);
    };
  }

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
}
