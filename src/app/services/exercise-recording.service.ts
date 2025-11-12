import { Injectable, inject } from '@angular/core';
import { Exercise, ExerciseAttempt, FeedbackItem } from '../models/exercise.model';
import { ProgressService } from './progress.service';
import { ExerciseValidationService } from './exercise-validation.service';
import { PointsAnimationService } from './points-animation.service';
import { ExerciseStateService } from './exercise-state.service';
import { PENALTY_CONSTANTS } from '../models/penalty.constants';

@Injectable({
  providedIn: 'root'
})
export class ExerciseRecordingService {
  private progressService = inject(ProgressService);
  private validationService = inject(ExerciseValidationService);
  private pointsAnimationService = inject(PointsAnimationService);
  private stateService = inject(ExerciseStateService);



  recordAttempt(exercise: Exercise, hintsUsed: number, pointsEarned: number): void {
    const status = this.progressService.getExerciseStatus(exercise.id);
    const sents = this.stateService.sentences();

    // Calculate base score (average of all sentence accuracy scores)
    const accuracyScores = sents.map(s => s.accuracyScore || 0);
    const baseScore = this.validationService.calculateAverageAccuracy(accuracyScores);
    const fullTranslation = sents.map(s => s.translation).join(' ');

    // Get penalty metrics
    const penaltyMetrics = this.stateService.getPenaltyMetrics();
    const totalIncorrectAttempts = penaltyMetrics.totalIncorrectAttempts;
    const totalRetries = penaltyMetrics.totalRetries;

    // Calculate total penalty: (incorrectAttempts × PENALTY) + (retries × PENALTY)
    const totalPenalty = (totalIncorrectAttempts * PENALTY_CONSTANTS.INCORRECT_ATTEMPT_PENALTY) + 
                        (totalRetries * PENALTY_CONSTANTS.RETRY_PENALTY);

    // Calculate final score: max(0, baseScore - totalPenalty)
    const finalScore = Math.max(0, baseScore - totalPenalty);

    const sentenceAttempts = sents.map((s, index) => {
      const feedback: FeedbackItem[] = [];
      
      if (s.suggestion) {
        feedback.push({
          // type: 'suggestion',
          // originalText: s.translation,
          suggestion: s.suggestion,
          // explanation: 'AI-generated suggestion for improvement',
          // startIndex: 0,
          // endIndex: s.translation.length
        } as FeedbackItem);
      }
      
      return {
        sentenceIndex: index,
        userInput: s.translation,
        accuracyScore: s.accuracyScore || 0,
        feedback,
        incorrectAttempts: s.incorrectAttempts || 0,
        retryCount: s.retryCount || 0
      };
    });

    const attempt: ExerciseAttempt = {
      exerciseId: exercise.id,
      category: exercise.category,
      attemptNumber: status.attemptCount + 1,
      userInput: fullTranslation,
      accuracyScore: finalScore,
      baseScore,
      totalIncorrectAttempts,
      totalRetries,
      totalPenalty,
      pointsEarned,
      feedback: [],
      timestamp: new Date(),
      hintsUsed,
      sentenceAttempts
    };

    if (pointsEarned > 0) {
      setTimeout(() => {
        const pointsElement = document.querySelector('.stat-item');
        if (pointsElement) {
          this.pointsAnimationService.triggerPointsAnimation(pointsEarned, pointsElement as HTMLElement)
            .then(() => {
              this.progressService.recordAttempt(attempt);
              console.log('Attempt recorded after animation:', attempt);
            });
        } else {
          this.progressService.recordAttempt(attempt);
          console.log('Attempt recorded (no animation):', attempt);
        }
      }, 500);
    } else {
      this.progressService.recordAttempt(attempt);
      console.log('Attempt recorded (no points):', attempt);
    }
  }
}
