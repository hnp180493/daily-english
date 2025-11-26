/**
 * Helper functions to decompress user_progress data
 * Converts short keys back to full format for backward compatibility
 */

import { ExerciseAttempt, SentenceAttempt, FeedbackItem } from '../../models/exercise.model';
import { DictationPracticeAttempt } from '../../models/dictation.model';

export class ProgressDecompressor {
  /**
   * Decompress exerciseHistory from database format
   */
  static decompressExerciseHistory(compressedHistory: any): { [exerciseId: string]: ExerciseAttempt } {
    if (!compressedHistory) return {};

    const decompressed: { [exerciseId: string]: ExerciseAttempt } = {};

    Object.keys(compressedHistory).forEach((exerciseId) => {
      const exercise = compressedHistory[exerciseId];

      // Decompress translation attempt (tr)
      if (exercise.tr) {
        decompressed[exerciseId] = this.decompressTranslationAttempt(exerciseId, exercise.tr);
      }
    });

    return decompressed;
  }

  /**
   * Decompress dictationHistory from database format
   */
  static decompressDictationHistory(compressedHistory: any): { [exerciseId: string]: DictationPracticeAttempt } {
    if (!compressedHistory) return {};

    const decompressed: { [exerciseId: string]: DictationPracticeAttempt } = {};

    Object.keys(compressedHistory).forEach((exerciseId) => {
      const exercise = compressedHistory[exerciseId];

      // Decompress dictation attempt (dh - new format is just a number)
      if (exercise.dh !== undefined) {
        decompressed[exerciseId] = this.decompressDictationAttempt(exerciseId, exercise.dh);
      }
      // Legacy support for old 'di' key with full data
      else if (exercise.di) {
        decompressed[exerciseId] = this.decompressDictationAttemptLegacy(exercise.di);
      }
    });

    return decompressed;
  }

  /**
   * Decompress translation attempt
   */
  private static decompressTranslationAttempt(exerciseId: string, tr: any): ExerciseAttempt {
    return {
      exerciseId,
      attemptNumber: tr.a || 0,
      timestamp: new Date(tr.t),
      level: tr.l,
      category: tr.c,
      accuracyScore: tr.s || 0,
      baseScore: tr.bs,
      pointsEarned: tr.p || 0,
      hintsUsed: tr.h || 0,
      totalPenalty: tr.tp || 0,
      totalRetries: tr.tr || 0,
      totalIncorrectAttempts: tr.ia || 0,
      userInput: tr.ui || '',
      sentenceAttempts: this.decompressSentenceAttempts(tr.sa || [])
    };
  }

  /**
   * Decompress sentence attempts array
   */
  private static decompressSentenceAttempts(compressedSA: any[]): SentenceAttempt[] {
    if (!Array.isArray(compressedSA)) return [];

    return compressedSA.map((sa) => ({
      sentenceIndex: sa.i || 0,
      userInput: sa.u || '',
      accuracyScore: sa.a || 0,
      retryCount: sa.r || 0,
      incorrectAttempts: sa.ia || 0,
      feedback: this.decompressFeedback(sa.f || [])
    }));
  }

  /**
   * Decompress feedback array
   */
  private static decompressFeedback(compressedFeedback: any[]): FeedbackItem[] {
    if (!Array.isArray(compressedFeedback)) return [];

    return compressedFeedback.map((fb) => ({
      type: fb.t as 'grammar' | 'vocabulary' | 'structure' | 'spelling' | 'suggestion',
      originalText: fb.o || '',
      suggestion: fb.s || '',
      explanation: 'AI-generated suggestion for improvement', // Default explanation
      startIndex: 0, // Not stored, default to 0
      endIndex: (fb.o || '').length // Calculate from originalText length
    }));
  }

  /**
   * Decompress dictation attempt - new format (just attempt count)
   */
  private static decompressDictationAttempt(exerciseId: string, attemptCount: number): DictationPracticeAttempt {
    return {
      exerciseId,
      attemptNumber: attemptCount,
      timestamp: new Date(),
      translatedText: '',
      overallAccuracy: 0,
      timeSpent: 0,
      playbackSpeed: 1,
      sentenceAttempts: []
    };
  }

  /**
   * Decompress dictation attempt - legacy format (full data)
   */
  private static decompressDictationAttemptLegacy(di: any): DictationPracticeAttempt {
    return {
      exerciseId: di.e,
      attemptNumber: di.a || 0,
      timestamp: new Date(di.t),
      translatedText: di.tt || '',
      overallAccuracy: di.oa || 0,
      timeSpent: di.ts || 0,
      playbackSpeed: di.ps || 1,
      sentenceAttempts: di.sa?.map((sa: any) => ({
        original: sa.o || '',
        userInput: sa.u || '',
        attempts: sa.a || 1,
        accuracyScore: sa.as || 0,
        isCompleted: sa.c || false,
        feedback: sa.f ? {
          wordAccuracy: sa.f.wa || 0,
          characterAccuracy: sa.f.ca || 0,
          mistakes: {
            missingWords: sa.f.m?.mw || [],
            extraWords: sa.f.m?.ew || [],
            misspelledWords: sa.f.m?.sw || []
          },
          differences: sa.f.d?.map((d: any) => ({
            type: d.t,
            originalText: d.o || '',
            userText: d.u || '',
            startIndex: d.s || 0,
            endIndex: d.e || 0
          })) || []
        } : undefined
      })) || []
    };
  }

  /**
   * Check if data is in compressed format
   */
  static isCompressed(exerciseHistory: any): boolean {
    if (!exerciseHistory || typeof exerciseHistory !== 'object') return false;

    const firstKey = Object.keys(exerciseHistory)[0];
    if (!firstKey) return false;

    const firstExercise = exerciseHistory[firstKey];
    // Check if it has 'tr' or 'di' keys (compressed format)
    return firstExercise && (firstExercise.tr !== undefined || firstExercise.di !== undefined);
  }
}
