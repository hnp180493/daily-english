/**
 * Writing Practice Models
 *
 * Free-form essay practice with AI grading on a 4-category rubric similar to
 * IELTS Writing Task 2 (Task Achievement, Coherence & Cohesion, Lexical Resource,
 * Grammar). Uses existing AI providers via user-supplied keys.
 */

export type WritingLevel = 'beginner' | 'intermediate' | 'advanced';
export type WritingType = 'opinion' | 'discussion' | 'problem-solution' | 'descriptive' | 'narrative' | 'argumentative';

export interface WritingPrompt {
  id: string;
  slug: string;
  title: string;
  /** The actual prompt the user reads. */
  prompt: string;
  /** Sub-questions the answer should address. */
  guidingQuestions?: string[];
  level: WritingLevel;
  type: WritingType;
  /** Suggested word count target (low, high). */
  wordCountTarget: { min: number; max: number };
  /** Suggested time in minutes. */
  estimatedMinutes: number;
  /** Optional starter ideas/hints. */
  hints?: string[];
  /** Optional sample structure. */
  sampleOutline?: string[];
}

/**
 * IELTS-inspired 4-category rubric, 0-9 each.
 * Stored separately so future rubrics (CEFR, business writing) can plug in.
 */
export interface WritingRubricScores {
  taskAchievement: number; // how well the essay addresses the prompt
  coherenceCohesion: number; // logical flow, paragraphing, linking words
  lexicalResource: number; // vocabulary range, accuracy, collocation
  grammar: number; // grammatical range and accuracy
}

export interface WritingFeedback {
  promptId: string;
  scores: WritingRubricScores;
  /** Average of the 4 sub-scores, rounded to nearest 0.5 (band-style). */
  overallBand: number;
  /** 2-3 sentence summary in Vietnamese. */
  overallComment: string;
  strengths: string[];
  improvements: string[];
  /** Up to 5 specific error examples with corrections. */
  errors: WritingErrorExample[];
  /** Word count from the user's submitted essay. */
  wordCount: number;
}

export interface WritingErrorExample {
  /** Type of error: grammar | vocabulary | spelling | meaning | tense | structure | other. */
  type: string;
  /** The wrong text quoted from the user's essay. */
  wrong: string;
  /** The corrected version. */
  right: string;
  /** Short Vietnamese explanation. */
  explanation: string;
}

export interface WritingAttempt {
  id: string;
  promptId: string;
  essayText: string;
  wordCount: number;
  durationMs: number;
  feedback?: WritingFeedback;
  startedAt: Date;
  submittedAt?: Date;
}

export const WRITING_CONSTANTS = {
  MIN_WORDS_FOR_FEEDBACK: 40,
  AUTO_SAVE_KEY: 'writing-drafts-v1',
  ATTEMPTS_KEY: 'writing-attempts-v1',
  MAX_ATTEMPTS_STORED: 30,
} as const;
