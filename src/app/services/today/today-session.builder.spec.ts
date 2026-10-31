import { DifficultyLevel, Exercise } from '../../models/exercise.model';
import {
  TODAY_LIMITS,
  buildCloze,
  buildGradePrompt,
  buildSession,
  parseGrade,
  localDateString,
  scoreTranslation,
  seededRandom,
  splitSentences,
} from './today-session.builder';

function exercise(id: string, level: DifficultyLevel, en: string, vi: string): Exercise {
  return {
    id,
    title: id,
    level,
    category: 'daily-life' as any,
    description: '',
    sourceText: vi,
    englishText: en,
    highlightedSentences: [],
    hints: [],
  };
}

const EN =
  'This weekend, I go to the park with my family. We bring food for a picnic. The weather is sunny and warm. ' +
  'My child plays on the swing happily. My wife reads a book under the cool shade of a tree. ' +
  'I play football with my son. We had a wonderful day. I love family moments like this.';
const VI =
  'Cuối tuần này, tôi đi công viên cùng gia đình. Chúng tôi mang theo đồ ăn để dã ngoại. Trời nắng đẹp và ấm áp. ' +
  'Con tôi chơi xích đu rất vui. Vợ tôi đọc sách dưới bóng cây mát rượi. ' +
  'Tôi chơi bóng đá với con trai. Chúng tôi đã có một ngày thật tuyệt vời. Tôi yêu những khoảnh khắc gia đình như thế này.';

