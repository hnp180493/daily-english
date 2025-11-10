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

    // Collect previous translations as a single paragraph for context
    const translatedContext = sents
      .slice(0, currentIdx)
      .filter(s => s.isCompleted && s.translation)
      .map(s => s.translation)
      .join(' ');

    const tempExercise = {
      ...exercise,
      sourceText: currentSentence.original,
      fullContext: exercise.sourceText,
      translatedContext: translatedContext || undefined
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
            
            // Extract suggestion from feedback (always, regardless of score)
            let suggestion: string | undefined;
            if (response.feedback && response.feedback.length > 0) {
              const suggestionItem = response.feedback.find(f => f.type === 'suggestion');
              suggestion = suggestionItem?.suggestion || response.feedback[0]?.suggestion;
              
              // Log for debugging
              console.log('[Submission] Feedback received:', {
                score,
                feedbackCount: response.feedback.length,
                suggestion,
                allFeedback: response.feedback
              });
            }
            
            // Always mark sentence as completed with suggestion
            this.stateService.markSentenceCompleted(currentIdx, input, score, suggestion);
            
            if (score >= 90) {
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
