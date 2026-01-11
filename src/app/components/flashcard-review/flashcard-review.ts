import { CommonModule } from '@angular/common';
import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
  signal,
  computed
} from '@angular/core';
import { Flashcard } from '../../models/memory-retention.model';

/**
 * FlashcardReview component for reviewing flashcards in Memory Boost section.
 * Requirements: 3.3, 3.4
 */
@Component({
  selector: 'app-flashcard-review',
  imports: [CommonModule],
  templateUrl: './flashcard-review.html',
  styleUrl: './flashcard-review.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FlashcardReviewComponent {
  // Inputs
  flashcards = input.required<Flashcard[]>();
  showAddButton = input<boolean>(true);

  // Outputs
  cardMarked = output<{ card: Flashcard; known: boolean }>();
  cardsAdded = output<number>();

  // State signals
  currentIndex = signal<number>(0);
  isFlipped = signal<boolean>(false);
  reviewedCards = signal<Set<string>>(new Set());
  addedToDecks = signal<boolean>(false);

  // Computed properties
  currentCard = computed(() => {
    const cards = this.flashcards();
    const index = this.currentIndex();
    return cards[index] || null;
  });

  progress = computed(() => ({
    current: this.currentIndex() + 1,
    total: this.flashcards().length
  }));

  progressPercentage = computed(() => {
    const total = this.flashcards().length;
    if (total === 0) return 0;
    return Math.round(((this.currentIndex() + 1) / total) * 100);
  });

  isLastCard = computed(() => {
    return this.currentIndex() >= this.flashcards().length - 1;
  });

  hasCards = computed(() => {
    return this.flashcards().length > 0;
  });

  reviewedCount = computed(() => {
    return this.reviewedCards().size;
  });

  /**
   * Flip the current card to reveal the answer.
   * Requirements: 3.3 - Display cards with flip animation to reveal answer
   */
  flipCard(): void {
    this.isFlipped.update(v => !v);
  }

  /**
   * Mark the current card as "Know" or "Don't Know".
   * Requirements: 3.4 - Allow marking as "Know" or "Don't Know"
   */
  markCard(known: boolean): void {
    const card = this.currentCard();
    if (!card) return;

    // Record that this card was reviewed
    this.reviewedCards.update(set => {
      const newSet = new Set(set);
      newSet.add(card.id);
      return newSet;
    });

    // Emit the mark event
    this.cardMarked.emit({ card, known });

    // Move to next card
    this.nextCard();
  }

  /**
   * Move to the next card.
   */
  nextCard(): void {
    if (!this.isLastCard()) {
      this.currentIndex.update(i => i + 1);
      this.isFlipped.set(false);
    }
  }

  /**
   * Move to the previous card.
   */
  previousCard(): void {
    if (this.currentIndex() > 0) {
      this.currentIndex.update(i => i - 1);
      this.isFlipped.set(false);
    }
  }

  /**
   * Add all flashcards to the user's deck.
   */
  addAllToDecks(): void {
    const count = this.flashcards().length;
    this.cardsAdded.emit(count);
    this.addedToDecks.set(true);
  }

  /**
   * Reset the review session.
   */
  resetReview(): void {
    this.currentIndex.set(0);
    this.isFlipped.set(false);
    this.reviewedCards.set(new Set());
  }
}
