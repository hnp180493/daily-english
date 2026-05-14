import { Injectable } from '@angular/core';
import { FSRS_CONSTANTS, Flashcard, FsrsCardState, ReviewRating } from '../models/memory-retention.model';

/**
 * Simplified FSRS-4.5 scheduler for client-side spaced repetition.
 *
 * This is a pragmatic port of the FSRS algorithm — not the full optimizer with
 * trained weights, but a deterministic version that matches the published
 * defaults and produces sensible intervals. It is good enough for an in-app
 * learner with hundreds (not millions) of reviews.
 *
 * Reference: https://github.com/open-spaced-repetition/fsrs4anki/wiki/The-Algorithm
 *
 * State machine:
 *   New      ─Again─▶ Learning(step 0)
 *   New      ─Hard/Good/Easy─▶ Learning(step 1) or Review
 *   Learning ─Again─▶ Learning(step 0)
 *   Learning ─Good ─▶ next step / Review when done
 *   Learning ─Easy─▶ Review immediately
 *   Review   ─Again─▶ Relearning(step 0), lapses++
 *   Review   ─Hard/Good/Easy─▶ Review (longer)
 *   Relearning ─Again─▶ Relearning(step 0)
 *   Relearning ─Good─▶ Review (interval = max(1, prevStability * 0.5))
 */
@Injectable({ providedIn: 'root' })
export class FsrsService {
  /**
   * Apply a rating to a card and return a new card with updated FSRS state.
   * Does not mutate the input. Pure function modulo Date.now().
   */
  schedule(card: Flashcard, rating: ReviewRating, now: Date = new Date()): Flashcard {
    const state = card.state ?? this.inferInitialState(card);
    const lapses = card.lapses ?? 0;

    if (state === 'new') {
      return this.scheduleNew(card, rating, now);
    }
    if (state === 'learning' || state === 'relearning') {
      return this.scheduleLearning(card, rating, now, state, lapses);
    }
    // state === 'review'
    return this.scheduleReview(card, rating, now, lapses);
  }

  /**
   * Compute how mastered a card is for UI badges (new / learning / mastered).
   * Independent of FSRS internals so the old "mastery" filter still works.
   */
  computeMastery(card: Flashcard): 'new' | 'learning' | 'mastered' {
    if ((card.reviewCount ?? 0) === 0 && (card.state ?? 'new') === 'new') return 'new';
    const stability = card.stability ?? 0;
    if (stability >= 21) return 'mastered';
    return 'learning';
  }

  /**
   * Migration helper: backfill FSRS fields on an old card that only has
   * easeFactor/interval. Called once per card on load.
   */
  migrateFromLegacy(card: Flashcard): Flashcard {
    if (card.state) return card; // Already migrated.

    const reviewCount = card.reviewCount ?? 0;
    const interval = card.interval ?? 0;

    if (reviewCount === 0) {
      return { ...card, state: 'new', stability: 0, difficulty: 5, lapses: 0 };
    }

    // Existing learning card → seed FSRS based on legacy interval as stability proxy.
    const stability = Math.max(1, interval);
    return {
      ...card,
      state: interval >= 1 ? 'review' : 'learning',
      stability,
      difficulty: this.legacyEaseToFsrsDifficulty(card.easeFactor ?? 2.5),
      lapses: 0,
      elapsedDays: 0,
      scheduledDays: interval,
    };
  }

  // -----------------------------
  // State transitions
  // -----------------------------

  private scheduleNew(card: Flashcard, rating: ReviewRating, now: Date): Flashcard {
    if (rating === 1) {
      // Failed first attempt — drop into learning step 0.
      return this.toLearning(card, now, 0, /*lapses*/ 0, /*stability*/ 0.3, /*difficulty*/ 8);
    }
    const stability = FSRS_CONSTANTS.INITIAL_STABILITY[rating];
    const difficulty = FSRS_CONSTANTS.INITIAL_DIFFICULTY[rating];

    if (rating === 4) {
      // Easy first attempt → skip learning, go straight to review.
      const interval = this.clampInterval(this.intervalFromStability(stability));
      return this.toReview(card, now, rating, stability, difficulty, interval, 0);
    }

    // Hard / Good first attempt → enter learning.
    return this.toLearning(card, now, /*step*/ 1, /*lapses*/ 0, stability, difficulty);
  }

