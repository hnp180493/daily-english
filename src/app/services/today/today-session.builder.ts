import { DifficultyLevel, Exercise } from '../../models/exercise.model';

/**
 * Pure logic for the "Học hôm nay" (Today) session: picking content,
 * generating cloze/shadowing/translation steps and scoring answers.
 * No Angular dependencies so it is trivially unit-testable.
 */

export type TodayStep =
  | { kind: 'review'; cardId: string }
  | { kind: 'cloze'; sentence: string; answer: string; options: string[]; vi?: string; fromReader?: boolean }
  | { kind: 'shadow'; sentence: string; vi?: string; fromReader?: boolean }
  | { kind: 'translate'; vi: string; en: string; fromReview?: string };

/** A sentence the learner got wrong before, from an exercise that is due for review. */
export interface ReviewSentence {
  exerciseId: string;
  vi: string;
  en: string;
}

/** A sentence from a text the learner read in the Reader. */
export interface ReaderSentence {
  sentence: string;
  /** All words of the source text, used as cloze distractors. */
  textWords: string[];
}

export interface TodaySession {
  /** Local date (YYYY-MM-DD) the session was built for. */
  date: string;
  level: DifficultyLevel;
  exerciseId: string;
  exerciseTitle: string;
  steps: TodayStep[];
}

export interface BuildSessionInput {
  date: string;
  /** Distinguishes extra rounds on the same day so they get different content. */
  round: number;
  level: DifficultyLevel;
  exercises: Exercise[];
  dueCardIds: string[];
  /** Exercises to avoid (already practised / used in recent sessions). */
  avoidExerciseIds: Set<string>;
  /** Sentences from the learner's own Reader texts (optional). */
  readerSentences?: ReaderSentence[];
  /** Words the learner marked as "learning" in the Reader — preferred as cloze answers. */
  learningWords?: Set<string>;
  /** Previously-wrong sentences from exercises due for review (shown right after flashcards). */
  reviewSentences?: ReviewSentence[];
}

export const TODAY_LIMITS = {
  REVIEW: 8,
  CLOZE: 4,
  SHADOW: 2,
  TRANSLATE: 1,
  /** Of the cloze/shadow steps, how many may come from the learner's Reader texts. */
  READER_CLOZE: 2,
  READER_SHADOW: 1,
  /** Sentences the learner got wrong before, pulled from the review queue. */
  REVIEW_SENTENCES: 3,
} as const;

const STOPWORDS = new Set([
  'the', 'and', 'that', 'this', 'with', 'from', 'have', 'has', 'had', 'were', 'was', 'are', 'for',
  'but', 'not', 'you', 'your', 'they', 'their', 'them', 'there', 'then', 'than', 'what', 'when',
  'which', 'who', 'will', 'would', 'could', 'should', 'into', 'about', 'some', 'very', 'also',
  'just', 'like', 'more', 'most', 'much', 'many', 'only', 'over', 'such', 'these', 'those',
  'been', 'being', 'does', 'did', 'its', 'our', 'his', 'her', 'she', 'him', 'because', 'every',
]);

const FALLBACK_DISTRACTORS = [
  'quickly', 'family', 'morning', 'important', 'different', 'weather', 'usually', 'friends',
  'working', 'beautiful', 'problem', 'decided', 'together', 'between', 'healthy', 'traffic',
];

