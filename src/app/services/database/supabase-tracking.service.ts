import { Injectable } from '@angular/core';
import { Observable, from, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { supabaseTrackingClient } from '../supabase.client';
import { ExerciseHistoryRecord } from '../../models/exercise-history.model';
import { DailyChallenge } from '../../models/daily-challenge.model';
import { WeeklyGoal } from '../../models/weekly-goal.model';

/**
 * Supabase Tracking Database Service
 * Handles operations for tracking data stored in separate Supabase project:
 * - Exercise history
 * - Daily challenges
 * - Weekly goals
 */
@Injectable({
  providedIn: 'root'
})
export class SupabaseTrackingService {
  private supabase = supabaseTrackingClient;

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
          return data.map(this.mapExerciseHistoryRow);
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
          return data.map(this.mapExerciseHistoryRow);
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
          return data.map(this.mapExerciseHistoryRow);
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
          return this.mapDailyChallengeRow(data);
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
          return this.mapDailyChallengeRow(data);
        })
    ).pipe(catchError(this.handleError));
  }

  // Weekly Goal Operations
  saveWeeklyGoal(userId: string, goal: WeeklyGoal): Observable<void> {
    return from(
      this.supabase
        .from('weekly_goals')
        .upsert(
          {
            user_id: userId,
            week_start_date: goal.weekStartDate,
            target_exercises: goal.targetExercises,
            completed_exercises: goal.completedExercises,
            is_achieved: goal.isAchieved,
            bonus_points_earned: goal.bonusPointsEarned,
            updated_at: new Date().toISOString()
          },
          { onConflict: 'user_id,week_start_date' }
        )
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
          return this.mapWeeklyGoalRow(data);
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
          return this.mapWeeklyGoalRow(data);
        })
    ).pipe(catchError(this.handleError));
  }

  // Row mappers
  private mapExerciseHistoryRow(row: Record<string, unknown>): ExerciseHistoryRecord {
    return {
      id: row['id'] as string,
      userId: row['user_id'] as string,
      exerciseId: row['exercise_id'] as string,
      completedAt: new Date(row['completed_at'] as string),
      finalScore: row['final_score'] as number,
      timeSpentSeconds: row['time_spent_seconds'] as number,
      hintsUsed: row['hints_used'] as number,
      sentenceAttempts: row['sentence_attempts'] as ExerciseHistoryRecord['sentenceAttempts'],
      penaltyMetrics: row['penalty_metrics'] as ExerciseHistoryRecord['penaltyMetrics'],
      createdAt: new Date(row['created_at'] as string)
    };
  }

  private mapDailyChallengeRow(row: Record<string, unknown>): DailyChallenge {
    return {
      id: row['id'] as string,
      userId: row['user_id'] as string,
      date: row['date'] as string,
      exerciseId: row['exercise_id'] as string,
      isCompleted: row['is_completed'] as boolean,
      completedAt: row['completed_at'] ? new Date(row['completed_at'] as string) : undefined,
      score: row['score'] as number | undefined,
      bonusPoints: row['bonus_points'] as number,
      isWeekendChallenge: row['is_weekend_challenge'] as boolean
    };
  }

  private mapWeeklyGoalRow(row: Record<string, unknown>): WeeklyGoal {
    return {
      userId: row['user_id'] as string,
      weekStartDate: row['week_start_date'] as string,
      targetExercises: row['target_exercises'] as number,
      completedExercises: row['completed_exercises'] as number,
      isAchieved: row['is_achieved'] as boolean,
      bonusPointsEarned: row['bonus_points_earned'] as number
    };
  }

  // Error handling
  private handleError(error: unknown): Observable<never> {
    console.error('[SupabaseTracking] Error:', error);

    const err = error as { code?: string; message?: string };
    if (err.code === 'PGRST301') {
      return throwError(() => new Error('Permission denied'));
    }

    if (err.message?.includes('network')) {
      return throwError(() => error);
    }

    return throwError(() => new Error('Tracking database operation failed'));
  }
}
