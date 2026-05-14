import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnDestroy, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import {
  CardPrompt,
  CardType,
  CustomDeck,
  FLASHCARD_STUDY_DEFAULTS,
  FLASHCARD_STUDY_PREFS_KEY,
  Flashcard,
  FlashcardStudyPrefs,
  ReviewRating,
  SmartDeckDefinition,
} from '../../models/memory-retention.model';
import { FlashcardService } from '../../services/flashcard.service';
import { FlashcardModeService } from '../../services/flashcard-mode.service';
import { FlashcardDecksService } from '../../services/flashcard-decks.service';
import { FsrsService, previewRatingIntervals } from '../../services/fsrs.service';
import { TTSService } from '../../services/tts.service';

interface SessionEntry {
  cardId: string;
  rating: ReviewRating;
}

@Component({
  selector: 'app-flashcard-study',
  imports: [CommonModule, FormsModule],
  templateUrl: './flashcard-study.html',
  styleUrl: './flashcard-study.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FlashcardStudyComponent implements OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private flashcards = inject(FlashcardService);
  private decks = inject(FlashcardDecksService);
  private mode = inject(FlashcardModeService);
  private fsrs = inject(FsrsService);
  private tts = inject(TTSService);
  private destroy$ = new Subject<void>();

  // Session state
  sessionDeckLabel = signal<string>('');
  sessionDeckRef = signal<string | null>(null);
  queue = signal<Flashcard[]>([]);
  currentIndex = signal(0);
  prompt = signal<CardPrompt | null>(null);
  isRevealed = signal(false);
  typedAnswer = signal('');
  selectedOption = signal<number | null>(null);
  typedResult = signal<'correct' | 'incorrect' | null>(null);
  sessionLog = signal<SessionEntry[]>([]);
  sessionDone = signal(false);

  // Preferences
  prefs = signal<FlashcardStudyPrefs>({ ...FLASHCARD_STUDY_DEFAULTS });
  showPrefs = signal(false);

  // Computed values
  totalCards = computed(() => this.queue().length);
  currentCard = computed(() => this.queue()[this.currentIndex()] || null);
  progressPercent = computed(() => {
    const total = this.totalCards();
    if (total === 0) return 0;
    return Math.round(((this.currentIndex() + 1) / total) * 100);
  });
  isLastCard = computed(() => this.currentIndex() >= this.totalCards() - 1);

  ratingPreviews = computed(() => {
    const card = this.currentCard();
    if (!card) return null;
    return previewRatingIntervals(card, this.fsrs);
  });

  sessionStats = computed(() => {
    const log = this.sessionLog();
    const total = log.length;
    if (total === 0) return null;
    const good = log.filter((e) => e.rating >= 3).length;
    return {
      total,
      good,
      again: log.filter((e) => e.rating === 1).length,
      hard: log.filter((e) => e.rating === 2).length,
      easy: log.filter((e) => e.rating === 4).length,
      accuracy: Math.round((good / total) * 100),
    };
  });

  constructor() {
    this.loadPrefs();

    this.route.queryParamMap.pipe(takeUntil(this.destroy$)).subscribe((params) => {
      const deckId = params.get('deck');
      const custom = params.get('custom') === '1';
      this.initSession(deckId, custom);
    });

    // Auto-speak when prompt changes and pref enabled
    effect(() => {
      const prompt = this.prompt();
      if (!prompt) return;
      if (prompt.type === 'audio-cue' || (this.prefs().autoSpeak && prompt.type !== 'cloze')) {
        this.speakQuestion();
      }
    });
  }

  ngOnDestroy(): void {
    this.tts.stop();
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ---------------------------
  // Session setup
  // ---------------------------

  private initSession(deckId: string | null, isCustom: boolean): void {
    this.sessionDoneReset();

    if (!deckId) {
      // Default: due deck
      const def = this.decks.smartDecks().find((d) => d.kind === 'due');
      if (def) this.startSmartDeck(def);
      else this.startEmpty();
      return;
    }

    if (isCustom) {
      const custom = this.decks.customDecks().find((d) => d.id === deckId);
      if (custom) this.startCustomDeck(custom);
      else this.startEmpty();
      return;
    }

    const smart = this.decks.smartDecks().find((d) => d.id === deckId);
    if (smart) this.startSmartDeck(smart);
    else this.startEmpty();
  }

  private startSmartDeck(deck: SmartDeckDefinition): void {
    const cards = this.applyDailyCaps(this.decks.resolveSmartDeck(deck));
    this.sessionDeckLabel.set(deck.label);
    this.sessionDeckRef.set(deck.id);
    this.queue.set(cards);
    this.currentIndex.set(0);
    this.refreshPromptForCurrent();
  }

  private startCustomDeck(deck: CustomDeck): void {
    const cards = this.applyDailyCaps(this.decks.resolveCustomDeck(deck));
    this.sessionDeckLabel.set(deck.name);
    this.sessionDeckRef.set(deck.id);
    this.queue.set(cards);
    this.currentIndex.set(0);
    this.refreshPromptForCurrent();
  }

  private startEmpty(): void {
    this.queue.set([]);
    this.sessionDeckLabel.set('—');
    this.sessionDeckRef.set(null);
    this.prompt.set(null);
  }

  /**
   * Apply daily new card / review caps based on user preferences.
   * Keep all 'new' cards up to newPerDay limit; same for reviews.
   */
  private applyDailyCaps(cards: Flashcard[]): Flashcard[] {
    const prefs = this.prefs();
    const newCards: Flashcard[] = [];
    const reviewCards: Flashcard[] = [];
    for (const card of cards) {
      const state = card.state ?? 'new';
      if (state === 'new' && newCards.length < prefs.newPerDay) {
        newCards.push(card);
      } else if (state !== 'new' && reviewCards.length < prefs.reviewsPerDay) {
        reviewCards.push(card);
      }
    }
    // Interleave: 1 new every 4 reviews — keeps things fresh without burying old reviews.
    const result: Flashcard[] = [];
    let ni = 0;
    let ri = 0;
    while (ni < newCards.length || ri < reviewCards.length) {
      if (ri < reviewCards.length) result.push(reviewCards[ri++]);
      if (ri < reviewCards.length) result.push(reviewCards[ri++]);
      if (ri < reviewCards.length) result.push(reviewCards[ri++]);
      if (ri < reviewCards.length) result.push(reviewCards[ri++]);
      if (ni < newCards.length) result.push(newCards[ni++]);
    }
    return result;
  }

  // ---------------------------
  // Prompt rendering
  // ---------------------------

  private refreshPromptForCurrent(): void {
    const card = this.currentCard();
    if (!card) {
      this.prompt.set(null);
      return;
    }
    this.isRevealed.set(false);
    this.typedAnswer.set('');
    this.selectedOption.set(null);
    this.typedResult.set(null);

    const pool = this.flashcards.allFlashcards();
    const prompt = this.mode.buildPrompt(card, pool, this.prefs());
    this.prompt.set(prompt);
  }

  // ---------------------------
  // User actions
  // ---------------------------

  reveal(): void {
    this.isRevealed.set(true);
  }

  speakQuestion(): void {
    const prompt = this.prompt();
    if (!prompt) return;
    // Only speak English content. front == English for these cards.
    const textToSpeak = prompt.type === 'reverse' ? '' : prompt.card.front;
    if (textToSpeak) {
      this.tts.speak(textToSpeak);
    }
  }

  speakAnswer(): void {
    const prompt = this.prompt();
    if (!prompt) return;
    // After reveal: speak the English form
    this.tts.speak(prompt.card.front);
  }

  selectOption(index: number): void {
    if (this.isRevealed()) return;
    this.selectedOption.set(index);
    this.isRevealed.set(true);
  }

  submitTyped(): void {
    const prompt = this.prompt();
    if (!prompt || !prompt.answerText) return;
    const correct = this.mode.matchTypedAnswer(this.typedAnswer(), prompt.answerText);
    this.typedResult.set(correct ? 'correct' : 'incorrect');
    this.isRevealed.set(true);
  }

  /**
   * Apply a rating to the current card and advance.
   * Multiple-choice / type-answer auto-suggest the rating, but the user can still override.
   */
  rate(rating: ReviewRating): void {
    const card = this.currentCard();
    if (!card) return;

    this.flashcards.rateCard(card.id, rating).subscribe();
    this.sessionLog.update((log) => [...log, { cardId: card.id, rating }]);

    if (this.isLastCard()) {
      this.tts.stop();
      this.sessionDone.set(true);
    } else {
      this.currentIndex.update((i) => i + 1);
      this.refreshPromptForCurrent();
    }
  }

  /**
   * Smart rating shortcut for option/type modes.
   * Auto picks rating based on whether the user got it right + how confident.
   */
  rateFromInteraction(): void {
    const prompt = this.prompt();
    if (!prompt) return;

    if (prompt.type === 'multiple-choice') {
      const selected = this.selectedOption();
      if (selected === null || prompt.correctIndex === undefined) return;
      this.rate(selected === prompt.correctIndex ? 3 : 1);
      return;
    }

    if (prompt.type === 'type-answer') {
      const result = this.typedResult();
      this.rate(result === 'correct' ? 3 : 1);
      return;
    }

    // For flip / cloze / audio / reverse, user picks rating manually.
  }

  skipCard(): void {
    if (this.isLastCard()) {
      this.sessionDone.set(true);
    } else {
      this.currentIndex.update((i) => i + 1);
      this.refreshPromptForCurrent();
    }
  }

  suspendCurrent(): void {
    const card = this.currentCard();
    if (!card) return;
    if (!confirm(`Suspend card "${card.front}"? It will be hidden from the due queue.`)) return;
    this.flashcards.setSuspended(card.id, true).subscribe();
    this.skipCard();
  }

  resetCurrent(): void {
    const card = this.currentCard();
    if (!card) return;
    if (!confirm(`Reset card "${card.front}" back to new?`)) return;
    this.flashcards.resetCard(card.id).subscribe();
    this.refreshPromptForCurrent();
  }

  // ---------------------------
  // Preferences
  // ---------------------------

  togglePrefs(): void {
    this.showPrefs.update((v) => !v);
  }

  setModePreference(mode: 'auto' | CardType): void {
    this.prefs.update((p) => ({ ...p, modePreference: mode }));
    this.savePrefs();
    this.refreshPromptForCurrent();
  }

  toggleAutoSpeak(): void {
    this.prefs.update((p) => ({ ...p, autoSpeak: !p.autoSpeak }));
    this.savePrefs();
  }

  setNewPerDay(value: number): void {
    this.prefs.update((p) => ({ ...p, newPerDay: Math.max(0, Math.min(100, value)) }));
    this.savePrefs();
  }

  setReviewsPerDay(value: number): void {
    this.prefs.update((p) => ({ ...p, reviewsPerDay: Math.max(0, Math.min(500, value)) }));
    this.savePrefs();
  }

  private loadPrefs(): void {
    if (typeof localStorage === 'undefined') return;
    try {
      const raw = localStorage.getItem(FLASHCARD_STUDY_PREFS_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Partial<FlashcardStudyPrefs>;
      this.prefs.update((p) => ({ ...p, ...parsed }));
    } catch (err) {
      console.warn('[FlashcardStudy] Could not load prefs', err);
    }
  }

  private savePrefs(): void {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem(FLASHCARD_STUDY_PREFS_KEY, JSON.stringify(this.prefs()));
    } catch (err) {
      console.warn('[FlashcardStudy] Could not save prefs', err);
    }
  }

  private sessionDoneReset(): void {
    this.sessionDone.set(false);
    this.sessionLog.set([]);
  }

  // ---------------------------
  // Utility for template
  // ---------------------------

  modeLabel(mode: CardType): string {
    const map: Record<CardType, string> = {
      flip: 'Flip',
      cloze: 'Cloze',
      'multiple-choice': 'Multiple choice',
      'type-answer': 'Type the answer',
      'audio-cue': 'Listen & choose',
      reverse: 'Reverse',
    };
    return map[mode];
  }

  modeIcon(mode: CardType): string {
    const map: Record<CardType, string> = {
      flip: '🃏',
      cloze: '✏️',
      'multiple-choice': '🔘',
      'type-answer': '⌨️',
      'audio-cue': '🔊',
      reverse: '🔄',
    };
    return map[mode];
  }

  ratingLabel(rating: ReviewRating): string {
    switch (rating) {
      case 1:
        return 'Again';
      case 2:
        return 'Hard';
      case 3:
        return 'Good';
      case 4:
        return 'Easy';
    }
  }

  ratingShortcut(rating: ReviewRating): string {
    return String(rating);
  }

  intervalPreviewLabel(interval: number | undefined): string {
    if (interval === undefined) return '';
    if (interval < 0) {
      const mins = Math.abs(interval);
      if (mins < 60) return `${mins}p`;
      return `${Math.round(mins / 60)}h`;
    }
    if (interval < 30) return `${interval}d`;
    if (interval < 365) return `${Math.round(interval / 30)}m`;
    return `${(interval / 365).toFixed(1)}y`;
  }

  goBackToDeck(): void {
    this.router.navigate(['/flashcards']);
  }

  restartSession(): void {
    const ref = this.sessionDeckRef();
    if (!ref) {
      this.goBackToDeck();
      return;
    }
    const isCustom = this.decks.customDecks().some((d) => d.id === ref);
    this.router.navigate(['/flashcards/study'], {
      queryParams: { deck: ref, custom: isCustom ? '1' : null },
    });
  }

  /**
   * Keyboard shortcuts (bound from template via `(keydown.X)`).
   */
  handleKey(event: KeyboardEvent): void {
    if (this.sessionDone()) return;
    const key = event.key;
    if (!this.isRevealed() && key === ' ') {
      event.preventDefault();
      this.reveal();
      return;
    }
    if (this.isRevealed()) {
      const num = parseInt(key, 10);
      if (num >= 1 && num <= 4) {
        event.preventDefault();
        this.rate(num as ReviewRating);
      }
    }
  }
}
