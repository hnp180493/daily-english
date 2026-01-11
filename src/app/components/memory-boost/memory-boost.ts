import { CommonModule } from '@angular/common';
import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
  signal,
  computed,
  inject,
  OnInit
} from '@angular/core';
import { Exercise } from '../../models/exercise.model';
import {
  MemoryData,
  QuizResult,
  Flashcard,
  QUIZ_CONSTANTS
} from '../../models/memory-retention.model';
import { MemoryRetentionService } from '../../services/memory-retention.service';
import { FlashcardService } from '../../services/flashcard.service';
import { ComprehensionQuizComponent } from '../comprehension-quiz/comprehension-quiz';
import { ContentSummaryComponent } from '../content-summary/content-summary';
import { FlashcardReviewComponent } from '../flashcard-review/flashcard-review';

type TabType = 'quiz' | 'summary' | 'flashcards';

/**
 * MemoryBoost container component for post-exercise memory reinforcement.
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5
 */
@Component({
  selector: 'app-memory-boost',
  imports: [
    CommonModule,
    ComprehensionQuizComponent,
    ContentSummaryComponent,
    FlashcardReviewComponent
  ],
  templateUrl: './memory-boost.html',
  styleUrl: './memory-boost.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MemoryBoostComponent implements OnInit {
  private memoryRetentionService = inject(MemoryRetentionService);
  private flashcardService = inject(FlashcardService);

  // Inputs
  exercise = input.required<Exercise>();
  userTranslation = input.required<string>();
  exerciseScore = input.required<number>();

  // Outputs
  bonusPointsAwarded = output<number>();

  // State signals
  activeTab = signal<TabType>('quiz');
  quizCompleted = signal<boolean>(false);
  quizScore = signal<number>(0);
  flashcardsAdded = signal<number>(0);
  memoryData = signal<MemoryData | null>(null);
  isLoading = signal<boolean>(true);
  error = signal<string | null>(null);
  bonusAwarded = signal<boolean>(false);

  // Computed properties
  hasQuiz = computed(() => {
    const data = this.memoryData();
    return data?.quiz?.questions && data.quiz.questions.length > 0;
  });

  hasSummary = computed(() => {
    const data = this.memoryData();
    return data?.summary !== undefined;
  });

  hasFlashcards = computed(() => {
    const data = this.memoryData();
    return data?.flashcards && data.flashcards.length > 0;
  });

  quizQuestions = computed(() => {
    return this.memoryData()?.quiz?.questions || [];
  });

  summaryData = computed(() => {
    return this.memoryData()?.summary;
  });

  flashcards = computed(() => {
    return this.memoryData()?.flashcards || [];
  });

  // Requirements: 4.3 - Highlight Quiz tab as recommended first step
  isQuizRecommended = computed(() => {
    return !this.quizCompleted() && this.hasQuiz();
  });

  ngOnInit(): void {
    this.loadMemoryContent();
  }

  /**
   * Load or generate memory content for the exercise.
   */
  private loadMemoryContent(): void {
    this.isLoading.set(true);
    this.error.set(null);

    this.memoryRetentionService
      .generateMemoryContent(this.exercise(), this.userTranslation())
      .subscribe({
        next: data => {
          this.memoryData.set(data);
          this.isLoading.set(false);

          // Check if quiz was already completed
          if (data.quiz?.result) {
            this.quizCompleted.set(true);
            this.quizScore.set(data.quiz.result.score);
          }
        },
        error: err => {
          console.error('[MemoryBoost] Failed to load memory content:', err);
          this.error.set('Failed to generate memory content. Please try again.');
          this.isLoading.set(false);
        }
      });
  }

  /**
   * Switch to a different tab.
   */
  selectTab(tab: TabType): void {
    this.activeTab.set(tab);
  }

  /**
   * Handle quiz completion.
   * Requirements: 4.4 - Award bonus points for quiz score >= 80%
   */
  onQuizCompleted(result: QuizResult): void {
    this.quizCompleted.set(true);
    this.quizScore.set(result.score);

    // Save quiz result
    this.memoryRetentionService.saveQuizResult(result).subscribe();

    // Award bonus points if score >= 80%
    if (result.score >= QUIZ_CONSTANTS.MIN_SCORE_FOR_BONUS && !this.bonusAwarded()) {
      this.bonusAwarded.set(true);
      this.bonusPointsAwarded.emit(QUIZ_CONSTANTS.BONUS_POINTS);
    }
  }

  /**
   * Handle flashcard marked event.
   */
  onCardMarked(event: { card: Flashcard; known: boolean }): void {
    this.flashcardService.markCard(event.card.id, event.known).subscribe();
  }

  /**
   * Handle flashcards added to deck.
   * Requirements: 4.5 - Show confirmation with number of cards added
   */
  onCardsAdded(count: number): void {
    const flashcards = this.flashcards();
    this.flashcardService.addFlashcards(flashcards).subscribe({
      next: () => {
        this.flashcardsAdded.set(count);
      },
      error: err => {
        console.error('[MemoryBoost] Failed to add flashcards:', err);
      }
    });
  }

  /**
   * Retry loading memory content.
   */
  retry(): void {
    this.loadMemoryContent();
  }

  /**
   * Get tab class based on state.
   */
  getTabClass(tab: TabType): string {
    const isActive = this.activeTab() === tab;
    const isRecommended = tab === 'quiz' && this.isQuizRecommended();

    if (isActive) return 'tab-active';
    if (isRecommended) return 'tab-recommended';
    return 'tab-default';
  }
}
