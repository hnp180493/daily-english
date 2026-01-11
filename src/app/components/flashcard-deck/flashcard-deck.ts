import { CommonModule } from '@angular/common';
import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  computed,
  OnInit,
  OnDestroy
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  Flashcard,
  FlashcardFilter,
  FlashcardMasteryLevel,
  ReviewSessionStats
} from '../../models/memory-retention.model';
import { FlashcardService } from '../../services/flashcard.service';

/**
 * FlashcardDeck page for reviewing all flashcards.
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7
 */
@Component({
  selector: 'app-flashcard-deck',
  imports: [CommonModule, FormsModule],
  templateUrl: './flashcard-deck.html',
  styleUrl: './flashcard-deck.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FlashcardDeckComponent implements OnInit, OnDestroy {
  private flashcardService = inject(FlashcardService);

  // State signals
  filter = signal<FlashcardFilter>({ exercise: null, category: null, mastery: null });
  isReviewing = signal<boolean>(false);
  currentIndex = signal<number>(0);
  isFlipped = signal<boolean>(false);
  sessionStats = signal<ReviewSessionStats | null>(null);
  
  // Import/Export state
  importMessage = signal<string>('');
  importSuccess = signal<boolean>(false);
  
  // Session cards snapshot - frozen list of cards for the current review session
  private sessionCards = signal<Flashcard[]>([]);

  // Session tracking
  private sessionStartTime: Date | null = null;
  private sessionCorrectCount = 0;
  private sessionReviewedCount = 0;

  // Computed properties
  allCards = computed(() => this.flashcardService.allFlashcards());
  dueCards = computed(() => this.flashcardService.dueFlashcards());
  stats = computed(() => this.flashcardService.stats());

  filteredCards = computed(() => {
    const currentFilter = this.filter();
    if (!currentFilter.exercise && !currentFilter.category && !currentFilter.mastery) {
      return this.allCards();
    }
    return this.flashcardService.filterCards(currentFilter);
  });

  // Cards available for starting a new review (dynamic)
  availableReviewCards = computed(() => {
    const due = this.dueCards();
    if (due.length > 0) return due;
    return this.filteredCards();
  });

  // Cards being reviewed in current session (frozen snapshot)
  reviewCards = computed(() => {
    if (this.isReviewing()) {
      return this.sessionCards();
    }
    return this.availableReviewCards();
  });

  currentCard = computed(() => {
    const cards = this.sessionCards();
    const index = this.currentIndex();
    return cards[index] || null;
  });

  hasCards = computed(() => this.allCards().length > 0);
  hasDueCards = computed(() => this.dueCards().length > 0);

  progress = computed(() => ({
    current: this.currentIndex() + 1,
    total: this.sessionCards().length || this.availableReviewCards().length
  }));

  categories = computed(() => this.flashcardService.getCategories());
  exerciseIds = computed(() => this.flashcardService.getExerciseIds());

  ngOnInit(): void {
    // Cards are loaded automatically by FlashcardService
  }

  ngOnDestroy(): void {
    // End session if still reviewing
    if (this.isReviewing()) {
      this.endSession();
    }
  }

  /**
   * Start a review session.
   * Creates a snapshot of cards to review so the list doesn't change during session.
   */
  startReview(): void {
    // Create a snapshot of cards to review
    const cardsToReview = [...this.availableReviewCards()];
    this.sessionCards.set(cardsToReview);
    
    this.isReviewing.set(true);
    this.currentIndex.set(0);
    this.isFlipped.set(false);
    this.sessionStartTime = new Date();
    this.sessionCorrectCount = 0;
    this.sessionReviewedCount = 0;
    this.sessionStats.set(null);
  }

  /**
   * End the review session and show stats.
   * Requirements: 5.4, 5.5 - Track and display session statistics
   */
  endSession(): void {
    if (!this.sessionStartTime) return;

    const endTime = new Date();
    const timeSpent = Math.round((endTime.getTime() - this.sessionStartTime.getTime()) / 1000);

    const stats: ReviewSessionStats = {
      cardsReviewed: this.sessionReviewedCount,
      correctCount: this.sessionCorrectCount,
      accuracy:
        this.sessionReviewedCount > 0
          ? Math.round((this.sessionCorrectCount / this.sessionReviewedCount) * 100)
          : 0,
      timeSpent,
      startedAt: this.sessionStartTime,
      endedAt: endTime
    };

    this.sessionStats.set(stats);
    this.isReviewing.set(false);
    this.sessionStartTime = null;
    // Clear session cards snapshot
    this.sessionCards.set([]);
  }

  /**
   * Flip the current card.
   */
  flipCard(): void {
    this.isFlipped.update(v => !v);
  }

  /**
   * Mark the current card as "Know" or "Don't Know".
   */
  markCard(known: boolean): void {
    const card = this.currentCard();
    if (!card) return;

    // Update session stats
    this.sessionReviewedCount++;
    if (known) {
      this.sessionCorrectCount++;
    }

    // Update card in service
    this.flashcardService.markCard(card.id, known).subscribe();

    // Move to next card or end session
    this.nextCard();
  }

  /**
   * Move to the next card.
   */
  nextCard(): void {
    const cards = this.sessionCards();
    if (this.currentIndex() < cards.length - 1) {
      this.currentIndex.update(i => i + 1);
      this.isFlipped.set(false);
    } else {
      // End of deck
      this.endSession();
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
   * Delete a flashcard.
   * Requirements: 5.7 - Allow users to manually delete individual flashcards
   */
  deleteCard(card: Flashcard): void {
    if (confirm('Are you sure you want to delete this flashcard?')) {
      this.flashcardService.deleteCard(card.id).subscribe();
    }
  }

  /**
   * Update filter.
   * Requirements: 5.6 - Allow filtering by exercise, category, or mastery level
   */
  updateFilter(key: keyof FlashcardFilter, value: string | null): void {
    this.filter.update(f => ({
      ...f,
      [key]: value || null
    }));
  }

  /**
   * Clear all filters.
   */
  clearFilters(): void {
    this.filter.set({ exercise: null, category: null, mastery: null });
  }

  /**
   * Review all cards (ignore due date).
   * Requirements: 5.3 - Option to review all cards anyway
   */
  reviewAllCards(): void {
    this.filter.set({ exercise: null, category: null, mastery: null });
    // Create snapshot from all filtered cards (not just due cards)
    const cardsToReview = [...this.filteredCards()];
    this.sessionCards.set(cardsToReview);
    
    this.isReviewing.set(true);
    this.currentIndex.set(0);
    this.isFlipped.set(false);
    this.sessionStartTime = new Date();
    this.sessionCorrectCount = 0;
    this.sessionReviewedCount = 0;
    this.sessionStats.set(null);
  }

  /**
   * Get mastery level display text.
   */
  getMasteryLabel(mastery: FlashcardMasteryLevel): string {
    const labels: Record<FlashcardMasteryLevel, string> = {
      new: 'New',
      learning: 'Learning',
      mastered: 'Mastered'
    };
    return labels[mastery];
  }

  /**
   * Format time in minutes and seconds.
   */
  formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins > 0) {
      return `${mins}m ${secs}s`;
    }
    return `${secs}s`;
  }

  /**
   * Get card mastery level for display.
   */
  getCardMastery(card: Flashcard): FlashcardMasteryLevel {
    if (card.reviewCount === 0) return 'new';
    if (card.interval >= 21) return 'mastered';
    return 'learning';
  }

  /**
   * Get mastery badge class.
   */
  getMasteryClass(mastery: FlashcardMasteryLevel): string {
    const classes: Record<FlashcardMasteryLevel, string> = {
      new: 'mastery-new',
      learning: 'mastery-learning',
      mastered: 'mastery-mastered'
    };
    return classes[mastery];
  }

  /**
   * Export all flashcards to JSON file.
   */
  exportFlashcards(): void {
    this.flashcardService.exportFlashcards();
  }

  /**
   * Handle file input for import.
   */
  onImportFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    
    if (!file) return;

    this.flashcardService.importFlashcards(file).subscribe({
      next: (result) => {
        if (result.imported > 0) {
          this.importMessage.set(`Successfully imported ${result.imported} flashcards${result.skipped > 0 ? ` (${result.skipped} duplicates skipped)` : ''}`);
          this.importSuccess.set(true);
        } else {
          this.importMessage.set(`No new flashcards to import (${result.skipped} duplicates found)`);
          this.importSuccess.set(false);
        }
        // Clear message after 5 seconds
        setTimeout(() => this.clearImportMessage(), 5000);
      },
      error: (error) => {
        this.importMessage.set(`Import failed: ${error.message || 'Invalid file format'}`);
        this.importSuccess.set(false);
        setTimeout(() => this.clearImportMessage(), 5000);
      }
    });

    // Reset file input
    input.value = '';
  }

  /**
   * Clear import message.
   */
  clearImportMessage(): void {
    this.importMessage.set('');
  }
}
