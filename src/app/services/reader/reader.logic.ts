import { splitSentences } from '../today/today-session.builder';

/**
 * Pure helpers for the LingQ-style reader: tokenising a pasted text into
 * clickable words, deciding each word's status and computing text stats.
 */

export type WordStatus = 'new' | 'learning' | 'known';

export interface VocabEntry {
  status: Exclude<WordStatus, 'new'>;
  /** Learner's (or AI-suggested) Vietnamese meaning. */
  meaning?: string;
  updatedAt: number;
}

export type Vocab = Record<string, VocabEntry>;

export interface ReaderToken {
  text: string;
  /** Normalised dictionary key, or null for spaces/punctuation/numbers. */
  word: string | null;
  /** Index into ReaderDoc.sentences. */
  sentence: number;
}

export interface ReaderDoc {
  paragraphs: ReaderToken[][];
  sentences: string[];
  /** Distinct word keys in order of first appearance (proper nouns excluded). */
  words: string[];
  /** Likely names (always capitalised, seen mid-sentence) — shown unhighlighted. */
  properNouns: Set<string>;
}

export interface TextStats {
  total: number;
  newCount: number;
  learningCount: number;
  knownPct: number;
}

/**
 * Very frequent function words treated as known out of the box, so a fresh
 * learner isn't faced with a wall of blue on their first text.
 */
export const COMMON_KNOWN = new Set(
  (
    "a an the i you he she it we they me him her us them my your his its our their this that these those " +
    "is am are was were be been being do does did have has had will would can could shall should may might must " +
    "and or but so if then than because as of in on at to for from by with about into over under up down out " +
    "not no yes very too also just only all some any every each more most many much few little " +
    "what who whom which when where why how there here " +
    "i'm you're he's she's it's we're they're i've you've we've they've i'll you'll we'll they'll " +
    "don't doesn't didn't isn't aren't wasn't weren't can't couldn't won't wouldn't " +
    "one two three go get make take see know think say said like want good new day time year people way " +
    // Very common everyday words most learners already know
    "man woman child children family friend home house school work job money food water city country world " +
    "life thing things part place week month today tomorrow yesterday morning night " +
    "big small long short old young high low great little bad best better first last next other same own " +
    "come came went gone give gave find found tell told ask asked use used work worked call called try " +
    "need feel felt become became leave left put mean keep let begin seem help talk turn start show " +
    "hear play run move live believe bring happen write sit stand lose pay meet include continue learn " +
    "now then always never often sometimes again still even back well after before while during until " +
    "around between through without against such both another something nothing everything someone " +
    "really maybe already almost enough far near"
  ).split(' ')
);

const WORD_RE = /[A-Za-z](?:[A-Za-z'’-]*[A-Za-z])?/g;

/** Normalise a surface form to a vocab key ("Vietnam's" → "vietnam", "Don’t" → "don't"). */
export function normalizeWord(raw: string): string {
  const w = raw.toLowerCase().replace(/’/g, "'").replace(/^[^a-z]+|[^a-z]+$/g, '');
  if (!w || /\d/.test(w)) return '';
  return w.endsWith("'s") && w.length > 3 ? w.slice(0, -2) : w;
}

/** Split text into paragraphs → sentences → word / non-word tokens. */
export function tokenize(text: string): ReaderDoc {
  const sentences: string[] = [];
  const seen = new Set<string>();
  const order: string[] = [];
  const seenLower = new Set<string>();
  const seenCapitalMid = new Set<string>();

  const paragraphs = text
    .replace(/\r\n?/g, '\n')
    .split(/\n\s*\n|\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((paragraph) => {
      const tokens: ReaderToken[] = [];
      for (const sentence of splitSentences(paragraph)) {
        const sentenceIndex = sentences.push(sentence) - 1;
        if (tokens.length) tokens.push({ text: ' ', word: null, sentence: sentenceIndex });
        let last = 0;
        for (const match of sentence.matchAll(WORD_RE)) {
          const start = match.index ?? 0;
          if (start > last) tokens.push({ text: sentence.slice(last, start), word: null, sentence: sentenceIndex });
          const key = normalizeWord(match[0]);
          tokens.push({ text: match[0], word: key || null, sentence: sentenceIndex });
          if (key) {
            if (!seen.has(key)) {
              seen.add(key);
              order.push(key);
            }
            const capital = /^[A-Z]/.test(match[0]);
            if (!capital) seenLower.add(key);
            // Sentence start = only punctuation/quotes before the word
            else if (/[A-Za-z0-9]/.test(sentence.slice(0, start))) seenCapitalMid.add(key);
          }
          last = start + match[0].length;
        }
        if (last < sentence.length) tokens.push({ text: sentence.slice(last), word: null, sentence: sentenceIndex });
      }
      return tokens;
    });

  const properNouns = new Set([...seenCapitalMid].filter((w) => !seenLower.has(w) && w !== 'i'));
  return { paragraphs, sentences, words: order.filter((w) => !properNouns.has(w)), properNouns };
}

/** Status of a word; proper nouns and common words count as known unless the learner set them otherwise. */
export function statusOf(word: string, vocab: Vocab, properNouns?: Set<string>): WordStatus {
  const entry = vocab[word];
  if (entry) return entry.status;
  return COMMON_KNOWN.has(word) || properNouns?.has(word) ? 'known' : 'new';
}

export function textStats(words: string[], vocab: Vocab): TextStats {
  let newCount = 0;
  let learningCount = 0;
  for (const w of words) {
    const s = statusOf(w, vocab);
    if (s === 'new') newCount++;
    else if (s === 'learning') learningCount++;
  }
  const total = words.length;
  const known = total - newCount - learningCount;
  return { total, newCount, learningCount, knownPct: total ? Math.round((known / total) * 100) : 0 };
}

/** Mark every still-new word in `words` as known (LingQ's "finish page"). Returns the new vocab and how many changed. */
export function markRemainingKnown(words: string[], vocab: Vocab, now = Date.now()): { vocab: Vocab; changed: number } {
  const next = { ...vocab };
  let changed = 0;
  for (const w of words) {
    if (statusOf(w, next) === 'new') {
      next[w] = { status: 'known', updatedAt: now };
      changed++;
    }
  }
  return { vocab: next, changed };
}

/**
 * Parse the AI's JSON answer for a word lookup. Tolerates markdown fences and
 * stray text; returns null when nothing usable is found.
 */
export function parseLookup(raw: string): { meaning: string; note?: string } | null {
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    const obj = JSON.parse(match[0]);
    const meaning = String(obj.meaning ?? obj.meaning_vi ?? '').trim();
    if (!meaning) return null;
    const note = obj.note ? String(obj.note).trim() : undefined;
    return { meaning, note: note || undefined };
  } catch {
    return null;
  }
}
