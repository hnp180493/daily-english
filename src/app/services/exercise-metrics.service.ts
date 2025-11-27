import { Injectable, inject, computed, Signal } from '@angular/core';
import { Exercise } from '../models/exercise.model';
import { ProgressService } from './progress.service';
import { ExerciseValidationService } from './exercise-validation.service';
import { ExercisePenaltyService } from './exercise-penalty.service';
import { FavoriteService } from './favorite.service';

export interface ExerciseStatus {
  status: 'new' | 'attempted';
  attemptCount: number;
  bestScore?: number;
  perfectCompletions: number;
}

@Injectable({
  providedIn: 'root'
})
export class ExerciseMetricsService {
  private progressService = inject(ProgressService);
  private validationService = inject(ExerciseValidationService);
  private penaltyService = inject(ExercisePenaltyService);
  private favoriteService = inject(FavoriteService);

  private progressSignal = this.progressService.getProgressSignal();

  getExerciseStatus(exercise: Exercise | null): ExerciseStatus | null {
    if (!exercise) return null;

    const progress = this.progressSignal();
    const attempt = progress.exerciseHistory[exercise.id];

    if (!attempt) {
      return { status: 'new', attemptCount: 0, perfectCompletions: 0 };
    }

    return {
      status: 'attempted',
      attemptCount: attempt.attemptNumber,
      bestScore: attempt.accuracyScore,
      perfectCompletions: attempt.accuracyScore === 100 ? 1 : 0
    };
  }

  getExercisePoints(exercise: Exercise | null, status: ExerciseStatus | null): number {
    if (!exercise || !status) return 0;
    return this.validationService.calculateExercisePoints(exercise, status.attemptCount);
  }

  getPenaltyMetrics(
    exercise: Exercise | null,
    isExerciseComplete: boolean,
    isReviewMode: boolean
  ) {
    if (!exercise) return null;

    if (isExerciseComplete) {
      return this.penaltyService.calculateCompletionPenalty();
    }

    if (isReviewMode) {
      return this.penaltyService.getReviewModePenalty(exercise.id);
    }

    return null;
  }

  getCurrentPenaltyMetrics(isReviewMode: boolean) {
    if (isReviewMode) return null;
    return this.penaltyService.calculateCurrentPenalty();
  }

  isFavorite(exerciseId: string): boolean {
    return this.favoriteService.isFavorite(exerciseId);
  }

  getPoints(): number {
    return this.progressSignal().totalPoints;
  }

  getStreak(): number {
    this.progressSignal();
    return this.progressService.calculateStreak();
  }

  getAchievements() {
    return this.progressSignal().achievements;
  }
}
