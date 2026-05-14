import { Injectable } from '@angular/core';
import { PronunciationContext, PronunciationFeedback, WordFeedback } from '../../models/pronunciation.model';

/**
 * Compares a Web Speech transcript to the expected sentence and produces
 * `PronunciationFeedback` shaped like the AI-provider output, so downstream
 * code (stats, history, UI) does not need to branch.
 *
 * Limits: Web Speech only returns words — no phoneme or rhythm scoring.
 * The score reflects how accurately you spoke the words, NOT the quality
 * of each phoneme. UI labels this clearly so users know.
 */
@Injectable({ providedIn: 'root' })
export class WebSpeechAnalyzerService {
  analyze(transcript: string, context: PronunciationContext, confidence = 0): PronunciationFeedback {
    const expected = this.tokenize(context.expectedText);
    const spoken = this.tokenize(transcript);

    if (expected.length === 0) {
      return this.emptyFeedback('Không có câu mẫu để so sánh.');
    }
    if (spoken.length === 0) {
      return this.emptyFeedback('Không nhận được bản phiên âm. Hãy thử nói lại to rõ hơn.');
    }

    const alignment = this.alignTokens(expected, spoken);
    const perWord: WordFeedback[] = alignment.map((step) => {
      if (step.kind === 'match') {
        return { word: step.expected!, ok: true };
      }
      if (step.kind === 'substitute') {
        return { word: step.expected!, ok: false, issue: `Đã nói "${step.spoken}" thay vì "${step.expected}"` };
      }
      // delete: word missing from speech
      return { word: step.expected!, ok: false, issue: 'Không nói từ này' };
    });

    const correct = perWord.filter((w) => w.ok).length;
    const total = perWord.length;
    const rawScore = Math.round((correct / total) * 100);

    // Slight confidence dampening — if Web Speech confidence is very low, the
    // transcript itself might be wrong, so we should not over-reward.
    const confidenceFactor = confidence > 0 ? Math.max(0.85, Math.min(1, confidence + 0.15)) : 1;
    const overallScore = Math.round(rawScore * confidenceFactor);

    const missing = perWord.filter((w) => !w.ok).map((w) => w.word);
    const substituted = alignment.filter((s) => s.kind === 'substitute');
    const extras = alignment.filter((s) => s.kind === 'insert').map((s) => s.spoken!);

    const pronunciationIssues: string[] = [];
    if (missing.length > 0) {
      pronunciationIssues.push(
        `Thiếu hoặc phát âm không rõ ${missing.length} từ: ${missing.slice(0, 5).map((w) => `"${w}"`).join(', ')}` +
          (missing.length > 5 ? '...' : '')
      );
    }
    if (substituted.length > 0) {
      pronunciationIssues.push(
        `Đọc nhầm ${substituted.length} từ: ` +
          substituted
            .slice(0, 3)
            .map((s) => `"${s.expected}" → "${s.spoken}"`)
            .join(', ')
      );
    }
    if (extras.length > 0 && extras.length <= 3) {
      pronunciationIssues.push(`Có từ thừa: ${extras.map((w) => `"${w}"`).join(', ')}`);
    }
    if (pronunciationIssues.length === 0 && overallScore < 100) {
      pronunciationIssues.push('Câu được nhận đúng nhưng confidence thấp — thử nói chậm và rõ hơn.');
    }

    const strengths: string[] = [];
    if (correct > 0) {
      strengths.push(`Đọc đúng ${correct}/${total} từ.`);
    }
    if (correct === total) {
      strengths.push('Toàn bộ câu được nhận diện chính xác.');
    } else if (rawScore >= 70) {
      strengths.push('Phần lớn câu đã rõ nghĩa.');
    }
    if (confidence >= 0.85) {
      strengths.push('Web Speech tự tin cao với bản phiên âm (≥85%).');
    }

    const rawFeedback = this.buildRawFeedback(overallScore, correct, total, transcript);

    return {
      overallScore: Math.max(0, Math.min(100, overallScore)),
      rawFeedback,
      pronunciationIssues,
      strengths,
      perWordFeedback: perWord,
    };
  }

