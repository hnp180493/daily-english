import { Injectable, inject, signal } from '@angular/core';
import { Observable } from 'rxjs';
import { AIService } from './ai/ai.service';
import { ExerciseStateService } from './exercise-state.service';
import { ExerciseValidationService } from './exercise-validation.service';
import { ExercisePersistenceService } from './exercise-persistence.service';
import { ReviewService } from './review.service';
import { ExerciseQuickReviewService } from './exercise-quick-review.service';
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
  private reviewService = inject(ReviewService);
  private quickReviewService = inject(ExerciseQuickReviewService);

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
      this.userInputAfterSubmit.set(input);
      this.aiService.analyzeTranslationStream(input, tempExercise).subscribe({
        next: (chunk) => {
          if (chunk.type === 'score' && chunk.data?.accuracyScore !== undefined) {
            this.accuracyScore.set(chunk.data.accuracyScore);
          } else if (chunk.type === 'feedback' && chunk.feedbackItem) {
            this.feedback.update(items => [...(items || []), chunk.feedbackItem!]);
          } else if (chunk.type === 'complete' && chunk.data) {
            this.isStreaming.set(false);
            const response = chunk.data;
            
            // Keep streamed feedback if available, otherwise use complete response
            const currentFeedback = this.feedback();
            if (!currentFeedback || currentFeedback.length === 0) {
              this.feedback.set(response.feedback ?? null);
            }
            
            // Update score from complete response if available
            if (response.accuracyScore !== undefined && response.accuracyScore > 0) {
              this.accuracyScore.set(response.accuracyScore);
            }

            // Use the score we already have (from streaming or complete response)
            const score = this.accuracyScore();

            // Extract suggestion from feedback (use streamed feedback if available)
            let suggestion: string | undefined;
            const feedbackToUse = this.feedback() || response.feedback;
            if (feedbackToUse && feedbackToUse.length > 0) {
              const suggestionItem = feedbackToUse.find(f => f.type === 'suggestion');
              suggestion = suggestionItem?.suggestion || feedbackToUse[0]?.suggestion;

              // Log for debugging
              console.log('[Submission] Feedback received:', {
                score,
                feedbackCount: feedbackToUse.length,
                suggestion,
                allFeedback: feedbackToUse
              });
            }

            // Always mark sentence as completed with suggestion
            this.stateService.markSentenceCompleted(currentIdx, input, score, suggestion);

            // Check if all sentences are now completed
            const sentences = this.stateService.sentences();
            const allCompleted = sentences.every(s => s.isCompleted);
            const isQuickReview = this.quickReviewService.quickReviewMode();
            
            // Don't save to DB in quick review mode - it's just practice
            if (allCompleted && !isQuickReview) {
              // Calculate average score from all completed sentences
              const avgScore = sentences.reduce((sum, s) => sum + (s.accuracyScore || 0), 0) / sentences.length;
              
              console.log(`[Submission] All sentences completed! Scheduling next review for ${exerciseId} with avg score ${avgScore.toFixed(2)}%`);
              this.reviewService.scheduleNextReview(exerciseId, avgScore);
            }

            // Handle auto-advance for score 100
            if (score === 100) {
              if (isQuickReview) {
                // Quick review: find next incorrect sentence
                const nextIncorrectIdx = this.quickReviewService.getNextIncorrectIndex(currentIdx);
                const wasLastSentence = nextIncorrectIdx === null;
                
                // Always mark current sentence to show translation
                this.stateService.sentences.update(sentences => {
                  const updated = [...sentences];
                  if (currentIdx < updated.length) {
                    updated[currentIdx] = { ...updated[currentIdx], showTranslation: true };
                  }
                  return updated;
                });
                
                if (nextIncorrectIdx !== null) {
                  // Jump to next incorrect sentence
                  this.stateService.currentSentenceIndex.set(nextIncorrectIdx);
                  this.stateService.resetSentenceState();
                }
                
                this.feedback.set(null);
                observer.next({ autoAdvance: true, wasLastSentence });
              } else {
                // Normal mode: advance to next sentence sequentially
                const wasLastSentence = (currentIdx + 1) >= this.stateService.sentences().length;
                this.stateService.moveToNextSentence();
                this.feedback.set(null);
                observer.next({ autoAdvance: true, wasLastSentence });
              }
            }
            
            // Save progress for normal mode with score >= 90
            if (score >= 90 && !isQuickReview) {
              this.persistenceService.saveProgress(exerciseId, this.stateService.getState());
            }

            // this.userInputAfterSubmit.set(input);
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
