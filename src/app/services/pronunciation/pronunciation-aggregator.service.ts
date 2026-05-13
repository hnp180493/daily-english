import { Injectable } from '@angular/core';
import { PronunciationAttempt } from '../../models/pronunciation.model';

export interface PronunciationStats {
  totalAttempts: number;
  uniqueExercises: number;
  averageScore: number;
  bestScore: number;
  scoreTrend: ScoreTrendPoint[];
  topMispronouncedWords: MispronouncedWord[];
  topIssues: IssueCount[];
  attemptsByDay: { date: string; count: number; avgScore: number }[];
}

export interface ScoreTrendPoint {
  timestamp: number;
  score: number;
}

export interface MispronouncedWord {
  word: string;
  errorCount: number;
  totalCount: number;
  errorRate: number;
  sampleIssue?: string;
}

export interface IssueCount {
  bucket: string;
  count: number;
  examples: string[];
}

const PHONEME_BUCKETS: Array<{ key: string; label: string; patterns: RegExp[] }> = [
  { key: 'th-voiceless', label: 'Âm /θ/ (th vô thanh - think, three)', patterns: [/\/θ\//, /\bth(?:i|in|ree|ank|ought)\b/i, /th\s*v[oô].?\s*thanh/i] },
  { key: 'th-voiced', label: 'Âm /ð/ (th hữu thanh - the, this)', patterns: [/\/ð\//, /th\s*h[ưữ].?\s*thanh/i] },
  { key: 'r-l', label: '/r/ vs /l/', patterns: [/\/r\/.*\/l\/|\/l\/.*\/r\//, /r\s*vs\s*l/i, /nh[âầ]m\s*r\s*v[àa]\s*l/i] },
  { key: 'ending-consonant', label: 'Phụ âm cuối (mất ending consonant)', patterns: [/ending\s*consonant/i, /ph[uụ]\s*[âaă]m\s*cu[oôố]i/i, /m[âấ]t\s*[âaă]m\s*cu[oôố]i/i, /b[oỏ]\s*[âaă]m\s*cu[oôố]i/i] },
  { key: 'word-stress', label: 'Trọng âm từ', patterns: [/word\s*stress/i, /tr[oọ]ng\s*[âaă]m/i, /stress/i] },
  { key: 'sentence-rhythm', label: 'Nhịp điệu câu / intonation', patterns: [/intonation/i, /rhythm/i, /nh[ịi]p\s*[đd][iị][êệe]u/i, /ng[uữ]\s*[đdđ][iị][êệe]u/i] },
  { key: 'vowel-length', label: 'Độ dài nguyên âm / schwa', patterns: [/schwa/i, /vowel\s*length/i, /nguy[êe]n\s*[âaă]m/i, /[âa]m\s*d[àa]i/i] },
  { key: 'linking', label: 'Linking giữa các từ', patterns: [/linking/i, /n[oốô]i\s*[âaă]m/i, /li[êe]n\s*k[êe]t\s*[âaă]m/i] }
];

@Injectable({ providedIn: 'root' })
export class PronunciationAggregatorService {
  aggregate(attempts: PronunciationAttempt[]): PronunciationStats {
    if (!attempts || attempts.length === 0) {
      return this.empty();
    }

    const sorted = [...attempts].sort(
      (a, b) => this.toTime(a.timestamp) - this.toTime(b.timestamp)
    );

    const scores = sorted.map(a => a.feedback?.overallScore ?? 0);
    const totalScore = scores.reduce((sum, s) => sum + s, 0);
    const averageScore = Math.round(totalScore / scores.length);
    const bestScore = Math.max(...scores);
    const uniqueExercises = new Set(sorted.map(a => a.exerciseId)).size;

    // For error breakdowns, only consider the latest attempt per (exerciseId, sentenceIndex).
    // This way, when a user fixes a word, the old error stops being counted.
    const latestPerSentence = this.latestPerSentence(sorted);

    return {
      totalAttempts: sorted.length,
      uniqueExercises,
      averageScore,
      bestScore,
      scoreTrend: this.buildScoreTrend(sorted),
      topMispronouncedWords: this.buildMispronouncedWords(latestPerSentence),
      topIssues: this.buildIssueBuckets(latestPerSentence),
      attemptsByDay: this.buildAttemptsByDay(sorted)
    };
  }

  /**
   * Pick the most recent attempt per (exerciseId, sentenceIndex).
   * Used for current-state error breakdowns so improvements are reflected immediately.
   */
  private latestPerSentence(attempts: PronunciationAttempt[]): PronunciationAttempt[] {
    const map = new Map<string, PronunciationAttempt>();
    for (const a of attempts) {
      const key = `${a.exerciseId}::${a.sentenceIndex}`;
      const existing = map.get(key);
      if (!existing || this.toTime(a.timestamp) >= this.toTime(existing.timestamp)) {
        map.set(key, a);
      }
    }
    return Array.from(map.values());
  }

  private empty(): PronunciationStats {
    return {
      totalAttempts: 0,
      uniqueExercises: 0,
      averageScore: 0,
      bestScore: 0,
      scoreTrend: [],
      topMispronouncedWords: [],
      topIssues: [],
      attemptsByDay: []
    };
  }

  private buildScoreTrend(sorted: PronunciationAttempt[]): ScoreTrendPoint[] {
    // Keep last 30 to avoid huge chart
    const tail = sorted.slice(-30);
    return tail.map(a => ({
      timestamp: this.toTime(a.timestamp),
      score: a.feedback?.overallScore ?? 0
    }));
  }

  private buildMispronouncedWords(attempts: PronunciationAttempt[]): MispronouncedWord[] {
    const totals = new Map<string, number>();
    const errors = new Map<string, number>();
    const samples = new Map<string, string>();

    for (const attempt of attempts) {
      const perWord = attempt.feedback?.perWordFeedback ?? [];
      for (const w of perWord) {
        const key = w.word.toLowerCase();
        if (!key) continue;
        totals.set(key, (totals.get(key) ?? 0) + 1);
        if (!w.ok) {
          errors.set(key, (errors.get(key) ?? 0) + 1);
          if (w.issue && !samples.has(key)) {
            samples.set(key, w.issue);
          }
        }
      }
    }

    const rows: MispronouncedWord[] = [];
    errors.forEach((errorCount, word) => {
      const totalCount = totals.get(word) ?? errorCount;
      rows.push({
        word,
        errorCount,
        totalCount,
        errorRate: Math.round((errorCount / totalCount) * 100),
        sampleIssue: samples.get(word)
      });
    });

    rows.sort((a, b) => b.errorCount - a.errorCount || b.errorRate - a.errorRate);
    return rows.slice(0, 8);
  }

  private buildIssueBuckets(attempts: PronunciationAttempt[]): IssueCount[] {
    const buckets = new Map<string, { count: number; examples: Set<string>; label: string }>();
    PHONEME_BUCKETS.forEach(b =>
      buckets.set(b.key, { count: 0, examples: new Set(), label: b.label })
    );

    for (const attempt of attempts) {
      const issues = attempt.feedback?.pronunciationIssues ?? [];
      for (const issue of issues) {
        const matched = PHONEME_BUCKETS.find(b => b.patterns.some(p => p.test(issue)));
        if (matched) {
          const entry = buckets.get(matched.key)!;
          entry.count += 1;
          if (entry.examples.size < 3) entry.examples.add(issue);
        } else {
          // Unbucketed → "other"
          if (!buckets.has('other')) {
            buckets.set('other', { count: 0, examples: new Set(), label: 'Khác' });
          }
          const other = buckets.get('other')!;
          other.count += 1;
          if (other.examples.size < 3) other.examples.add(issue);
        }
      }
    }

    const rows: IssueCount[] = [];
    buckets.forEach((value) => {
      if (value.count > 0) {
        rows.push({
          bucket: value.label,
          count: value.count,
          examples: Array.from(value.examples)
        });
      }
    });

    rows.sort((a, b) => b.count - a.count);
    return rows.slice(0, 6);
  }

  private buildAttemptsByDay(attempts: PronunciationAttempt[]): { date: string; count: number; avgScore: number }[] {
    const groups = new Map<string, number[]>();
    for (const attempt of attempts) {
      const date = this.toIsoDate(attempt.timestamp);
      if (!groups.has(date)) groups.set(date, []);
      groups.get(date)!.push(attempt.feedback?.overallScore ?? 0);
    }
    const rows = Array.from(groups.entries()).map(([date, scores]) => ({
      date,
      count: scores.length,
      avgScore: Math.round(scores.reduce((s, v) => s + v, 0) / scores.length)
    }));
    rows.sort((a, b) => a.date.localeCompare(b.date));
    return rows.slice(-30);
  }

  private toTime(value: Date | string | number): number {
    if (value instanceof Date) return value.getTime();
    if (typeof value === 'string') return new Date(value).getTime();
    return value;
  }

  private toIsoDate(value: Date | string | number): string {
    const d = value instanceof Date ? value : new Date(value);
    return d.toISOString().slice(0, 10);
  }
}