  private buildRawFeedback(score: number, correct: number, total: number, transcript: string): string {
    const truncatedTranscript = transcript.length > 120 ? transcript.slice(0, 117) + '...' : transcript;
    if (score >= 90) {
      return `Tuyệt vời — Web Speech nhận đúng ${correct}/${total} từ. Bạn nói rõ ràng. (Bản phiên âm: "${truncatedTranscript}")`;
    }
    if (score >= 70) {
      return `Khá tốt — đúng ${correct}/${total} từ. Có vài chỗ chưa rõ. (Bản phiên âm: "${truncatedTranscript}")`;
    }
    if (score >= 50) {
      return `Cần cải thiện — chỉ đúng ${correct}/${total} từ. Thử nói chậm hơn và phát âm rõ từng từ. (Bản phiên âm: "${truncatedTranscript}")`;
    }
    return `Web Speech chỉ nhận đúng ${correct}/${total} từ. Có thể bạn nói quá nhanh, micro xa, hoặc nền ồn. (Bản phiên âm: "${truncatedTranscript}")`;
  }

  private emptyFeedback(message: string): PronunciationFeedback {
    return {
      overallScore: 0,
      rawFeedback: message,
      pronunciationIssues: [],
      strengths: [],
      perWordFeedback: [],
    };
  }

  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[.,!?;:"'()]/g, '')
      .split(/\s+/)
      .filter(Boolean);
  }

  /**
   * Needleman-Wunsch-style sequence alignment between expected and spoken tokens.
   * Returns a list of steps describing how each expected word was handled.
   */
  private alignTokens(expected: string[], spoken: string[]): AlignmentStep[] {
    const m = expected.length;
    const n = spoken.length;
    const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;

    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        const cost = this.wordsMatch(expected[i - 1], spoken[j - 1]) ? 0 : 1;
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1, // delete expected
          dp[i][j - 1] + 1, // insert spoken
          dp[i - 1][j - 1] + cost
        );
      }
    }

    // Traceback
    const steps: AlignmentStep[] = [];
    let i = m;
    let j = n;
    while (i > 0 || j > 0) {
      if (i > 0 && j > 0 && this.wordsMatch(expected[i - 1], spoken[j - 1]) && dp[i][j] === dp[i - 1][j - 1]) {
        steps.unshift({ kind: 'match', expected: expected[i - 1], spoken: spoken[j - 1] });
        i--; j--;
      } else if (i > 0 && j > 0 && dp[i][j] === dp[i - 1][j - 1] + 1) {
        steps.unshift({ kind: 'substitute', expected: expected[i - 1], spoken: spoken[j - 1] });
        i--; j--;
      } else if (i > 0 && dp[i][j] === dp[i - 1][j] + 1) {
        steps.unshift({ kind: 'delete', expected: expected[i - 1] });
        i--;
      } else {
        steps.unshift({ kind: 'insert', spoken: spoken[j - 1] });
        j--;
      }
    }
    return steps;
  }

  private wordsMatch(a: string, b: string): boolean {
    if (a === b) return true;
    // Tolerate small Levenshtein distance for similar-sounding words (e.g.
    // "color"/"colour", "five"/"fife"). For very short words require exact.
    if (a.length <= 3 || b.length <= 3) return false;
    return this.levenshtein(a, b) <= 1;
  }

  private levenshtein(a: string, b: string): number {
    if (a === b) return 0;
    const m = a.length;
    const n = b.length;
    const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
      }
    }
    return dp[m][n];
  }
}

interface AlignmentStep {
  kind: 'match' | 'substitute' | 'delete' | 'insert';
  expected?: string;
  spoken?: string;
}