  private scheduleLearning(
    card: Flashcard,
    rating: ReviewRating,
    now: Date,
    state: 'learning' | 'relearning',
    lapses: number
  ): Flashcard {
    const steps = state === 'learning' ? FSRS_CONSTANTS.LEARNING_STEPS_MIN : FSRS_CONSTANTS.RELEARNING_STEPS_MIN;
    const currentStep = card.learningStep ?? 0;
    const stability = card.stability ?? FSRS_CONSTANTS.INITIAL_STABILITY[3];
    const difficulty = this.adjustDifficulty(card.difficulty ?? 5, rating);

    if (rating === 1) {
      // Restart from step 0.
      return this.toLearning(card, now, 0, lapses, Math.max(0.3, stability * 0.5), difficulty);
    }

    if (rating === 4) {
      // Skip remaining steps → graduate to review.
      const interval = this.clampInterval(this.intervalFromStability(stability * FSRS_CONSTANTS.EASY_BONUS));
      return this.toReview(card, now, rating, stability * FSRS_CONSTANTS.EASY_BONUS, difficulty, interval, lapses);
    }

    // Hard / Good → advance step if any remaining, else graduate.
    const nextStep = currentStep + 1;
    if (nextStep < steps.length) {
      return this.toLearning(card, now, nextStep, lapses, stability, difficulty);
    }
    // Graduate to review.
    const factor = rating === 2 ? FSRS_CONSTANTS.HARD_FACTOR : 1.0;
    const interval = this.clampInterval(this.intervalFromStability(stability * (rating === 2 ? 0.8 : 1.0)));
    return this.toReview(card, now, rating, stability * factor, difficulty, interval, lapses);
  }

  private scheduleReview(card: Flashcard, rating: ReviewRating, now: Date, lapses: number): Flashcard {
    const prevStability = card.stability ?? 1;
    const difficulty = this.adjustDifficulty(card.difficulty ?? 5, rating);
    const elapsed = this.daysBetween(card.lastReviewDate ?? card.createdAt, now);
    const retrievability = this.computeRetrievability(prevStability, elapsed);

    if (rating === 1) {
      // Lapse → relearning state.
      const newStability = Math.max(0.3, prevStability * 0.4);
      return this.toRelearning(card, now, 0, lapses + 1, newStability, difficulty);
    }

    // Hard / Good / Easy → new stability uses FSRS-style growth.
    const factor = this.stabilityFactorByRating(rating);
    const growth = this.stabilityGrowth(difficulty, prevStability, retrievability);
    const newStability = Math.max(prevStability, prevStability * growth * factor);
    const interval = this.clampInterval(this.intervalFromStability(newStability));

    return this.toReview(card, now, rating, newStability, difficulty, interval, lapses);
  }

  // -----------------------------
  // Helpers to build new card states
  // -----------------------------

  private toLearning(
    card: Flashcard,
    now: Date,
    step: number,
    lapses: number,
    stability: number,
    difficulty: number
  ): Flashcard {
    const stepMinutes = FSRS_CONSTANTS.LEARNING_STEPS_MIN[step] ?? 10;
    const nextReviewDate = new Date(now.getTime() + stepMinutes * 60 * 1000);
    return {
      ...card,
      state: 'learning',
      stability,
      difficulty,
      lapses,
      learningStep: step,
      reviewCount: (card.reviewCount ?? 0) + 1,
      lastReviewDate: now,
      lastRating: 1,
      elapsedDays: 0,
      scheduledDays: stepMinutes / (60 * 24),
      easeFactor: card.easeFactor ?? 2.5, // Preserve legacy field
      interval: 0,
      nextReviewDate,
    };
  }

  private toRelearning(
    card: Flashcard,
    now: Date,
    step: number,
    lapses: number,
    stability: number,
    difficulty: number
  ): Flashcard {
    const stepMinutes = FSRS_CONSTANTS.RELEARNING_STEPS_MIN[step] ?? 10;
    const nextReviewDate = new Date(now.getTime() + stepMinutes * 60 * 1000);
    return {
      ...card,
      state: 'relearning',
      stability,
      difficulty,
      lapses,
      learningStep: step,
      reviewCount: (card.reviewCount ?? 0) + 1,
      lastReviewDate: now,
      lastRating: 1,
      elapsedDays: 0,
      scheduledDays: stepMinutes / (60 * 24),
      easeFactor: card.easeFactor ?? 2.5,
      interval: 0,
      nextReviewDate,
    };
  }

  private toReview(
    card: Flashcard,
    now: Date,
    rating: ReviewRating,
    stability: number,
    difficulty: number,
    intervalDays: number,
    lapses: number
  ): Flashcard {
    const nextReviewDate = new Date(now);
    nextReviewDate.setDate(nextReviewDate.getDate() + intervalDays);
    return {
      ...card,
      state: 'review',
      stability,
      difficulty,
      lapses,
      learningStep: 0,
      reviewCount: (card.reviewCount ?? 0) + 1,
      lastReviewDate: now,
      lastRating: rating,
      elapsedDays: this.daysBetween(card.lastReviewDate ?? card.createdAt, now),
      scheduledDays: intervalDays,
      easeFactor: this.fsrsDifficultyToLegacyEase(difficulty),
      interval: intervalDays,
      nextReviewDate,
    };
  }

