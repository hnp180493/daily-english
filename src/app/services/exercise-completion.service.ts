import { Injectable, inject } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { Exercise } from '../models/exercise.model';
import { ExerciseStateService } from './exercise-state.service';
import { ExerciseRecordingService } from './exercise-recording.service';
import { ExerciseHistoryService } from './exercise-history.service';
import { CurriculumService } from './curriculum.service';
import { StreakService } from './streak.service';
import { AnalyticsService } from './analytics.service';
import { ExercisePersistenceService } from './exercise-persistence.service';
import { PENALTY_CONSTANTS } from '../models/penalty.constants';
import { getTodayLocalDate } from '../utils/date.utils';

export interface CompletionResult {
  finalScore: number;
  baseScore: number;
  totalPenalty: number;
  totalPoints: number;
  bonusPoints: number;
}

@Injectable({
  providedIn: 'root'
})
export class ExerciseCompletionService {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private stateService = inject(ExerciseStateService);
  private recordingService = inject(ExerciseRecordingService);
  private historyService = inject(ExerciseHistoryService);
  private curriculumService = inject(CurriculumService);
  private streakService = inject(StreakService);
  private analyticsService = inject(AnalyticsService);
  private persistenceService = inject(ExercisePersistenceService);

  completeExercise(
    exercise: Exercise,
    isCustom: boolean,
    exercisePoints: number,
    hintsShown: number,
    exerciseStartTime: Date | null,
    shouldAwardPoints: boolean = true
  ): CompletionResult {
    const sentences = this.stateService.sentences();
    const penalties = this.stateService.getPenaltyMetrics();
    
    // Calculate scores
    const completedSents = sentences.filter(s => s.isCompleted);
    const avgAccuracy = completedSents.length > 0
      ? completedSents.reduce((sum, s) => sum + (s.accuracyScore || 0), 0) / completedSents.length
      : 0;
    
    const totalPenalty = (penalties.totalIncorrectAttempts * PENALTY_CONSTANTS.INCORRECT_ATTEMPT_PENALTY) +
      (penalties.totalRetries * PENALTY_CONSTANTS.RETRY_PENALTY);
    
    const finalScore = Math.max(0, Math.round(avgAccuracy - totalPenalty));
    const baseScore = Math.round(avgAccuracy);

    let totalPoints = 0;
    let bonusPoints = 0;

    // Only save to cloud for regular exercises and when points should be awarded
    if (!isCustom && shouldAwardPoints) {
      const streakMultiplier = this.streakService.getStreakMultiplier();
      bonusPoints = streakMultiplier > 1.0 ? Math.round(exercisePoints * (streakMultiplier - 1.0)) : 0;
      totalPoints = exercisePoints + bonusPoints;

      // Record attempt
      this.recordingService.recordAttempt(exercise, hintsShown, totalPoints);

      // Update learning path
      this.curriculumService.updateModuleProgress(exercise.id, finalScore, totalPoints).subscribe({
        error: (err) => console.warn('[Completion] Module progress update failed:', err)
      });

      // Check daily challenge
      const today = getTodayLocalDate();
      this.curriculumService.checkAndCompleteDailyChallenge(exercise.id, today, finalScore).subscribe({
        error: (err) => console.warn('[Completion] Daily challenge check failed:', err)
      });

      // Update weekly goal
      this.curriculumService.incrementWeeklyGoalProgress(finalScore).subscribe({
        error: (err) => console.warn('[Completion] Weekly goal update failed:', err)
      });

      // Record history
      const timeSpent = exerciseStartTime
        ? Math.floor((new Date().getTime() - exerciseStartTime.getTime()) / 1000)
        : 0;

      const penaltyMetrics = {
        baseScore,
        totalIncorrectAttempts: penalties.totalIncorrectAttempts,
        totalRetries: penalties.totalRetries,
        totalPenalty,
        finalScore
      };

      this.historyService.recordExerciseAttempt(
        exercise.id,
        finalScore,
        timeSpent,
        hintsShown,
        sentences,
        penaltyMetrics
      ).subscribe({
        error: (err) => console.warn('[Completion] History recording failed:', err)
      });

      // Track analytics
      this.analyticsService.trackExerciseComplete(exercise.id, {
        completionTime: timeSpent,
        score: finalScore,
        accuracy: avgAccuracy,
        hintsUsed: hintsShown
      });
    }

    // Clear progress and switch to review mode
    this.persistenceService.clearProgress(exercise.id);

    return {
      finalScore,
      baseScore,
      totalPenalty,
      totalPoints,
      bonusPoints
    };
  }

  navigateToReviewMode(route: ActivatedRoute): void {
    this.router.navigate([], {
      relativeTo: route,
      queryParams: { mode: 'review' },
      queryParamsHandling: 'merge',
      replaceUrl: true
    });
  }
}
