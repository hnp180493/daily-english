import { Injectable, computed, Signal } from '@angular/core';
import { ExerciseStateService } from './exercise-state.service';
import { ProgressService } from './progress.service';
import { PENALTY_CONSTANTS } from '../models/penalty.constants';

export interface PenaltyMetrics {
  baseScore: number;
  totalIncorrectAttempts: number;
  totalRetries: number;
  totalPenalty: number;
  finalScore: number;
}

export interface CurrentPenaltyMetrics {
  currentAverage: number;
  totalIncorrectAttempts: number;
  totalRetries: number;
  totalPenalty: number;
  currentScore: number;
}

@Injectable({
  providedIn: 'root'
})
export class ExercisePenaltyService {
  constructor(
    private stateService: ExerciseStateService,
    private progressService: ProgressService
  ) {}

  calculateCompletionPenalty(): PenaltyMetrics | null {
    const sentences = this.stateService.sentences();
    const penalties = this.stateService.getPenaltyMetrics();
    const completedSents = sentences.filter(s => s.isCompleted);
    
    if (completedSents.length === 0) return null;

    const avgAccuracy = completedSents.reduce((sum, s) => sum + (s.accuracyScore || 0), 0) / completedSents.length;
    const totalPenalty = (penalties.totalIncorrectAttempts * PENALTY_CONSTANTS.INCORRECT_ATTEMPT_PENALTY) +
      (penalties.totalRetries * PENALTY_CONSTANTS.RETRY_PENALTY);
    const finalScore = Math.max(0, Math.round(avgAccuracy - totalPenalty));

    return {
      baseScore: Math.round(avgAccuracy),
      totalIncorrectAttempts: penalties.totalIncorrectAttempts,
      totalRetries: penalties.totalRetries,
      totalPenalty,
      finalScore
    };
  }

  calculateCurrentPenalty(): CurrentPenaltyMetrics | null {
    const sents = this.stateService.sentences();
    const completedSents = sents.filter(s => s.isCompleted);

    if (completedSents.length === 0) return null;

    const avgAccuracy = completedSents.reduce((sum, s) => sum + (s.accuracyScore || 0), 0) / completedSents.length;
    const penalties = this.stateService.getPenaltyMetrics();
    const totalPenalty = (penalties.totalIncorrectAttempts * PENALTY_CONSTANTS.INCORRECT_ATTEMPT_PENALTY) +
      (penalties.totalRetries * PENALTY_CONSTANTS.RETRY_PENALTY);
    const currentScore = Math.max(0, avgAccuracy - totalPenalty);

    return {
      currentAverage: Math.round(avgAccuracy),
      totalIncorrectAttempts: penalties.totalIncorrectAttempts,
      totalRetries: penalties.totalRetries,
      totalPenalty,
      currentScore: Math.round(currentScore)
    };
  }

  getReviewModePenalty(exerciseId: string): PenaltyMetrics | null {
    const progress = this.progressService.getProgressSignal()();
    const attempt = progress.exerciseHistory[exerciseId];

    if (!attempt) return null;

    return {
      baseScore: attempt.baseScore ?? attempt.accuracyScore,
      totalIncorrectAttempts: attempt.totalIncorrectAttempts ?? 0,
      totalRetries: attempt.totalRetries ?? 0,
      totalPenalty: attempt.totalPenalty ?? 0,
      finalScore: attempt.accuracyScore
    };
  }
}