  // -----------------------------
  // Math helpers
  // -----------------------------

  private clampInterval(days: number): number {
    return Math.max(FSRS_CONSTANTS.MIN_INTERVAL, Math.min(FSRS_CONSTANTS.MAX_INTERVAL, Math.round(days)));
  }

  /**
   * Convert stability (days at which retention drops to ~90%) into a target
   * scheduled interval. With target retention 0.9, interval ≈ stability.
   */
  private intervalFromStability(stability: number): number {
    const r = FSRS_CONSTANTS.REQUEST_RETENTION;
    // FSRS: interval = stability * (r^(1/decay) - 1) — we use the simpler approximation
    // that target retention 0.9 ⇒ interval ≈ stability * 9/10 * ln(1/r) ~ stability.
    return Math.max(1, stability * (Math.log(r) / Math.log(0.9)));
  }

  private computeRetrievability(stability: number, elapsedDays: number): number {
    if (stability <= 0) return 0;
    // Power-law forgetting curve from FSRS-4.5.
    return Math.pow(1 + elapsedDays / (9 * stability), -1);
  }

  private stabilityGrowth(difficulty: number, prevStability: number, retrievability: number): number {
    // Higher difficulty → less growth. Higher retrievability at review → less growth.
    const dFactor = Math.max(0.3, (11 - difficulty) / 5); // 1 at d=6, ~2 at d=1
    const rFactor = 1 + (1 - retrievability) * 0.5;
    const sFactor = 1 + Math.log(Math.max(1, prevStability)) * 0.1;
    return Math.max(1.1, dFactor * rFactor / sFactor);
  }

  private stabilityFactorByRating(rating: ReviewRating): number {
    switch (rating) {
      case 2:
        return 1 / FSRS_CONSTANTS.HARD_FACTOR; // Slightly less growth
      case 3:
        return 1.0;
      case 4:
        return FSRS_CONSTANTS.EASY_BONUS;
      default:
        return 1.0;
    }
  }

  private adjustDifficulty(prev: number, rating: ReviewRating): number {
    // Same direction as FSRS: Again increases difficulty, Easy decreases.
    const delta = FSRS_CONSTANTS.DIFFICULTY_DECAY * (rating - 3);
    return Math.min(10, Math.max(1, prev + delta));
  }

  private daysBetween(start: Date | string, end: Date): number {
    const s = typeof start === 'string' ? new Date(start) : start;
    if (!s) return 0;
    const ms = end.getTime() - s.getTime();
    return Math.max(0, ms / (1000 * 60 * 60 * 24));
  }

  private legacyEaseToFsrsDifficulty(ease: number): number {
    // Legacy ease 1.3 (hardest) → 9, ease 3.0 (easiest) → 2. Linear map.
    const clamped = Math.max(1.3, Math.min(3.0, ease));
    return 9 - ((clamped - 1.3) / 1.7) * 7;
  }

  private fsrsDifficultyToLegacyEase(difficulty: number): number {
    // Inverse of above so legacy "easeFactor" stays meaningful for old UI.
    const d = Math.max(1, Math.min(10, difficulty));
    return 3.0 - ((d - 1) / 9) * 1.7;
  }

  private inferInitialState(card: Flashcard): FsrsCardState {
    // Migration fallback for un-migrated cards.
    if ((card.reviewCount ?? 0) === 0) return 'new';
    if ((card.interval ?? 0) < 1) return 'learning';
    return 'review';
  }
}

/**
 * Rating helpers exposed to UI — given a card, what interval will each button schedule?
 * Used to render preview labels like "Good · 4d" on the rating buttons.
 */
export function previewRatingIntervals(card: Flashcard, fsrs: FsrsService, now: Date = new Date()): Record<ReviewRating, number> {
  const ratings: ReviewRating[] = [1, 2, 3, 4];
  const result = {} as Record<ReviewRating, number>;
  for (const r of ratings) {
    const next = fsrs.schedule(card, r, now);
    const ms = next.nextReviewDate.getTime() - now.getTime();
    // Express interval as days for review state, minutes for learning/relearning.
    if (next.state === 'review') {
      result[r] = Math.max(1, Math.round(ms / (1000 * 60 * 60 * 24)));
    } else {
      result[r] = -Math.max(1, Math.round(ms / (1000 * 60))); // negative = minutes
    }
  }
  return result;
}
