import { Injectable, inject, signal, computed } from '@angular/core';
import { ExerciseStateService, SentenceProgress } from './exercise-state.service';
import { ReviewService } from './review.service';
import { ProgressService } from './progress.service';

@Injectable({
  providedIn: 'root'
})
export class ExerciseQuickReviewService {
  private stateService = inject(ExerciseStateService);
  private reviewService = inject(ReviewService);
  private progressService = inject(ProgressService);

  quickReviewMode = signal(false);
  incorrectSentenceIndices = signal<number[]>([]);

  quickReviewProgress = computed(() => {
    if (!this.quickReviewMode()) return null;
    const incorrectIndices = this.incorrectSentenceIndices();
    const allSentences = this.stateService.sentences();
    const completed = incorrectIndices.filter(idx => allSentences[idx]?.isCompleted).length;
    return {
      current: completed,
      total: incorrectIndices.length,
      percentage: incorrectIndices.length > 0 ? Math.round((completed / incorrectIndices.length) * 100) : 0
    };
  });

  initializeFromUrl(exerciseId: string): void {
    this.quickReviewMode.set(true);
    const incorrectQuestions = this.reviewService.getIncorrectQuestions(exerciseId);
    const indices = incorrectQuestions.map(q => q.sentenceIndex);
    this.incorrectSentenceIndices.set(indices);
  }

  setupQuickReview(exerciseId: string, allSentences: SentenceProgress[]): void {
    const progress = this.progressService.getProgressSignal()();
    const attempt = progress.exerciseHistory[exerciseId];
    
    if (!attempt?.sentenceAttempts) return;

    const sentences = this.stateService.sentences();
    const incorrectIndices = this.incorrectSentenceIndices();
    
    // Mark correct sentences as completed with translation
    sentences.forEach((s, idx) => {
      const sentenceAttempt = attempt.sentenceAttempts?.[idx];
      if (!incorrectIndices.includes(idx) && sentenceAttempt) {
        s.isCompleted = true;
        s.showTranslation = true;
        s.translation = sentenceAttempt.userInput || '';
      }
    });
    
    // Start from first incorrect sentence
    const firstIncorrectIdx = incorrectIndices[0] || 0;
    this.stateService.currentSentenceIndex.set(firstIncorrectIdx);
    this.stateService.resetSentenceState();
  }

  startQuickReview(allSentences: SentenceProgress[]): { difficultIndices: number[], hasDifficult: boolean } {
    // Get difficult sentences (>= 1 incorrect attempt OR >= 2 retries)
    const difficultSentencesData = allSentences
      .map((s, index) => ({ 
        sentence: s, 
        index, 
        incorrectAttempts: s.incorrectAttempts,
        retryCount: s.retryCount
      }))
      .filter(item => item.incorrectAttempts >= 1 || item.retryCount >= 2);

    if (difficultSentencesData.length === 0) {
      return { difficultIndices: [], hasDifficult: false };
    }

    const difficultIndices = difficultSentencesData.map(item => item.index);
    this.incorrectSentenceIndices.set(difficultIndices);
    this.quickReviewMode.set(true);

    return { difficultIndices, hasDifficult: true };
  }

  markCorrectSentences(allSentences: SentenceProgress[], difficultIndices: number[]): void {
    const sentences = this.stateService.sentences();
    sentences.forEach((s, idx) => {
      if (!difficultIndices.includes(idx)) {
        s.isCompleted = true;
        s.showTranslation = true;
        s.translation = allSentences[idx].translation || '';
      }
    });

    const firstIncorrectIdx = difficultIndices[0] || 0;
    this.stateService.currentSentenceIndex.set(firstIncorrectIdx);
    this.stateService.resetSentenceState();
  }

  getNextIncorrectIndex(currentIdx: number): number | null {
    const incorrectIndices = this.incorrectSentenceIndices();
    const currentPosInIncorrect = incorrectIndices.indexOf(currentIdx);
    
    if (currentPosInIncorrect !== -1 && currentPosInIncorrect < incorrectIndices.length - 1) {
      return incorrectIndices[currentPosInIncorrect + 1];
    }
    return null;
  }

  isLastIncorrectSentence(currentIdx: number): boolean {
    const incorrectIndices = this.incorrectSentenceIndices();
    const currentPosInIncorrect = incorrectIndices.indexOf(currentIdx);
    return currentPosInIncorrect === incorrectIndices.length - 1;
  }

  reset(): void {
    this.quickReviewMode.set(false);
    this.incorrectSentenceIndices.set([]);
  }
}