/** Split a paragraph into sentences on terminal punctuation. */
export function splitSentences(text: string): string[] {
  if (!text) return [];
  return text
    .split(/(?<=[.!?。])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Deterministic PRNG so a given day always gets the same session. */
export function seededRandom(seed: string): () => number {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  let a = h >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(items: T[], rng: () => number): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function words(sentence: string): string[] {
  return sentence.split(/\s+/).map((w) => w.replace(/^[^A-Za-z']+|[^A-Za-z']+$/g, '')).filter(Boolean);
}

function isClozeCandidate(word: string): boolean {
  const w = word.toLowerCase();
  return w.length >= 4 && !STOPWORDS.has(w) && !w.includes("'");
}

/**
 * Turn a sentence into a 4-option fill-in-the-blank question.
 * Returns null when the sentence has no suitable word to blank.
 */
export function buildCloze(
  sentence: string,
  distractorPool: string[],
  rng: () => number,
  vi?: string,
  preferWords?: Set<string>
): Extract<TodayStep, { kind: 'cloze' }> | null {
  const candidates = words(sentence).filter(isClozeCandidate);
  if (candidates.length === 0) return null;

  // Prefer words the learner is studying, then longer (more meaningful) words, with some randomness.
  const ranked = candidates
    .map((w) => ({ w, score: w.length + rng() * 2 + (preferWords?.has(w.toLowerCase()) ? 100 : 0) }))
    .sort((a, b) => b.score - a.score);
  const answer = ranked[0].w;
  const answerLower = answer.toLowerCase();

  const seen = new Set([answerLower]);
  const pool = shuffle(
    distractorPool.filter(isClozeCandidate).filter((w) => Math.abs(w.length - answer.length) <= 4),
    rng
  );
  const distractors: string[] = [];
  for (const w of [...pool, ...shuffle(FALLBACK_DISTRACTORS, rng)]) {
    const lower = w.toLowerCase();
    if (seen.has(lower)) continue;
    seen.add(lower);
    distractors.push(matchCase(w, answer));
    if (distractors.length === 3) break;
  }

  const blanked = sentence.replace(new RegExp(`\\b${escapeRegExp(answer)}\\b`), '_____');
  return { kind: 'cloze', sentence: blanked, answer, options: shuffle([answer, ...distractors], rng), vi };
}

function matchCase(word: string, like: string): string {
  const lower = word.toLowerCase();
  return like[0] === like[0].toUpperCase() ? lower[0].toUpperCase() + lower.slice(1) : lower;
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Pick an exercise for the level, avoiding recently used ones when possible. */
export function pickExercise(
  exercises: Exercise[],
  level: DifficultyLevel,
  avoid: Set<string>,
  rng: () => number
): Exercise | null {
  const atLevel = exercises.filter((e) => e.level === level && e.englishText);
  const fresh = atLevel.filter((e) => !avoid.has(e.id));
  const pool = fresh.length > 0 ? fresh : atLevel.length > 0 ? atLevel : exercises.filter((e) => e.englishText);
  if (pool.length === 0) return null;
  return pool[Math.floor(rng() * pool.length)];
}

/** Build the ordered list of steps: review → cloze → shadow → translate. */
export function buildSession(input: BuildSessionInput): TodaySession | null {
  const rng = seededRandom(`${input.date}#${input.round}#${input.level}`);
  const exercise = pickExercise(input.exercises, input.level, input.avoidExerciseIds, rng);
  if (!exercise) return null;

  const en = splitSentences(exercise.englishText);
  const viAll = splitSentences(exercise.sourceText);
  const aligned = viAll.length === en.length;
  const viFor = (i: number) => (aligned ? viAll[i] : undefined);

  const indices = shuffle(en.map((_, i) => i), rng);
  const used = new Set<number>();
  const take = (filter: (i: number) => boolean = () => true) => {
    const i = indices.find((idx) => !used.has(idx) && filter(idx));
    if (i !== undefined) used.add(i);
    return i;
  };

  const steps: TodayStep[] = input.dueCardIds
    .slice(0, TODAY_LIMITS.REVIEW)
    .map((cardId) => ({ kind: 'review' as const, cardId }));

  // Old mistakes come back first, so the review backlog shrinks a little every day.
  steps.push(
    ...(input.reviewSentences ?? [])
      .slice(0, TODAY_LIMITS.REVIEW_SENTENCES)
      .map((r) => ({ kind: 'translate' as const, vi: r.vi, en: r.en, fromReview: r.exerciseId }))
  );

  // Translation first so it can claim a reasonably long aligned sentence.
  const translateSteps: TodayStep[] = [];
  if (aligned) {
    const i = take((idx) => words(en[idx]).length >= 4);
    if (i !== undefined) translateSteps.push({ kind: 'translate', vi: viAll[i], en: en[i] });
  }

  // Personal content first: sentences from the learner's own Reader texts.
  const reader = pickReaderSteps(input.readerSentences ?? [], input.learningWords ?? new Set(), rng);

  const shadowSteps: TodayStep[] = [...reader.shadow];
  while (shadowSteps.length < TODAY_LIMITS.SHADOW) {
    const i = take((idx) => words(en[idx]).length <= 14);
    if (i === undefined) break;
    shadowSteps.push({ kind: 'shadow', sentence: en[i], vi: viFor(i) });
  }

  // Missing translate step → one extra cloze to keep the session length steady.
  const clozeTarget = TODAY_LIMITS.CLOZE + (translateSteps.length === 0 ? 1 : 0);
  const pool = words(exercise.englishText);
  const clozeSteps: TodayStep[] = [...reader.cloze];
  while (clozeSteps.length < clozeTarget) {
    const i = take();
    if (i === undefined) break;
    const cloze = buildCloze(en[i], pool, rng, viFor(i));
    if (cloze) clozeSteps.push(cloze);
  }

  steps.push(...shuffle(clozeSteps, rng), ...shadowSteps, ...translateSteps);
  return {
    date: input.date,
    level: input.level,
    exerciseId: exercise.id,
    exerciseTitle: exercise.title,
    steps,
  };
}

/**
 * Choose cloze/shadow steps from Reader sentences. Sentences containing a word
 * the learner is studying come first, so saved words get practised in context.
 */
export function pickReaderSteps(
  sentences: ReaderSentence[],
  learningWords: Set<string>,
  rng: () => number
): { cloze: TodayStep[]; shadow: TodayStep[] } {
  const usable = sentences.filter((s) => {
    const n = words(s.sentence).length;
    return n >= 4 && n <= 25;
  });
  const hasLearning = (s: ReaderSentence) => words(s.sentence).some((w) => learningWords.has(w.toLowerCase()));
  const ordered = [...shuffle(usable.filter(hasLearning), rng), ...shuffle(usable.filter((s) => !hasLearning(s)), rng)];

  const cloze: TodayStep[] = [];
  const shadow: TodayStep[] = [];
  const used = new Set<string>();
  for (const s of ordered) {
    if (cloze.length >= TODAY_LIMITS.READER_CLOZE) break;
    const step = buildCloze(s.sentence, s.textWords, rng, undefined, learningWords);
    if (step && !used.has(s.sentence)) {
      used.add(s.sentence);
      cloze.push({ ...step, fromReader: true });
    }
  }
  for (const s of ordered) {
    if (shadow.length >= TODAY_LIMITS.READER_SHADOW) break;
    if (used.has(s.sentence) || words(s.sentence).length > 14) continue;
    used.add(s.sentence);
    shadow.push({ kind: 'shadow', sentence: s.sentence, fromReader: true });
  }
  return { cloze, shadow };
}

/**
 * Score a free translation against the reference (0-100) by token overlap.
 * Deliberately lenient: the learner also sees the model answer.
 */
export function scoreTranslation(answer: string, reference: string): number {
  const norm = (s: string) =>
    s
      .toLowerCase()
      .replace(/[^a-z0-9'\s]/g, ' ')
      .split(/\s+/)
      .filter(Boolean);
  const ref = norm(reference);
  const got = norm(answer);
  if (ref.length === 0 || got.length === 0) return 0;

  const counts = new Map<string, number>();
  for (const w of ref) counts.set(w, (counts.get(w) ?? 0) + 1);
  let matched = 0;
  for (const w of got) {
    const c = counts.get(w) ?? 0;
    if (c > 0) {
      matched++;
      counts.set(w, c - 1);
    }
  }
  // Penalise both missing words and padding.
  return Math.round((matched / Math.max(ref.length, got.length)) * 100);
}

export interface TranslationGrade {
  score: number;
  /** Learner's sentence minimally corrected (same as input when already correct). */
  corrected: string;
  /** One or two short sentences of feedback in Vietnamese. */
  feedback: string;
}

/** Messages asking an AI provider to grade a translation by meaning, not word overlap. */
export function buildGradePrompt(vi: string, reference: string, answer: string): { role: 'system' | 'user'; content: string }[] {
  return [
    {
      role: 'system',
      content:
        "You grade a Vietnamese learner's English translation by MEANING and GRAMMAR, not by matching the reference word for word. " +
        'A different but natural and correct translation scores 90-100. Reply with JSON only: ' +
        '{"score": <0-100>, "corrected": "<the learner sentence with minimal corrections, or unchanged if correct>", ' +
        '"feedback": "<1-2 short sentences in Vietnamese: the main mistake, or brief praise>"}',
    },
    { role: 'user', content: `Vietnamese: ${vi}\nReference: ${reference}\nLearner: ${answer}` },
  ];
}

/** Parse the grader's JSON (tolerates code fences / stray text). Returns null if unusable. */
export function parseGrade(raw: string): TranslationGrade | null {
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    const obj = JSON.parse(match[0]);
    const score = Number(obj.score);
    if (!Number.isFinite(score)) return null;
    return {
      score: Math.max(0, Math.min(100, Math.round(score))),
      corrected: String(obj.corrected ?? '').trim(),
      feedback: String(obj.feedback ?? '').trim(),
    };
  } catch {
    return null;
  }
}

/** Local date as YYYY-MM-DD (matches ProgressService's streak dates). */
export function localDateString(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