describe('today-session.builder', () => {
  it('splitSentences splits on terminal punctuation', () => {
    expect(splitSentences('Hi there. How are you? Great!')).toEqual(['Hi there.', 'How are you?', 'Great!']);
    expect(splitSentences('')).toEqual([]);
  });

  it('seededRandom is deterministic per seed', () => {
    const a = seededRandom('2026-10-31');
    const b = seededRandom('2026-10-31');
    const c = seededRandom('2026-11-01');
    const seqA = [a(), a(), a()];
    expect([b(), b(), b()]).toEqual(seqA);
    expect([c(), c(), c()]).not.toEqual(seqA);
  });

  describe('buildCloze', () => {
    it('blanks a content word and offers it among 4 unique options', () => {
      const cloze = buildCloze('My wife reads a book under the cool shade.', ['picnic', 'weather', 'swing'], seededRandom('x'))!;
      expect(cloze.sentence).toContain('_____');
      expect(cloze.sentence).not.toContain(cloze.answer);
      expect(cloze.options.length).toBe(4);
      expect(cloze.options).toContain(cloze.answer);
      expect(new Set(cloze.options.map((o) => o.toLowerCase())).size).toBe(4);
    });

    it('never blanks stopwords or short words', () => {
      expect(buildCloze('I am in it.', [], seededRandom('x'))).toBeNull();
    });

    it('keeps the capitalisation of distractors consistent with the answer', () => {
      const cloze = buildCloze('Football is fun.', ['weather', 'picnic'], seededRandom('y'))!;
      expect(cloze.answer).toBe('Football');
      for (const o of cloze.options) expect(o[0]).toBe(o[0].toUpperCase());
    });
  });

  describe('buildSession', () => {
    const exercises = [
      exercise('ex-1', DifficultyLevel.BEGINNER, EN, VI),
      exercise('ex-2', DifficultyLevel.ADVANCED, EN, VI),
    ];
    const base = {
      date: '2026-10-31',
      round: 0,
      level: DifficultyLevel.BEGINNER,
      exercises,
      dueCardIds: ['c1', 'c2'],
      avoidExerciseIds: new Set<string>(),
    };

    it('orders steps review → cloze → shadow → translate with expected counts', () => {
      const session = buildSession(base)!;
      expect(session.exerciseId).toBe('ex-1');
      const kinds = session.steps.map((s) => s.kind);
      expect(kinds.filter((k) => k === 'review').length).toBe(2);
      expect(kinds.filter((k) => k === 'cloze').length).toBe(TODAY_LIMITS.CLOZE);
      expect(kinds.filter((k) => k === 'shadow').length).toBe(TODAY_LIMITS.SHADOW);
      expect(kinds.filter((k) => k === 'translate').length).toBe(TODAY_LIMITS.TRANSLATE);
      expect(kinds.join(',')).toMatch(/^(review,)*(cloze,)+(shadow,)+translate$/);
    });

    it('does not reuse the same sentence across steps', () => {
      const session = buildSession(base)!;
      const sentences = session.steps.map((s) =>
        s.kind === 'cloze' ? s.vi : s.kind === 'shadow' ? s.vi : s.kind === 'translate' ? s.vi : null
      ).filter(Boolean);
      expect(new Set(sentences).size).toBe(sentences.length);
    });

    it('pairs translation with the matching Vietnamese sentence', () => {
      const t = buildSession(base)!.steps.find((s) => s.kind === 'translate') as any;
      expect(splitSentences(VI).indexOf(t.vi)).toBe(splitSentences(EN).indexOf(t.en));
    });

    it('caps review cards', () => {
      const many = Array.from({ length: 20 }, (_, i) => `c${i}`);
      const session = buildSession({ ...base, dueCardIds: many })!;
      expect(session.steps.filter((s) => s.kind === 'review').length).toBe(TODAY_LIMITS.REVIEW);
    });

    it('replaces the translation with an extra cloze when sentences are not aligned', () => {
      const misaligned = [exercise('ex-1', DifficultyLevel.BEGINNER, EN, 'Một câu duy nhất.')];
      const session = buildSession({ ...base, exercises: misaligned, dueCardIds: [] })!;
      expect(session.steps.some((s) => s.kind === 'translate')).toBeFalse();
      expect(session.steps.filter((s) => s.kind === 'cloze').length).toBe(TODAY_LIMITS.CLOZE + 1);
    });

    it('is stable for the same day and changes for another round', () => {
      expect(buildSession(base)).toEqual(buildSession(base));
      const other = buildSession({ ...base, round: 1 })!;
      expect(other.steps).not.toEqual(buildSession(base)!.steps);
    });

    it('returns null when there is no content', () => {
      expect(buildSession({ ...base, exercises: [] })).toBeNull();
    });

    describe('with review sentences', () => {
      const reviewSentences = [
        { exerciseId: 'ex-7', vi: 'Tôi đã quên chìa khoá.', en: 'I forgot my keys.' },
        { exerciseId: 'ex-8', vi: 'Trời mưa to.', en: 'It is raining heavily.' },
        { exerciseId: 'ex-9', vi: 'Cô ấy rất bận.', en: 'She is very busy.' },
        { exerciseId: 'ex-10', vi: 'Thêm một câu.', en: 'One more sentence.' },
      ];

      it('puts up to REVIEW_SENTENCES old mistakes right after flashcards', () => {
        const session = buildSession({ ...base, reviewSentences })!;
        const kinds = session.steps.map((s) => s.kind);
        expect(kinds.slice(0, 2)).toEqual(['review', 'review']);
        const fromReview = session.steps.filter((s) => s.kind === 'translate' && s.fromReview);
        expect(fromReview.length).toBe(TODAY_LIMITS.REVIEW_SENTENCES);
        expect(session.steps[2]).toEqual({ kind: 'translate', vi: 'Tôi đã quên chìa khoá.', en: 'I forgot my keys.', fromReview: 'ex-7' });
      });

      it('still ends with the regular translation step', () => {
        const last = buildSession({ ...base, reviewSentences })!.steps.at(-1)!;
        expect(last.kind).toBe('translate');
        expect((last as any).fromReview).toBeUndefined();
      });
    });

    describe('with Reader sentences', () => {
      const readerText =
        'Coffee farmers in the Highlands depend on stable prices. Robusta beans tolerate heat better than Arabica. ' +
        'Many families export their harvest every winter. Prices collapsed when the global market crashed.';
      const readerSentences = splitSentences(readerText).map((sentence) => ({
        sentence,
        textWords: readerText.split(/\W+/).filter(Boolean),
      }));

      it('mixes in Reader cloze/shadow steps without changing the session length', () => {
        const plain = buildSession(base)!;
        const mixed = buildSession({ ...base, readerSentences, learningWords: new Set(['tolerate']) })!;
        expect(mixed.steps.length).toBe(plain.steps.length);
        const fromReader = mixed.steps.filter((s) => 'fromReader' in s && s.fromReader);
        expect(fromReader.filter((s) => s.kind === 'cloze').length).toBe(TODAY_LIMITS.READER_CLOZE);
        expect(fromReader.filter((s) => s.kind === 'shadow').length).toBe(TODAY_LIMITS.READER_SHADOW);
      });

      it('blanks the word the learner is studying', () => {
        const mixed = buildSession({ ...base, readerSentences, learningWords: new Set(['tolerate']) })!;
        const answers = mixed.steps.filter((s) => s.kind === 'cloze' && s.fromReader).map((s: any) => s.answer.toLowerCase());
        expect(answers).toContain('tolerate');
      });
    });
  });

  describe('scoreTranslation', () => {
    it('gives 100 for an exact match ignoring case and punctuation', () => {
      expect(scoreTranslation('we had a wonderful day', 'We had a wonderful day.')).toBe(100);
    });

    it('gives partial credit and penalises missing words', () => {
      const s = scoreTranslation('We had a good day', 'We had a wonderful day.');
      expect(s).toBe(80);
    });

    it('gives 0 for empty answers', () => {
      expect(scoreTranslation('', 'Hello')).toBe(0);
    });
  });

  describe('parseGrade', () => {
    it('reads and clamps the AI grade', () => {
      const g = parseGrade('```json\n{"score": 104.6, "corrected": "I learn the names of constellations.", "feedback": "Rất tốt"}\n```')!;
      expect(g).toEqual({ score: 100, corrected: 'I learn the names of constellations.', feedback: 'Rất tốt' });
    });

    it('rejects output without a numeric score', () => {
      expect(parseGrade('{"score": "great"}')).toBeNull();
      expect(parseGrade('no json')).toBeNull();
    });

    it('buildGradePrompt includes all three sentences', () => {
      const msgs = buildGradePrompt('Xin chào', 'Hello', 'Hi');
      expect(msgs[1].content).toContain('Xin chào');
      expect(msgs[1].content).toContain('Reference: Hello');
      expect(msgs[1].content).toContain('Learner: Hi');
    });
  });

  it('localDateString formats local dates', () => {
    expect(localDateString(new Date(2026, 0, 5))).toBe('2026-01-05');
  });
});
