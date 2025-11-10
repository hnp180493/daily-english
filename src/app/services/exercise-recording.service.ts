import { Injectable, inject, signal } from '@angular/core';
import { Exercise, ExerciseAttempt, FeedbackItem } from '../models/exercise.model';
import { ProgressService } from './progress.service';
import { ExerciseValidationService } from './exercise-validation.service';
import { PointsAnimationService } from './points-animation.service';
import { ExerciseStateService } from './exercise-state.service';

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

    const accuracyScores = sents.map(s => s.accuracyScore || 0);
    const avgAccuracy = this.validationService.calculateAverageAccuracy(accuracyScores);
    const fullTranslation = sents.map(s => s.translation).join(' ');

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
        feedback
      };
    });

    const attempt: ExerciseAttempt = {
      exerciseId: exercise.id,
      category: exercise.category,
      attemptNumber: status.attemptCount + 1,
      userInput: fullTranslation,
      accuracyScore: avgAccuracy,
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
