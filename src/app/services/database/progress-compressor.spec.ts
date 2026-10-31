import { UserProgress } from '../../models/exercise.model';
import { ProgressCompressor } from './progress-compressor';
import { ProgressDecompressor } from './progress-decompressor';

/** What Supabase JSONB hands back: plain JSON, key order not guaranteed. */
function throughJsonb(value: any): any {
  return JSON.parse(JSON.stringify(value));
}

function sampleProgress(): UserProgress {
  return {
    exerciseHistory: {
      'ex-1': {
        exerciseId: 'ex-1',
        attemptNumber: 2,
        userInput: 'I go to school',
        accuracyScore: 88,
        pointsEarned: 40,
        timestamp: new Date('2026-10-30T08:00:00.000Z'),
        hintsUsed: 1,
        level: 'beginner',
        category: 'daily-life',
        sentenceAttempts: [
          {
            sentenceIndex: 0,
            userInput: 'I go to school',
            accuracyScore: 88,
            retryCount: 1,
            incorrectAttempts: 1,
            feedback: [
              { type: 'grammar', originalText: 'go', suggestion: 'went', explanation: '', startIndex: 0, endIndex: 2 }
            ]
          }
        ]
      }
    },
    dictationHistory: {
      'ex-1': {
        exerciseId: 'ex-1',
        attemptNumber: 3,
        translatedText: '',
        sentenceAttempts: [],
        overallAccuracy: 95,
        timeSpent: 60,
        timestamp: new Date(),
        playbackSpeed: 1
      },
      'ex-2': {
        exerciseId: 'ex-2',
        attemptNumber: 1,
        translatedText: '',
        sentenceAttempts: [],
        overallAccuracy: 70,
        timeSpent: 30,
        timestamp: new Date(),
        playbackSpeed: 1
      }
    },
    pronunciationAttempts: [
      {
        exerciseId: 'ex-1',
        sentenceIndex: 0,
        expectedText: 'Hello',
        durationMs: 1200,
        timestamp: new Date('2026-10-30T09:00:00.000Z'),
        feedback: {
          overallScore: 80,
          rawFeedback: 'ok',
          pronunciationIssues: [],
          strengths: ['clear'],
          perWordFeedback: [{ word: 'Hello', ok: true }]
        }
      } as any
    ],
    totalPoints: 120,
    lastActivityDate: new Date('2026-10-30T09:00:00.000Z'),
    currentStreak: 3,
    longestStreak: 5,
    lastStreakDate: '2026-10-30',
    achievements: ['first-exercise']
  };
}

describe('ProgressCompressor / ProgressDecompressor round trip', () => {
  it('preserves exerciseHistory, dictationHistory and pronunciationAttempts', () => {
    const original = sampleProgress();
    const restored = ProgressDecompressor.decompress(throughJsonb(ProgressCompressor.compress(original)));

    const ex = restored.exerciseHistory['ex-1'];
    expect(Object.keys(restored.exerciseHistory)).toEqual(['ex-1']);
    expect(ex.attemptNumber).toBe(2);
    expect(ex.accuracyScore).toBe(88);
    expect(ex.timestamp.toISOString()).toBe('2026-10-30T08:00:00.000Z');
    expect(ex.sentenceAttempts?.[0].feedback[0].suggestion).toBe('went');

    // Dictation is stored as an attempt count only
    expect(Object.keys(restored.dictationHistory).sort()).toEqual(['ex-1', 'ex-2']);
    expect(restored.dictationHistory['ex-1'].attemptNumber).toBe(3);
    expect(restored.dictationHistory['ex-2'].attemptNumber).toBe(1);

    expect(restored.pronunciationAttempts?.length).toBe(1);
    expect(restored.pronunciationAttempts?.[0].feedback.overallScore).toBe(80);
    expect((restored as any).pa).toBeUndefined();

    expect(restored.totalPoints).toBe(120);
    expect(restored.achievements).toEqual(['first-exercise']);
  });

  it('detects compressed data when the first entry is dictation-only', () => {
    const compressed = { 'ex-2': { dh: 1 }, 'ex-1': { tr: { a: 1, t: '2026-10-30T08:00:00.000Z', sa: [] } } };
    expect(ProgressDecompressor.isCompressed(compressed)).toBeTrue();

    const restored = ProgressDecompressor.decompress({ exerciseHistory: compressed });
    expect(Object.keys(restored.exerciseHistory)).toEqual(['ex-1']);
    expect(restored.dictationHistory['ex-2'].attemptNumber).toBe(1);
  });

  it('survives repeated save/load cycles without losing translation data', () => {
    let progress = sampleProgress();
    for (let i = 0; i < 3; i++) {
      progress = ProgressDecompressor.decompress(throughJsonb(ProgressCompressor.compress(progress)));
    }
    expect(progress.exerciseHistory['ex-1'].userInput).toBe('I go to school');
    expect(progress.exerciseHistory['ex-1'].sentenceAttempts?.length).toBe(1);
    expect(progress.dictationHistory['ex-2'].attemptNumber).toBe(1);
    expect(progress.pronunciationAttempts?.length).toBe(1);
  });

  it('treats uncompressed legacy history as raw', () => {
    const raw = throughJsonb(sampleProgress());
    expect(ProgressDecompressor.isCompressed(raw.exerciseHistory)).toBeFalse();
    const restored = ProgressDecompressor.decompress(raw);
    expect(restored.exerciseHistory['ex-1'].attemptNumber).toBe(2);
    expect(restored.dictationHistory['ex-1'].overallAccuracy).toBe(95);
  });
});
