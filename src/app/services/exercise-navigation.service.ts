import { Injectable, inject } from '@angular/core';
import { ExerciseStateService } from './exercise-state.service';
import { ExerciseSubmissionService } from './exercise-submission.service';
import { ExerciseQuickReviewService } from './exercise-quick-review.service';

@Injectable({
  providedIn: 'root'
})
export class ExerciseNavigationService {
  private stateService = inject(ExerciseStateService);
  private submissionService = inject(ExerciseSubmissionService);
  private quickReviewService = inject(ExerciseQuickReviewService);

  moveToNextSentence(
    onComplete: () => void,
    onContinue: () => void
  ): void {
    const currentIdx = this.stateService.currentSentenceIndex();
    const allSentences = this.stateService.sentences();
    
    if (this.quickReviewService.quickReviewMode()) {
      this.handleQuickReviewNext(currentIdx, onComplete, onContinue);
    } else {
      this.handleNormalNext(currentIdx, allSentences.length, onComplete, onContinue);
    }
  }

  skipToNextSentence(
    onComplete: () => void,
    onContinue: () => void
  ): void {
    const currentIdx = this.stateService.currentSentenceIndex();
    const allSentences = this.stateService.sentences();
    
    this.submissionService.userInputAfterSubmit.set('');
    
    if (this.quickReviewService.quickReviewMode()) {
      this.handleQuickReviewNext(currentIdx, onComplete, onContinue);
    } else {
      this.handleNormalNext(currentIdx, allSentences.length, onComplete, onContinue);
    }
  }

  private handleQuickReviewNext(
    currentIdx: number,
    onComplete: () => void,
    onContinue: () => void
  ): void {
    const nextIncorrectIdx = this.quickReviewService.getNextIncorrectIndex(currentIdx);
    
    if (nextIncorrectIdx !== null) {
      this.stateService.currentSentenceIndex.set(nextIncorrectIdx);
      this.stateService.resetSentenceState();
      this.clearFeedback();
      onContinue();
    } else {
      onComplete();
    }
  }

  private handleNormalNext(
    currentIdx: number,
    totalSentences: number,
    onComplete: () => void,
    onContinue: () => void
  ): void {
    const wasLastSentence = (currentIdx + 1) >= totalSentences;

    this.stateService.moveToNextSentence();
    this.clearFeedback();

    if (wasLastSentence) {
      onComplete();
    } else {
      onContinue();
    }
  }

  private clearFeedback(): void {
    this.submissionService.feedback.set(null);
    this.submissionService.accuracyScore.set(0);
  }

  retrySentence(): void {
    this.stateService.retrySentence();
    this.submissionService.feedback.set(null);
    this.submissionService.accuracyScore.set(0);
    this.submissionService.userInputAfterSubmit.set('');
  }
}
