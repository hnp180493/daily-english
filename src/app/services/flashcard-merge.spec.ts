import { mergeCards } from './flashcard.service';
import { Flashcard } from '../models/memory-retention.model';

function card(id: string, front: string, lastReview?: string): Flashcard {
  return {
    id,
    front,
    back: '',
    exerciseId: 'ex-1',
    createdAt: new Date('2026-01-01'),
    easeFactor: 2.5,
    interval: 0,
    nextReviewDate: new Date('2026-01-02'),
    reviewCount: lastReview ? 1 : 0,
    lastReviewDate: lastReview ? new Date(lastReview) : undefined,
  };
}

describe('mergeCards', () => {
  it('unions distinct cards from both lists', () => {
    const merged = mergeCards([card('a', 'apple')], [card('b', 'banana')]);
    expect(merged.map((c) => c.id).sort()).toEqual(['a', 'b']);
  });

  it('dedupes the same word from the same exercise, keeping the most recently reviewed copy', () => {
    const cloud = card('cloud-1', 'apple', '2026-02-01');
    const local = card('local-1', 'apple', '2026-03-01');
    const merged = mergeCards([cloud], [local]);
    expect(merged.length).toBe(1);
    expect(merged[0].id).toBe('local-1');
  });

  it('dedupes by id even if the front text was edited', () => {
    const before = card('a', 'aple', '2026-01-05');
    const after = card('a', 'apple', '2026-01-06');
    const merged = mergeCards([before], [after]);
    expect(merged.length).toBe(1);
    expect(merged[0].front).toBe('apple');
  });

  it('works when stored dates are ISO strings (from JSON)', () => {
    const fromJson = JSON.parse(JSON.stringify([card('a', 'apple', '2026-04-01')]));
    const merged = mergeCards(fromJson, [card('b', 'apple', '2026-01-01')]);
    expect(merged.length).toBe(1);
    expect(merged[0].id).toBe('a');
  });
});
