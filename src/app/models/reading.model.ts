/**
 * Reading Comprehension Models
 *
 * Static passages (300-500 words) with vocabulary, quiz, and discussion prompts.
 * Content lives in `public/data/reading/passages.json` and is loaded by ReadingService.
 */

export type ReadingLevel = 'beginner' | 'intermediate' | 'advanced';

export interface ReadingPassage {
  id: string;
  slug: string;
  title: string;
  topic: string;
  level: ReadingLevel;
  /** Approximate reading time in minutes (passage only, excluding quiz). */
  estimatedMinutes: number;
  /** Word count — informational, used for filter/sort. */
  wordCount: number;
  /** The reading passage, plain text with `\n\n` between paragraphs. */
  passage: string;
  /** 5-8 key vocabulary words to study before reading. */
  vocabulary: ReadingVocabulary[];
  /** 4-5 multiple-choice comprehension questions. */
  quiz: ReadingQuizQuestion[];
  /** Optional discussion prompts (open-ended reflection — not graded). */
  discussion?: string[];
}

export interface ReadingVocabulary {
  word: string;
  partOfSpeech?: string;
  meaning: string;
  example?: string;
}

export interface ReadingQuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  /** Optional reference paragraph index (0-based) the answer comes from. */
  paragraphRef?: number;
}

export interface ReadingProgress {
  passageId: string;
  startedAt: Date;
  completedAt?: Date;
  quizScore?: number;
  quizAnswers: ReadingQuizAnswer[];
}

export interface ReadingQuizAnswer {
  questionId: string;
  selectedIndex: number;
  isCorrect: boolean;
}

export const READING_CONSTANTS = {
  MIN_QUIZ_QUESTIONS: 3,
  MAX_QUIZ_QUESTIONS: 6,
  STORAGE_KEY: 'reading-progress-v1',
} as const;
