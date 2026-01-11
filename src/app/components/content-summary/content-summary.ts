import { CommonModule } from '@angular/common';
import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
  signal,
  inject,
  computed
} from '@angular/core';
import { ContentSummaryData, KeyVocabulary, Flashcard, FLASHCARD_DEFAULTS } from '../../models/memory-retention.model';
import { TTSService } from '../../services/tts.service';
import { FlashcardService } from '../../services/flashcard.service';

/**
 * ContentSummary component displays main ideas and key vocabulary.
 * Requirements: 2.3, 2.4, 2.6
 */
@Component({
  selector: 'app-content-summary',
  imports: [CommonModule],
  templateUrl: './content-summary.html',
  styleUrl: './content-summary.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ContentSummaryComponent {
  private ttsService = inject(TTSService);
  private flashcardService = inject(FlashcardService);

  // Inputs
  summary = input.required<ContentSummaryData>();

  // Outputs
  vocabularyClicked = output<KeyVocabulary>();
  flashcardAdded = output<KeyVocabulary>();

  // State signals
  expandedVocab = signal<string | null>(null);
  playingWord = signal<string | null>(null);
  addedWords = signal<Set<string>>(new Set());

  // Check which words are already in flashcards
  existingFlashcardWords = computed(() => {
    const flashcards = this.flashcardService.allFlashcards();
    return new Set(flashcards.map((f: Flashcard) => f.front.toLowerCase()));
  });

  /**
   * Play pronunciation for a vocabulary word.
   * Requirements: 2.4 - Play pronunciation using TTS when user clicks on vocabulary
   */
  playPronunciation(vocab: KeyVocabulary): void {
    this.playingWord.set(vocab.word);
    this.ttsService.speak(vocab.word);
    this.vocabularyClicked.emit(vocab);

    // Reset playing state after a short delay
    setTimeout(() => {
      this.playingWord.set(null);
    }, 1500);
  }

  /**
   * Toggle vocabulary expansion to show example sentence.
   */
  toggleVocabExpansion(word: string): void {
    if (this.expandedVocab() === word) {
      this.expandedVocab.set(null);
    } else {
      this.expandedVocab.set(word);
    }
  }

  /**
   * Check if a vocabulary item is expanded.
   */
  isExpanded(word: string): boolean {
    return this.expandedVocab() === word;
  }

  /**
   * Check if a word is currently being played.
   */
  isPlaying(word: string): boolean {
    return this.playingWord() === word;
  }

  /**
   * Get part of speech badge class.
   */
  getPartOfSpeechClass(pos: string | undefined): string {
    if (!pos) return 'pos-default';

    const posLower = pos.toLowerCase();
    if (posLower.includes('noun')) return 'pos-noun';
    if (posLower.includes('verb')) return 'pos-verb';
    if (posLower.includes('adj')) return 'pos-adjective';
    if (posLower.includes('adv')) return 'pos-adverb';
    return 'pos-default';
  }

  /**
   * Add a vocabulary word to flashcards.
   */
  addToFlashcard(vocab: KeyVocabulary): void {
    const exerciseId = this.summary().exerciseId;
    const now = new Date();

    const flashcard: Flashcard = {
      id: `${exerciseId}_${vocab.word}_${Date.now()}`,
      front: vocab.word,
      back: vocab.meaning,
      example: vocab.exampleSentence, // Store English example sentence
      exerciseId,
      category: vocab.partOfSpeech || 'vocabulary',
      createdAt: now,
      easeFactor: FLASHCARD_DEFAULTS.easeFactor,
      interval: FLASHCARD_DEFAULTS.interval,
      nextReviewDate: now,
      reviewCount: FLASHCARD_DEFAULTS.reviewCount
    };

    this.flashcardService.addFlashcards([flashcard]).subscribe();
    
    // Track added word
    this.addedWords.update(set => {
      const newSet = new Set(set);
      newSet.add(vocab.word.toLowerCase());
      return newSet;
    });

    this.flashcardAdded.emit(vocab);
  }

  /**
   * Check if a word is already added to flashcards.
   */
  isWordAdded(word: string): boolean {
    const wordLower = word.toLowerCase();
    return this.addedWords().has(wordLower) || this.existingFlashcardWords().has(wordLower);
  }
}
