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
