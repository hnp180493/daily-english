/**
 * Listening Comprehension Models
 *
 * Tracks use browser TTS (no audio hosting needed) — each track is a script of
 * sentence-level segments synthesized client-side via Web Speech API.
 */

import { ReadingQuizQuestion, ReadingVocabulary } from './reading.model';

export type ListeningLevel = 'beginner' | 'intermediate' | 'advanced';
export type ListeningStyle = 'news' | 'monologue' | 'dialogue' | 'announcement' | 'interview';

export interface ListeningSegment {
  /** Sentence text — what TTS will speak. */
  text: string;
  /** Optional speaker label for dialogue tracks (e.g. 'A:', 'Anna:'). */
  speaker?: string;
  /** Optional pause in ms after this segment (default 300). */
  pauseAfterMs?: number;
}

export interface ListeningTrack {
  id: string;
  slug: string;
  title: string;
  /** One-line teaser shown on the list. */
  description: string;
  level: ListeningLevel;
  style: ListeningStyle;
  estimatedMinutes: number;
  /** Sentence-level script. The full transcript is the join of these. */
  segments: ListeningSegment[];
  vocabulary: ReadingVocabulary[];
  quiz: ReadingQuizQuestion[];
}

export interface ListeningProgress {
  trackId: string;
  listenedAt: Date;
  quizScore?: number;
  /** Highest quiz score the user has achieved on this track. */
  bestScore?: number;
}

export const LISTENING_CONSTANTS = {
  STORAGE_KEY: 'listening-progress-v1',
  DEFAULT_PAUSE_MS: 350,
  SLOW_RATE: 0.75,
  NORMAL_RATE: 0.95,
} as const;
