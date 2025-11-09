import { Injectable, inject, signal } from '@angular/core';
import { Observable } from 'rxjs';
import { AIService } from './ai/ai.service';
import { ExerciseStateService } from './exercise-state.service';
import { ExerciseValidationService } from './exercise-validation.service';
import { ExercisePersistenceService } from './exercise-persistence.service';
import { Exercise, FeedbackItem } from '../models/exercise.model';

export interface SubmissionResult {
  accuracyScore: number;
  feedback: FeedbackItem[];
  isComplete: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class ExerciseSubmissionService {
  private aiService = inject(AIService);
  private stateService = inject(ExerciseStateService);
  private validationService = inject(ExerciseValidationService);
  private persistenceService = inject(ExercisePersistenceService);

  isSubmitting = signal(false);
  isStreaming = signal(false);
  feedback = signal<FeedbackItem[] | null>(null);
  accuracyScore = signal(0);
  userInputAfterSubmit = signal('');

  submitTranslation(exercise: Exercise, exerciseId: string): Observable<any> {
    const currentIdx = this.stateService.currentSentenceIndex();
    const sents = this.stateService.sentences();
    let input = this.stateService.userInput().trim();

    if (!input || currentIdx >= sents.length) {
      throw new Error('Invalid submission');
    }

    this.isSubmitting.set(true);
    this.isStreaming.set(true);
    this.feedback.set(null);
    this.accuracyScore.set(0);

    const currentSentence = sents[currentIdx];
    input = this.validationService.addSmartPunctuation(input, currentSentence.original);

    const tempExercise = {
      ...exercise,
      sourceText: currentSentence.original,
      fullContext: exercise.sourceText
    };

    return new Observable(observer => {
      this.aiService.analyzeTranslationStream(input, tempExercise).subscribe({
        next: (chunk) => {
          if (chunk.type === 'score' && chunk.data?.accuracyScore !== undefined) {
            this.accuracyScore.set(chunk.data.accuracyScore);
          } else if (chunk.type === 'feedback' && chunk.feedbackItem) {
            this.feedback.update(items => [...(items || []), chunk.feedbackItem!]);
          } else if (chunk.type === 'complete' && chunk.data) {
            this.isStreaming.set(false);
            const response = chunk.data;
            this.feedback.set(response.feedback ?? null);
            this.accuracyScore.set(response.accuracyScore ?? 0);

            const score = response.accuracyScore ?? 0;
            if (score >= 90) {
              this.stateService.markSentenceCompleted(currentIdx, input, score);
              this.persistenceService.saveProgress(exerciseId, this.stateService.getState());

              if (score === 100) {
                const wasLastSentence = (currentIdx + 1) >= this.stateService.sentences().length;
                this.stateService.moveToNextSentence();
                this.feedback.set(null);

                observer.next({ autoAdvance: true, wasLastSentence });
              }
            }

            this.userInputAfterSubmit.set(input);
            this.stateService.userInput.set('');
            this.isSubmitting.set(false);

            observer.next({ complete: true, score });
            observer.complete();
          }
        },
        error: (error) => {
          this.isSubmitting.set(false);
          this.isStreaming.set(false);
          observer.error(error);
        }
      });
    });
  }

  reset(): void {
    this.isSubmitting.set(false);
    this.isStreaming.set(false);
    this.feedback.set(null);
    this.accuracyScore.set(0);
    this.userInputAfterSubmit.set('');
  }
}
