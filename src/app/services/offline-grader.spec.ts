import { gradeOffline, offlineHint, referenceSentence, tokens } from './offline-grader';

describe('offline-grader', () => {
  describe('referenceSentence', () => {
    const en = 'Today was busy. I woke up early! Did you?';
    it('returns the aligned English sentence', () => {
      expect(referenceSentence(en, 1, 3)).toBe('I woke up early!');
    });
    it('does not split on titles like "Ms." or "Mr."', () => {
      const text = "My teacher's name is Ms. Mai. She is kind. Dear Mr. Nguyen, I am writing.";
      expect(referenceSentence(text, 0, 3)).toBe("My teacher's name is Ms. Mai.");
      expect(referenceSentence(text, 2, 3)).toBe('Dear Mr. Nguyen, I am writing.');
    });

    it('returns null when sentence counts do not match', () => {
      expect(referenceSentence(en, 0, 4)).toBeNull();
      expect(referenceSentence(undefined, 0, 1)).toBeNull();
    });
  });

  it('tokens normalises case, punctuation and contractions', () => {
    expect(tokens("I'm happy, it's GREAT!")).toEqual(['i', 'am', 'happy', 'it', 'is', 'great']);
    expect(tokens('I don’t know.')).toEqual(['i', 'do', 'not', 'know']);
  });

  describe('gradeOffline', () => {
    const ref = 'Today was a busy day for me.';

    it('gives 100 and no feedback for an exact match (ignoring case/punctuation/contractions)', () => {
      const g = gradeOffline('today was a busy day for me', ref);
      expect(g.score).toBe(100);
      expect(g.feedback).toEqual([]);
      expect(gradeOffline("I'm tired.", 'I am tired.').score).toBe(100);
    });

    it('treats a typo as a small penalty that still passes (>= 90) but never reaches 100', () => {
      const g = gradeOffline('Today was a bussy day for me', ref);
      expect(g.score).toBeGreaterThanOrEqual(90);
      expect(g.score).toBeLessThan(100);
      expect(g.feedback.find((f) => f.type === 'spelling')!.explanation).toContain('busy');
    });

    it('flags a wrong word and quotes it in the reference', () => {
      const g = gradeOffline('Today is a busy day for me', ref);
      expect(g.score).toBeLessThan(90);
      expect(g.feedback.find((f) => f.type === 'vocabulary')!.explanation).toContain('was');
      expect(g.highlightedReference).toBe("Today 'was' a busy day for me.");
    });

    it('reports missing and extra words', () => {
      const g = gradeOffline('Today was busy day for me very', ref);
      const structure = g.feedback.find((f) => f.type === 'structure')!;
      expect(structure.explanation).toContain("Thiếu: 'a'");
      expect(structure.explanation).toContain('Thừa: "very"');
    });

    it('pairs a wrong word with the closest reference word ("so" → "such", missing "a")', () => {
      const g = gradeOffline('Today is so beautiful day', 'Today is such a beautiful day.');
      expect(g.feedback.find((f) => f.type === 'vocabulary')!.explanation).toBe(`Câu mẫu dùng 'such' thay cho "so".`);
      expect(g.feedback.find((f) => f.type === 'structure')!.explanation).toBe("Thiếu: 'a'");
      expect(g.highlightedReference).toBe("Today is 'such a' beautiful day.");
    });

    it('always ends with the full model sentence when not perfect', () => {
      const g = gradeOffline('Something else entirely', ref);
      const last = g.feedback[g.feedback.length - 1];
      expect(last.type).toBe('suggestion');
      expect(last.originalText).toBe('Something else entirely');
      expect(g.score).toBeLessThan(40);
    });
  });

  describe('offlineHint', () => {
    const ref = 'Today was a busy day.';
    it('level 1 shows first letters only', () => {
      expect(offlineHint(ref, 1)).toBe('5 từ, chữ cái đầu: T···· w·· a b··· d··.');
    });
    it('level 2 reveals every other word', () => {
      expect(offlineHint(ref, 2)).toBe('Một nửa câu: Today w·· a b··· day.');
    });
    it('level 3 gives the whole sentence', () => {
      expect(offlineHint(ref, 3)).toContain('Today was a busy day.');
    });
  });
});
