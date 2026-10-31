import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { DifficultyLevel, Exercise } from '../../models/exercise.model';
import { ExerciseService } from '../exercise.service';
import { FlashcardService } from '../flashcard.service';
import { ProgressService } from '../progress.service';
import { StreakFreezeService } from '../streak-freeze.service';
import { AIUnifiedService } from '../ai/ai-unified.service';
import { ReaderService } from '../reader/reader.service';
import { ReviewService } from '../review.service';
import { splitEnglishSentences } from '../offline-grader';
import { tokenize } from '../reader/reader.logic';
import {
  ReaderSentence,
  ReviewSentence,
  TODAY_LIMITS,
  TodaySession,
  TodayStep,
  TranslationGrade,
  buildGradePrompt,
  buildSession,
  localDateString,
  parseGrade,
} from './today-session.builder';

export interface TodayStepResult {
  kind: TodayStep['kind'];
  /** cloze: picked the right word. */
  correct?: boolean;
  /** shadow / translate: 0-100. */
  score?: number;
  /** translate / cloze: learner wants this sentence as a flashcard. */
  saveCard?: boolean;
}

export interface TodaySummary {
  points: number;
  streak: number;
  reviewed: number;
  clozeCorrect: number;
  clozeTotal: number;
  shadowAvg: number | null;
  translateScore: number | null;
  cardsAdded: number;
  /** Previously-wrong sentences answered well (>= 80) this session. */
  reviewFixed?: number;
  reviewTotal?: number;
}

interface PersistedState {
  session: TodaySession | null;
  index: number;
  results: TodayStepResult[];
  /** Rounds started today (0 = first session). */
  round: number;
  completedDates: string[];
  recentExerciseIds: string[];
  summary: TodaySummary | null;
}

