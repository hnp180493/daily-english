/**
 * Helper functions to compress user_progress data
 * Converts full format to short keys to reduce database size
 */

import { ExerciseAttempt, SentenceAttempt, FeedbackItem, UserProgress } from '../../models/exercise.model';
import { DictationPracticeAttempt } from '../../models/dictation.model';

export class ProgressCompressor {
  /**
   * Compress entire UserProgress object
   * Merges both exerciseHistory and dictationHistory into a single exerciseHistory object
   */
  static compress(progress: UserProgress): any {
    return {
      exerciseHistory: this.compressAllHistory(progress.exerciseHistory, progress.dictationHistory),
      totalPoints: progress.totalPoints,
      lastActivityDate: progress.lastActivityDate,
      currentStreak: progress.currentStreak,
      longestStreak: progress.longestStreak,
      lastStreakDate: progress.lastStreakDate,
      achievements: progress.achievements
    };
  }

  /**
   * Compress both translation and dictation history into a single object
   * Translation attempts use 'tr' key, dictation attempts use 'dh' key
   */
  static compressAllHistory(
    exerciseHistory: { [exerciseId: string]: ExerciseAttempt },
    dictationHistory: { [exerciseId: string]: DictationPracticeAttempt }
  ): any {
    const compressed: any = {};

    // Add translation attempts with 'tr' key
    if (exerciseHistory) {
      Object.keys(exerciseHistory).forEach((exerciseId) => {
        const attempt = exerciseHistory[exerciseId];
        compressed[exerciseId] = {
          tr: this.compressTranslationAttempt(attempt)
        };
      });
    }

    // Add dictation attempts with 'dh' key (merged into same exerciseHistory)
    if (dictationHistory) {
      Object.keys(dictationHistory).forEach((exerciseId) => {
        const attempt = dictationHistory[exerciseId];
        if (!compressed[exerciseId]) {
          compressed[exerciseId] = {};
        }
        compressed[exerciseId].dh = this.compressDictationAttempt(attempt);
      });
    }

    return compressed;
  }

  /**
   * Compress translation attempt
   */
  private static compressTranslationAttempt(attempt: ExerciseAttempt): any {
    return {
      a: attempt.attemptNumber,
      t: attempt.timestamp instanceof Date ? attempt.timestamp.toISOString() : attempt.timestamp,
      l: attempt.level,
      c: attempt.category,
      s: attempt.accuracyScore,
      bs: attempt.baseScore,
      p: attempt.pointsEarned,
      h: attempt.hintsUsed,
      tp: attempt.totalPenalty,
      tr: attempt.totalRetries,
      ia: attempt.totalIncorrectAttempts,
      ui: attempt.userInput,
      sa: this.compressSentenceAttempts(attempt.sentenceAttempts || [])
    };
  }

  /**
   * Compress dictation attempt - only store attempt count
   */
  private static compressDictationAttempt(attempt: DictationPracticeAttempt): number {
    // Only store the attempt number (how many times practiced)
    return attempt.attemptNumber;
  }

  /**
   * Compress sentence attempts array
   */
  private static compressSentenceAttempts(sentenceAttempts: SentenceAttempt[]): any[] {
    if (!Array.isArray(sentenceAttempts)) return [];

    return sentenceAttempts.map((sa) => ({
      i: sa.sentenceIndex,
      u: sa.userInput,
      a: sa.accuracyScore,
      r: sa.retryCount,
      ia: sa.incorrectAttempts,
      f: this.compressFeedback(sa.feedback)
    }));
  }

  /**
   * Compress feedback array
   */
  private static compressFeedback(feedback: FeedbackItem[]): any[] {
    if (!Array.isArray(feedback)) return [];

    return feedback.map((fb) => ({
      t: fb.type,
      o: fb.originalText,
      s: fb.suggestion
      // Skip explanation, startIndex, endIndex to save space
    }));
  }
}
