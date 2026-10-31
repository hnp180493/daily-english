import { FsrsService, previewRatingIntervals } from './fsrs.service';
import { FSRS_CONSTANTS, Flashcard, ReviewRating } from '../models/memory-retention.model';

const NOW = new Date('2026-01-10T12:00:00Z');
const DAY = 24 * 60 * 60 * 1000;

function makeCard(overrides: Partial<Flashcard> = {}): Flashcard {
  return {
    id: 'fc_1',
    front: 'apple',
    back: 'quả táo',
    exerciseId: 'ex-1',
    createdAt: new Date(NOW.getTime() - 30 * DAY),
    easeFactor: 2.5,
    interval: 0,
    nextReviewDate: NOW,
    reviewCount: 0,
    state: 'new',
    stability: 0,
    difficulty: 5,
    lapses: 0,
    ...overrides,
  };
}

function reviewCard(overrides: Partial<Flashcard> = {}): Flashcard {
  return makeCard({
    state: 'review',
    stability: 10,
    difficulty: 5,
    reviewCount: 5,
    interval: 10,
    lastReviewDate: new Date(NOW.getTime() - 10 * DAY),
    ...overrides,
  });
}

describe('FsrsService', () => {
  let fsrs: FsrsService;

  beforeEach(() => {
    fsrs = new FsrsService();
  });

  describe('new cards', () => {
    it('Again drops into learning step 0 (1 minute)', () => {
      const next = fsrs.schedule(makeCard(), 1, NOW);
      expect(next.state).toBe('learning');
      expect(next.learningStep).toBe(0);
      expect(next.nextReviewDate.getTime() - NOW.getTime()).toBe(
        FSRS_CONSTANTS.LEARNING_STEPS_MIN[0] * 60 * 1000
      );
    });

    it('Good enters learning step 1', () => {
      const next = fsrs.schedule(makeCard(), 3, NOW);
      expect(next.state).toBe('learning');
      expect(next.learningStep).toBe(1);
      expect(next.stability).toBe(FSRS_CONSTANTS.INITIAL_STABILITY[3]);
    });

    it('Easy skips learning and goes straight to review', () => {
      const next = fsrs.schedule(makeCard(), 4, NOW);
      expect(next.state).toBe('review');
      expect(next.interval).toBeGreaterThanOrEqual(1);
      expect(next.reviewCount).toBe(1);
    });
  });

  describe('learning cards', () => {
    it('graduating with Hard never gives more stability or a longer interval than Good', () => {
      const card = makeCard({ state: 'learning', learningStep: 1, stability: 2.5, reviewCount: 1 });
      const hard = fsrs.schedule(card, 2, NOW);
      const good = fsrs.schedule(card, 3, NOW);
      expect(hard.state).toBe('review');
      expect(good.state).toBe('review');
      expect(hard.stability!).toBeLessThanOrEqual(good.stability!);
      expect(hard.interval).toBeLessThanOrEqual(good.interval);
    });

    it('Again restarts at step 0 and halves stability (min 0.3)', () => {
      const card = makeCard({ state: 'learning', learningStep: 1, stability: 2, reviewCount: 1 });
      const next = fsrs.schedule(card, 1, NOW);
      expect(next.state).toBe('learning');
      expect(next.learningStep).toBe(0);
      expect(next.stability).toBe(1);
    });
  });

  describe('review cards', () => {
    it('Again lapses into relearning and increments lapses', () => {
      const next = fsrs.schedule(reviewCard({ lapses: 2 }), 1, NOW);
      expect(next.state).toBe('relearning');
      expect(next.lapses).toBe(3);
      expect(next.stability!).toBeLessThan(10);
    });

    it('intervals are ordered Hard <= Good <= Easy', () => {
      const card = reviewCard();
      const [hard, good, easy] = ([2, 3, 4] as ReviewRating[]).map((r) => fsrs.schedule(card, r, NOW));
      expect(hard.interval).toBeLessThanOrEqual(good.interval);
      expect(good.interval).toBeLessThanOrEqual(easy.interval);
    });

    it('never schedules beyond MAX_INTERVAL', () => {
      const next = fsrs.schedule(reviewCard({ stability: 5000 }), 4, NOW);
      expect(next.interval).toBe(FSRS_CONSTANTS.MAX_INTERVAL);
    });

    it('Easy lowers difficulty and Again raises it (bounded 1..10)', () => {
      const card = reviewCard({ difficulty: 5 });
      expect(fsrs.schedule(card, 4, NOW).difficulty!).toBeLessThan(5);
      expect(fsrs.schedule(card, 1, NOW).difficulty!).toBeGreaterThan(5);
      expect(fsrs.schedule(reviewCard({ difficulty: 1 }), 4, NOW).difficulty).toBe(1);
      expect(fsrs.schedule(reviewCard({ difficulty: 10 }), 1, NOW).difficulty).toBe(10);
    });
  });

  describe('relearning cards', () => {
    it('Again stays in relearning with relearning steps', () => {
      const card = makeCard({ state: 'relearning', learningStep: 0, stability: 4, reviewCount: 6, lapses: 1 });
      const next = fsrs.schedule(card, 1, NOW);
      expect(next.state).toBe('relearning');
      expect(next.nextReviewDate.getTime() - NOW.getTime()).toBe(FSRS_CONSTANTS.RELEARNING_STEPS_MIN[0] * 60 * 1000);
    });

    it('Good graduates back to review and records the rating', () => {
      const card = makeCard({ state: 'relearning', learningStep: 0, stability: 4, reviewCount: 6, lapses: 1 });
      const next = fsrs.schedule(card, 3, NOW);
      expect(next.state).toBe('review');
      expect(next.lastRating).toBe(3);
    });
  });

  it('records the actual rating while in learning', () => {
    expect(fsrs.schedule(makeCard(), 3, NOW).lastRating).toBe(3);
    expect(fsrs.schedule(makeCard(), 2, NOW).lastRating).toBe(2);
  });

  it('survives an invalid createdAt with no lastReviewDate', () => {
    const card = reviewCard({ createdAt: new Date('garbage'), lastReviewDate: undefined });
    const next = fsrs.schedule(card, 3, NOW);
    expect(Number.isFinite(next.stability!)).toBeTrue();
    expect(Number.isNaN(next.nextReviewDate.getTime())).toBeFalse();
  });

  it('does not mutate the input card', () => {
    const card = reviewCard();
    const snapshot = JSON.stringify(card);
    fsrs.schedule(card, 3, NOW);
    expect(JSON.stringify(card)).toBe(snapshot);
  });

  describe('migrateFromLegacy', () => {
    it('marks unreviewed legacy cards as new', () => {
      const legacy = makeCard({ state: undefined, stability: undefined, reviewCount: 0 });
      expect(fsrs.migrateFromLegacy(legacy).state).toBe('new');
    });

    it('seeds review state from legacy interval', () => {
      const legacy = makeCard({ state: undefined, reviewCount: 4, interval: 6, easeFactor: 2.5 });
      const migrated = fsrs.migrateFromLegacy(legacy);
      expect(migrated.state).toBe('review');
      expect(migrated.stability).toBe(6);
    });

    it('leaves already-migrated cards untouched', () => {
      const card = reviewCard();
      expect(fsrs.migrateFromLegacy(card)).toBe(card);
    });
  });

  it('computeMastery reports mastered once stability reaches 21 days', () => {
    expect(fsrs.computeMastery(makeCard())).toBe('new');
    expect(fsrs.computeMastery(reviewCard({ stability: 5 }))).toBe('learning');
    expect(fsrs.computeMastery(reviewCard({ stability: 21 }))).toBe('mastered');
  });

  it('previewRatingIntervals uses negative minutes for learning and days for review', () => {
    const preview = previewRatingIntervals(makeCard(), fsrs, NOW);
    expect(preview[1]).toBe(-1);
    expect(preview[4]).toBeGreaterThanOrEqual(1);
  });
});