const STORAGE_KEY = 'today-session-v1';
/** Same splitter ExerciseStateService uses for the Vietnamese source text. */
const SOURCE_SENTENCE_RE = /[^.!?]+[.!?]+(?=['"]?\s|$)/g;
const LEVEL_KEY = 'today-level-v1';
const MAX_HISTORY = 60;
const MAX_RECENT_EXERCISES = 30;

const EMPTY: PersistedState = {
  session: null,
  index: 0,
  results: [],
  round: 0,
  completedDates: [],
  recentExerciseIds: [],
  summary: null,
};

/**
 * Orchestrates the daily ~10 minute session: builds it from content the learner
 * already has (due flashcards + one exercise at their level), tracks progress so
 * it can be resumed, and on completion updates streak/points and turns missed
 * sentences into flashcards (sentence mining).
 */
@Injectable({ providedIn: 'root' })
export class TodaySessionService {
  private exercises = inject(ExerciseService);
  private flashcards = inject(FlashcardService);
  private progress = inject(ProgressService);
  private ai = inject(AIUnifiedService);
  private reader = inject(ReaderService);
  private review = inject(ReviewService);
  readonly freeze = inject(StreakFreezeService);

  private state = signal<PersistedState>(this.load());
  /** Local date, re-read every minute / on tab focus so computeds notice midnight. */
  private today = signal(localDateString());

  readonly session = computed(() => this.state().session);
  readonly index = computed(() => this.state().index);
  readonly results = computed(() => this.state().results);
  readonly summary = computed(() => this.state().summary);
  readonly currentStep = computed<TodayStep | null>(() => this.session()?.steps[this.index()] ?? null);
  readonly totalSteps = computed(() => this.session()?.steps.length ?? 0);
  readonly isActive = computed(() => {
    const s = this.session();
    // A session already under way may finish after midnight; only unstarted
    // sessions from an earlier day are dropped.
    return !!s && (s.date === this.today() || this.index() > 0) && this.index() < s.steps.length;
  });
  readonly doneToday = computed(() => this.state().completedDates.includes(this.today()));
  readonly completedDates = computed(() => this.state().completedDates);

  constructor() {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    const tick = () => this.today.set(localDateString());
    const interval = setInterval(tick, 60_000);
    const onVisible = () => {
      if (document.visibilityState === 'visible') tick();
    };
    document.addEventListener('visibilitychange', onVisible);
    inject(DestroyRef).onDestroy(() => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
    });
  }

  /** Level the learner picked, else the level they practise most, else beginner. */
  async resolveLevel(): Promise<DifficultyLevel> {
    const saved = this.readLevel();
    if (saved) return saved;
    const all = await this.loadExercises();
    const history = Object.keys(this.progress.getProgressSignal()().exerciseHistory ?? {});
    const counts = new Map<DifficultyLevel, number>();
    for (const id of history) {
      const level = all.find((e) => e.id === id)?.level;
      if (level) counts.set(level, (counts.get(level) ?? 0) + 1);
    }
    let best = DifficultyLevel.BEGINNER;
    for (const [level, n] of counts) if (n > (counts.get(best) ?? 0)) best = level;
    return best;
  }

  setLevel(level: DifficultyLevel): void {
    try {
      localStorage.setItem(LEVEL_KEY, level);
    } catch {
      /* noop */
    }
  }

  /** Build (or rebuild for an extra round) today's session. Returns false if no content. */
  async start(level: DifficultyLevel): Promise<boolean> {
    const today = localDateString();
    const current = this.state();
    const sameDay = current.session?.date === today;
    const round = sameDay ? current.round + (current.index >= (current.session?.steps.length ?? 0) ? 1 : 0) : 0;

    const exercises = await this.loadExercises();
    const avoid = new Set([
      ...current.recentExerciseIds,
      ...Object.keys(this.progress.getProgressSignal()().exerciseHistory ?? {}),
    ]);
    const session = buildSession({
      date: today,
      round,
      level,
      exercises,
      dueCardIds: this.flashcards.dueFlashcards().map((c) => c.id),
      avoidExerciseIds: avoid,
      ...this.readerInput(),
      reviewSentences: this.reviewInput(exercises),
    });
    if (!session) return false;

    this.update({
      session,
      index: 0,
      results: [],
      round,
      summary: null,
      recentExerciseIds: [session.exerciseId, ...current.recentExerciseIds.filter((id) => id !== session.exerciseId)].slice(
        0,
        MAX_RECENT_EXERCISES
      ),
    });
    return true;
  }

  /** Record the result of the current step and move on. Finishes the session after the last step. */
  submit(result: TodayStepResult): void {
    const s = this.state();
    if (!s.session || s.index >= s.session.steps.length) return;
    const results = [...s.results];
    results[s.index] = result;
    const index = s.index + 1;
    this.update({ results, index });
    if (index >= s.session.steps.length) this.finish();
  }

  canGradeWithAI(): boolean {
    return this.ai.isConfigured();
  }

  /**
   * Grade a translation by meaning with the learner's AI provider.
   * Returns null when no provider is configured or the call/parse fails — the
   * caller then falls back to local word-overlap scoring.
   */
  async gradeTranslation(vi: string, reference: string, answer: string): Promise<TranslationGrade | null> {
    if (!this.canGradeWithAI()) return null;
    try {
      const raw = await firstValueFrom(this.ai.complete(buildGradePrompt(vi, reference, answer), { maxTokens: 250 }));
      return parseGrade(raw);
    } catch (err) {
      console.warn('[TodaySession] AI grading failed, using local score', err);
      return null;
    }
  }

  /** Drop the in-progress session (e.g. "change level"). */
  abandon(): void {
    this.update({ session: null, index: 0, results: [], summary: null });
  }

  private finish(): void {
    const s = this.state();
    if (!s.session) return;
    const steps = s.session.steps;
    const resultsOf = <K extends TodayStep['kind']>(kind: K) =>
      steps.map((step, i) => ({ step, result: s.results[i] })).filter((x) => x.step.kind === kind);

    const reviews = resultsOf('review');
    const clozes = resultsOf('cloze');
    const shadows = resultsOf('shadow').map((x) => x.result?.score).filter((n): n is number => typeof n === 'number');
    const allTranslations = resultsOf('translate');
    const translate = allTranslations.find((x) => x.step.kind === 'translate' && !x.step.fromReview);
    const reviewed = allTranslations.filter((x) => x.step.kind === 'translate' && x.step.fromReview);
    const reviewFixed = reviewed.filter((x) => (x.result?.score ?? 0) >= 80).length;
    this.rescheduleReviews(reviewed);

    const clozeCorrect = clozes.filter((x) => x.result?.correct).length;
    const translateScore = translate?.result?.score ?? null;
    const shadowAvg = shadows.length ? Math.round(shadows.reduce((a, b) => a + b, 0) / shadows.length) : null;

    // Sentence mining: wrong cloze answers + sentences the learner chose to keep.
    const cards = [...clozes, ...resultsOf('translate')]
      .filter((x) => x.result?.saveCard || (x.step.kind === 'cloze' && x.result && !x.result.correct))
      .map(({ step }) => toCard(step, s.session!));
    const before = this.flashcards.allFlashcards().length;
    if (cards.length) this.flashcards.addFlashcards(cards).subscribe();
    const cardsAdded = this.flashcards.allFlashcards().length - before;

    const points = 5 + reviews.length + clozeCorrect * 2 + reviewFixed * 2 +
      (shadowAvg !== null && shadowAvg >= 70 ? 3 : 0) +
      (translateScore !== null && translateScore >= 60 ? 3 : 0);
    const streak = this.progress.recordDailySession(points);

    const today = localDateString();
    this.update({
      completedDates: [today, ...s.completedDates.filter((d) => d !== today)].slice(0, MAX_HISTORY),
      summary: {
        points,
        streak,
        reviewed: reviews.length,
        clozeCorrect,
        clozeTotal: clozes.length,
        shadowAvg,
        translateScore,
        cardsAdded,
        reviewFixed,
        reviewTotal: reviewed.length,
      },
    });
  }

  /** How many previously-wrong sentences (from due reviews) the next session will include. */
  readonly dueReviewCount = computed(() =>
    Math.min(
      TODAY_LIMITS.REVIEW_SENTENCES,
      this.dueReviewItems().reduce((sum, i) => sum + this.wrongIndices(i.exerciseId).length, 0)
    )
  );

  private dueReviewItems() {
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);
    return this.review
      .getReviewQueueSignal()()
      .filter((i) => new Date(i.nextReviewDate) <= endOfToday)
      .sort((a, b) => new Date(a.nextReviewDate).getTime() - new Date(b.nextReviewDate).getTime());
  }

  /** Sentence indices the learner struggled with (same rule as Quick Review), worst first. */
  private wrongIndices(exerciseId: string): number[] {
    const attempts = this.progress.getProgressSignal()().exerciseHistory?.[exerciseId]?.sentenceAttempts ?? [];
    return attempts
      .filter((a) => (a.incorrectAttempts ?? 0) >= 1 || (a.retryCount ?? 0) >= 2 || a.accuracyScore < 90)
      .sort((a, b) => (b.incorrectAttempts ?? 0) - (a.incorrectAttempts ?? 0) || a.accuracyScore - b.accuracyScore)
      .map((a) => a.sentenceIndex);
  }

  /** Up to REVIEW_SENTENCES wrong sentences, one per due exercise first (most overdue first). */
  private reviewInput(exercises: Exercise[]): ReviewSentence[] {
    const candidates: ReviewSentence[][] = [];
    for (const item of this.dueReviewItems()) {
      const ex = item.exercise ?? exercises.find((e) => e.id === item.exerciseId);
      if (!ex) continue;
      const vi = (ex.sourceText ?? '').match(SOURCE_SENTENCE_RE)?.map((x) => x.trim()) ?? [];
      const en = splitEnglishSentences(ex.englishText ?? '');
      if (!vi.length || vi.length !== en.length) continue;
      const sentences = this.wrongIndices(ex.id)
        .filter((i) => vi[i] && en[i])
        .map((i) => ({ exerciseId: ex.id, vi: vi[i], en: en[i] }));
      if (sentences.length) candidates.push(sentences);
    }
    const picks: ReviewSentence[] = [];
    for (let round = 0; picks.length < TODAY_LIMITS.REVIEW_SENTENCES; round++) {
      const before = picks.length;
      for (const list of candidates) {
        if (list[round] && picks.length < TODAY_LIMITS.REVIEW_SENTENCES) picks.push(list[round]);
      }
      if (picks.length === before) break;
    }
    return picks;
  }

  /** Practising an exercise's old mistakes counts as reviewing it: feed the average into SM-2. */
  private rescheduleReviews(reviewed: { step: TodayStep; result?: TodayStepResult }[]): void {
    const byExercise = new Map<string, number[]>();
    for (const { step, result } of reviewed) {
      if (step.kind !== 'translate' || !step.fromReview || typeof result?.score !== 'number') continue;
      byExercise.set(step.fromReview, [...(byExercise.get(step.fromReview) ?? []), result.score]);
    }
    for (const [exerciseId, scores] of byExercise) {
      this.review.scheduleNextReview(exerciseId, scores.reduce((a, b) => a + b, 0) / scores.length);
    }
  }

  /** Sentences from the 3 most recently opened Reader texts + words being learned. */
  private readerInput(): { readerSentences: ReaderSentence[]; learningWords: Set<string> } {
    const readerSentences = this.reader
      .sortedTexts()
      .slice(0, 3)
      .flatMap((text) => {
        const doc = tokenize(text.content);
        return doc.sentences.map((sentence) => ({ sentence, textWords: doc.words }));
      });
    const learningWords = new Set(
      Object.entries(this.reader.vocab())
        .filter(([, v]) => v.status === 'learning')
        .map(([w]) => w)
    );
    return { readerSentences, learningWords };
  }

  private exercisesCache: Exercise[] | null = null;
  private async loadExercises(): Promise<Exercise[]> {
    if (!this.exercisesCache) this.exercisesCache = await firstValueFrom(this.exercises.getAllExercises());
    return this.exercisesCache;
  }

  private readLevel(): DifficultyLevel | null {
    try {
      const v = localStorage.getItem(LEVEL_KEY);
      return Object.values(DifficultyLevel).includes(v as DifficultyLevel) ? (v as DifficultyLevel) : null;
    } catch {
      return null;
    }
  }

  private update(patch: Partial<PersistedState>): void {
    const next = { ...this.state(), ...patch };
    this.state.set(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* in-memory still works */
    }
  }

  private load(): PersistedState {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? { ...EMPTY, ...JSON.parse(raw) } : EMPTY;
    } catch {
      return EMPTY;
    }
  }
}

/** Reader sentences aren't tied to an exercise; a fixed id lets addFlashcards dedupe them across days. */
const READER_CARD_SOURCE = 'reader';

function toCard(step: TodayStep, session: TodaySession) {
  const base = { exerciseId: session.exerciseId, category: 'today' };
  if (step.kind === 'cloze') {
    const full = step.sentence.replace('_____', step.answer);
    const exerciseId = step.fromReader ? READER_CARD_SOURCE : session.exerciseId;
    return { ...base, exerciseId, front: full, back: step.vi ?? step.answer, example: step.answer };
  }
  if (step.kind === 'translate') {
    // Review sentences come from an older exercise, not today's.
    return { ...base, exerciseId: step.fromReview ?? session.exerciseId, front: step.en, back: step.vi };
  }
  return { ...base, front: '', back: '' };
}
