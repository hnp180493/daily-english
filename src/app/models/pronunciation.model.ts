import { DifficultyLevel } from './exercise.model';

export interface PronunciationContext {
  level: DifficultyLevel;
  expectedText: string;
  translatedFromVietnamese?: string;
}

export interface WordFeedback {
  word: string;
  ok: boolean;
  issue?: string;
}

export interface PronunciationFeedback {
  overallScore: number;
  rawFeedback: string;
  pronunciationIssues: string[];
  strengths: string[];
  perWordFeedback?: WordFeedback[];
  /** Optional phoneme-level scores from Azure Speech (Tier 3). */
  phoneme?: PhonemeAssessment;
}

/**
 * Phoneme-level assessment from Azure Speech Pronunciation Assessment.
 * Only present when the user has configured Azure Speech (Tier 3).
 */
export interface PhonemeAssessment {
  /** 0-100 overall pronunciation score. */
  pronScore: number;
  /** 0-100 — how accurately the phonemes were produced. */
  accuracyScore: number;
  /** 0-100 — how smoothly/naturally the speech flowed. */
  fluencyScore: number;
  /** 0-100 — fraction of expected words actually spoken. */
  completenessScore: number;
  words: WordPhonemeAssessment[];
}

export interface WordPhonemeAssessment {
  word: string;
  /** 0-100 word-level accuracy. */
  accuracyScore: number;
  /** None | Mispronunciation | Omission | Insertion | UnexpectedBreak | MissingBreak | Monotone */
  errorType: string;
  phonemes: { phoneme: string; accuracyScore: number }[];
}

export interface PronunciationAttempt {
  exerciseId: string;
  sentenceIndex: number;
  expectedText: string;
  feedback: PronunciationFeedback;
  durationMs: number;
  timestamp: Date;
}

export interface PronunciationSentenceState {
  index: number;
  expectedText: string;
  hasAttempt: boolean;
  attempt?: PronunciationAttempt;
}

export const PRONUNCIATION_DEFAULTS = {
  MAX_RECORDING_MS: 30_000,
  MIN_RECORDING_MS: 500,
  AUDIO_MIME_PREFERRED: 'audio/webm;codecs=opus',
  AUDIO_MIME_FALLBACK: 'audio/mp4'
} as const;
