import { COMMON_KNOWN, markRemainingKnown, normalizeWord, parseLookup, statusOf, textStats, tokenize, Vocab } from './reader.logic';

describe('reader.logic', () => {
  describe('normalizeWord', () => {
    it('lowercases, strips punctuation and possessive', () => {
      expect(normalizeWord('Vietnam’s')).toBe('vietnam');
      expect(normalizeWord('"Hello,')).toBe('hello');
      expect(normalizeWord('Don’t')).toBe("don't");
      expect(normalizeWord('well-known')).toBe('well-known');
    });

    it('rejects tokens with digits or no letters', () => {
      expect(normalizeWord('2026')).toBe('');
      expect(normalizeWord('...')).toBe('');
    });
  });

  describe('tokenize', () => {
    const doc = tokenize('Coffee is popular. People drink it daily!\n\nVietnam’s coffee is strong.');

    it('keeps paragraphs and sentences', () => {
      expect(doc.paragraphs.length).toBe(2);
      expect(doc.sentences).toEqual(['Coffee is popular.', 'People drink it daily!', 'Vietnam’s coffee is strong.']);
    });

    it('reconstructs the original text from tokens', () => {
      expect(doc.paragraphs[0].map((t) => t.text).join('')).toBe('Coffee is popular. People drink it daily!');
    });

    it('links each word to its sentence and lists unique words once', () => {
      const daily = doc.paragraphs[0].find((t) => t.word === 'daily')!;
      expect(doc.sentences[daily.sentence]).toBe('People drink it daily!');
      expect(doc.words.filter((w) => w === 'coffee').length).toBe(1);
      expect(doc.words).toContain('vietnam');
    });

    it('detects proper nouns (always capitalised, seen mid-sentence) and leaves them out of words', () => {
      const d = tokenize('Coffee from Brazil is cheap. Brazil grows coffee. People in Ho Chi Minh City love it.');
      expect(d.properNouns.has('brazil')).toBeTrue();
      expect(d.properNouns.has('minh')).toBeTrue();
      expect(d.properNouns.has('coffee')).toBeFalse(); // also appears lowercase
      expect(d.properNouns.has('people')).toBeFalse(); // only at sentence start
      expect(d.words).not.toContain('brazil');
      expect(statusOf('brazil', {}, d.properNouns)).toBe('known');
    });

    it('marks punctuation and spaces as non-words', () => {
      expect(doc.paragraphs[0].filter((t) => t.word === null).every((t) => !/[A-Za-z]/.test(t.text))).toBeTrue();
    });
  });

  describe('status and stats', () => {
    const vocab: Vocab = {
      coffee: { status: 'known', updatedAt: 1 },
      popular: { status: 'learning', meaning: 'phổ biến', updatedAt: 1 },
    };

    it('treats common function words as known and unknown words as new', () => {
      expect(COMMON_KNOWN.has('the')).toBeTrue();
      expect(statusOf('the', {})).toBe('known');
      expect(statusOf('caffeine', {})).toBe('new');
      expect(statusOf('popular', vocab)).toBe('learning');
    });

    it('computes counts and known percentage', () => {
      const stats = textStats(['coffee', 'is', 'popular', 'caffeine'], vocab);
      expect(stats).toEqual({ total: 4, newCount: 1, learningCount: 1, knownPct: 50 });
    });

    it('markRemainingKnown only promotes new words', () => {
      const { vocab: next, changed } = markRemainingKnown(['coffee', 'popular', 'caffeine', 'the'], vocab, 5);
      expect(changed).toBe(1);
      expect(next['caffeine']).toEqual({ status: 'known', updatedAt: 5 });
      expect(next['popular'].status).toBe('learning');
    });
  });

  describe('parseLookup', () => {
    it('reads JSON even inside code fences', () => {
      expect(parseLookup('```json\n{"meaning":"phổ biến","note":"adj"}\n```')).toEqual({ meaning: 'phổ biến', note: 'adj' });
    });

    it('returns null for unusable output', () => {
      expect(parseLookup('sorry')).toBeNull();
      expect(parseLookup('{"meaning":""}')).toBeNull();
    });
  });
});
