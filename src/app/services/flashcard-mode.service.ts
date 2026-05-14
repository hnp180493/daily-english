import { Injectable, inject } from '@angular/core';
import { CardPrompt, CardType, Flashcard, FlashcardStudyPrefs } from '../models/memory-retention.model';
import { FsrsService } from './fsrs.service';

/**
 * Decides which review mode (flip / cloze / multiple-choice / type-answer /
 * audio-cue / reverse) to use for a given card, and builds the prompt payload
 * the study UI renders.
 *
 * Strategy (when prefs.modePreference === 'auto'):
 *   - new          → multiple-choice (low friction, recognizes the meaning)
 *   - learning     → cloze if example available, else multiple-choice
 *   - relearning   → multiple-choice (rebuild confidence)
 *   - review       → rotate between type-answer, audio-cue, reverse
 *                     to force genuine recall rather than card recognition
 *
 * Strategy (when prefs.modePreference === fixed type):
 *   - Use that type if the card supports it; fall back to 'flip' otherwise.
 */
@Injectable({ providedIn: 'root' })
export class FlashcardModeService {
  private fsrs = inject(FsrsService);

  /**
   * Build the prompt for a single card. `pool` is the full list of cards the
   * service can sample distractors from (for multiple-choice). Pass the same
   * `now` as the session start for stable rotation.
   */
  buildPrompt(card: Flashcard, pool: Flashcard[], prefs: FlashcardStudyPrefs, now: Date = new Date()): CardPrompt {
    const type = this.pickMode(card, prefs, now);
    return this.renderPrompt(card, type, pool);
  }

  pickMode(card: Flashcard, prefs: FlashcardStudyPrefs, now: Date): CardType {
    if (prefs.modePreference !== 'auto') {
      return this.fallbackIfUnsupported(card, prefs.modePreference);
    }

    const state = card.state ?? (card.reviewCount > 0 ? 'review' : 'new');
    const hasExample = !!card.example;

    if (state === 'new' || state === 'relearning') {
      return 'multiple-choice';
    }
    if (state === 'learning') {
      return hasExample ? 'cloze' : 'multiple-choice';
    }

    // review state — rotate by review count to keep things fresh
    const rotation = (card.reviewCount ?? 0) % 4;
    switch (rotation) {
      case 0:
        return 'type-answer';
      case 1:
        return hasExample ? 'cloze' : 'reverse';
      case 2:
        return 'audio-cue';
      case 3:
      default:
        return 'reverse';
    }
  }

  private fallbackIfUnsupported(card: Flashcard, requested: CardType): CardType {
    if (requested === 'cloze' && !card.example) {
      return 'multiple-choice';
    }
    return requested;
  }

  private renderPrompt(card: Flashcard, type: CardType, pool: Flashcard[]): CardPrompt {
    switch (type) {
      case 'flip':
        return {
          type,
          card,
          questionText: card.front,
          answerText: card.back,
        };

      case 'cloze':
        return this.renderCloze(card);

      case 'multiple-choice':
        return this.renderMultipleChoice(card, pool);

      case 'type-answer':
        return {
          type,
          card,
          questionText: card.back, // VN meaning
          answerText: card.front, // expected EN word
        };

      case 'audio-cue':
        return {
          type,
          card,
          questionText: card.front, // EN word spoken
          answerText: card.back, // VN meaning shown after
          speakQuestion: true,
        };

      case 'reverse':
        return {
          type,
          card,
          questionText: card.back, // VN meaning first
          answerText: card.front, // EN word revealed
        };
    }
  }

  private renderCloze(card: Flashcard): CardPrompt {
    const example = card.example ?? card.front;
    const word = this.firstFormOfWord(card.front);
    const masked = this.maskWordInSentence(example, word);
    return {
      type: 'cloze',
      card,
      questionText: masked,
      answerText: word,
      clozeAnswer: word,
    };
  }

  private renderMultipleChoice(card: Flashcard, pool: Flashcard[]): CardPrompt {
    const distractors = this.pickDistractors(card, pool, 3);
    const all = [card.back, ...distractors];
    const shuffled = this.shuffle(all);
    return {
      type: 'multiple-choice',
      card,
      questionText: card.front,
      answerText: card.back,
      options: shuffled,
      correctIndex: shuffled.indexOf(card.back),
    };
  }

  /**
   * Pick `count` distinct distractor back-texts from the pool, avoiding the
   * target card and avoiding meanings that are identical to it.
   */
  private pickDistractors(target: Flashcard, pool: Flashcard[], count: number): string[] {
    const sameCategory = pool.filter((c) => c.id !== target.id && c.category === target.category && c.back !== target.back);
    const others = pool.filter((c) => c.id !== target.id && c.back !== target.back);
    const orderedPool = sameCategory.length >= count ? sameCategory : [...sameCategory, ...others];
    const seenBacks = new Set<string>();
    const result: string[] = [];

    for (const card of this.shuffle(orderedPool)) {
      if (seenBacks.has(card.back)) continue;
      seenBacks.add(card.back);
      result.push(card.back);
      if (result.length >= count) break;
    }

    // If the pool was too small, pad with placeholder meanings (rare for new users).
    while (result.length < count) {
      result.push(this.fakeDistractor(target, result.length));
    }
    return result;
  }

  private fakeDistractor(target: Flashcard, index: number): string {
    const placeholders = ['không liên quan', 'ý nghĩa khác', 'không phải đáp án này'];
    return placeholders[index % placeholders.length];
  }

  private firstFormOfWord(front: string): string {
    // Use only the first whitespace-separated token in case `front` is a phrase.
    return front.trim().split(/\s+/)[0] || front.trim();
  }

  private maskWordInSentence(sentence: string, word: string): string {
    if (!word) return sentence;
    const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // Match the word or simple inflected forms (s, ed, ing). Case-insensitive,
    // word-boundary anchored so we don't mask substrings.
    const pattern = new RegExp(`\\b${escaped}(s|es|ed|ing)?\\b`, 'i');
    if (pattern.test(sentence)) {
      return sentence.replace(pattern, '_____');
    }
    // Fallback: didn't find the word in the example — just append a blank line.
    return `${sentence}\n[fill in: _____]`;
  }

  private shuffle<T>(arr: T[]): T[] {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  /**
   * Compare a user-typed answer to the expected answer using lenient matching:
   * lowercase, strip punctuation, allow 1 char Levenshtein difference for words ≥ 4 chars.
   */
  matchTypedAnswer(typed: string, expected: string): boolean {
    const a = this.normalize(typed);
    const b = this.normalize(expected);
    if (a === b) return true;
    if (a.length === 0 || b.length === 0) return false;
    if (Math.min(a.length, b.length) >= 4 && this.levenshtein(a, b) <= 1) return true;
    return false;
  }

  private normalize(text: string): string {
    return text
      .toLowerCase()
      .replace(/[.,!?;:"'()]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
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
