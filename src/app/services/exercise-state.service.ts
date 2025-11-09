import { Injectable, signal, computed } from '@angular/core';
import { Exercise, ExerciseAttempt } from '../models/exercise.model';

export interface SentenceProgress {
  original: string;
  translation: string;
  isCompleted: boolean;
  accuracyScore?: number;
  showTranslation?: boolean; // Track if translation should be displayed in full text
}

export interface ExerciseState {
  sentences: SentenceProgress[];
  currentIndex: number;
  hintsShown: number;
  previousHints: string[];
  currentHint: string;
  currentInput: string;
}

@Injectable({
  providedIn: 'root'
})
export class ExerciseStateService {
  // State signals
  sentences = signal<SentenceProgress[]>([]);
  currentSentenceIndex = signal(0);
  hintsShown = signal(0);
  currentHint = signal('');
  previousHints = signal<string[]>([]);
  userInput = signal('');

  // Computed values
  currentSentence = computed(() => this.sentences()[this.currentSentenceIndex()] || null);
  completedSentences = computed(() => this.sentences().filter(s => s.isCompleted));
  progressPercentage = computed(() => {
    const total = this.sentences().length;
    if (total === 0) return 0;
    return Math.round((this.completedSentences().length / total) * 100);
  });
  isExerciseComplete = computed(() => this.currentSentenceIndex() >= this.sentences().length);
  canProceedToNext = computed(() => {
    const currentIdx = this.currentSentenceIndex();
    const sents = this.sentences();
    if (currentIdx >= sents.length) return false;
    const current = sents[currentIdx];
    return current.isCompleted && (current.accuracyScore ?? 0) >= 90;
  });
  hasMoreHints = computed(() => this.hintsShown() < 3);

  initializeSentences(sourceText: string): void {
    const sentenceRegex = /[^.!?]+[.!?]+/g;
    const matches = sourceText.match(sentenceRegex) || [];
    
    this.sentences.set(matches.map(sentence => ({
      original: sentence.trim(),
      translation: '',
      isCompleted: false,
      showTranslation: false
    })));
  }

  markSentenceCompleted(index: number, translation: string, score: number): void {
    this.sentences.update(sentences => {
      const updated = [...sentences];
      updated[index] = {
        ...updated[index],
        translation,
        isCompleted: true,
        accuracyScore: score
      };
      return updated;
    });
  }

  moveToNextSentence(): void {
    // Mark current sentence to show translation before moving to next
    const currentIdx = this.currentSentenceIndex();
    this.sentences.update(sentences => {
      const updated = [...sentences];
      if (currentIdx < updated.length) {
        updated[currentIdx] = {
          ...updated[currentIdx],
          showTranslation: true
        };
      }
      return updated;
    });
    
    this.currentSentenceIndex.update(idx => idx + 1);
    this.resetSentenceState();
  }

  resetSentenceState(): void {
    this.currentHint.set('');
    this.previousHints.set([]);
    this.hintsShown.set(0);
    this.userInput.set('');
  }

  addHint(hint: string): void {
    this.currentHint.set(hint);
    this.previousHints.update(hints => [...hints, hint]);
    this.hintsShown.update(h => h + 1);
  }

  reset(): void {
    this.sentences.set([]);
    this.currentSentenceIndex.set(0);
    this.hintsShown.set(0);
    this.currentHint.set('');
    this.previousHints.set([]);
    this.userInput.set('');
  }

  getState(): ExerciseState {
    return {
      sentences: this.sentences(),
      currentIndex: this.currentSentenceIndex(),
      hintsShown: this.hintsShown(),
      previousHints: this.previousHints(),
      currentHint: this.currentHint(),
      currentInput: this.userInput()
    };
  }

  setState(state: ExerciseState): void {
    this.sentences.set(state.sentences);
    this.currentSentenceIndex.set(state.currentIndex);
    this.hintsShown.set(state.hintsShown || 0);
    this.previousHints.set(state.previousHints || []);
    this.currentHint.set(state.currentHint || '');
    this.userInput.set(state.currentInput || '');
  }

  loadBestAttempt(attempt: ExerciseAttempt): void {
    console.log('[ExerciseStateService] loadBestAttempt called:', {
      hasSentenceAttempts: !!attempt.sentenceAttempts,
      sentenceAttemptsLength: attempt.sentenceAttempts?.length || 0,
      currentSentencesLength: this.sentences().length,
      sentenceAttempts: attempt.sentenceAttempts
    });

    if (!attempt.sentenceAttempts || attempt.sentenceAttempts.length === 0) {
      console.warn('[ExerciseStateService] No sentenceAttempts found, returning early');
      return;
    }

    this.sentences.update(sentences => {
      const updated = sentences.map((s, index) => {
        const sentAttempt = attempt.sentenceAttempts?.find((sa: any) => sa.sentenceIndex === index);
        if (sentAttempt) {
          console.log(`[ExerciseStateService] Loading sentence ${index}:`, sentAttempt.userInput);
          return {
            ...s,
            translation: sentAttempt.userInput,
            isCompleted: true,
            accuracyScore: sentAttempt.accuracyScore,
            showTranslation: true // In review mode, show all translations
          };
        }
        return s;
      });
      console.log('[ExerciseStateService] Updated sentences:', updated);
      return updated;
    });

    this.currentSentenceIndex.set(this.sentences().length);
    console.log('[ExerciseStateService] Set currentSentenceIndex to:', this.sentences().length);
  }
}
