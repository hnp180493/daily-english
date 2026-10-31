import { WebSpeechAnalyzerService } from './web-speech-analyzer.service';
import { PronunciationContext } from '../../models/pronunciation.model';

describe('WebSpeechAnalyzerService', () => {
  const analyzer = new WebSpeechAnalyzerService();
  const ctx = (expectedText: string): PronunciationContext => ({ level: 'beginner' as any, expectedText });

  it('scores a perfect transcript 100 regardless of case and punctuation', () => {
    const fb = analyzer.analyze('i like green tea', ctx('I like green tea.'));
    expect(fb.overallScore).toBe(100);
    expect(fb.perWordFeedback!.every((w) => w.ok)).toBeTrue();
  });

  it('flags a missing word as deleted', () => {
    const fb = analyzer.analyze('I like tea', ctx('I like green tea'));
    expect(fb.overallScore).toBe(75);
    const green = fb.perWordFeedback!.find((w) => w.word === 'green')!;
    expect(green.ok).toBeFalse();
    expect(green.issue).toContain('Không nói');
  });

  it('flags a different word as substituted', () => {
    const fb = analyzer.analyze('I like black tea', ctx('I like green tea'));
    const green = fb.perWordFeedback!.find((w) => w.word === 'green')!;
    expect(green.ok).toBeFalse();
    expect(green.issue).toContain('black');
  });

  it('tolerates one-letter differences on longer words (colour/color)', () => {
    const fb = analyzer.analyze('my favourite colour', ctx('my favorite color'));
    expect(fb.overallScore).toBe(100);
  });

  it('requires exact matches for short words', () => {
    const fb = analyzer.analyze('I lit tea', ctx('I let tea'));
    expect(fb.perWordFeedback!.find((w) => w.word === 'let')!.ok).toBeFalse();
  });

  it('dampens the score when Web Speech confidence is low', () => {
    const fb = analyzer.analyze('I like green tea', ctx('I like green tea'), 0.3);
    expect(fb.overallScore).toBe(85);
  });

  it('returns an empty result for an empty transcript', () => {
    const fb = analyzer.analyze('   ', ctx('Hello world'));
    expect(fb.overallScore).toBe(0);
    expect(fb.perWordFeedback).toEqual([]);
  });

  it('reports extra spoken words', () => {
    const fb = analyzer.analyze('I really like green tea', ctx('I like green tea'));
    expect(fb.pronunciationIssues.join(' ')).toContain('really');
  });
});
