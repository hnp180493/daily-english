import { FeedbackItem } from '../models/exercise.model';

/**
 * Grades a translation against the exercise's own reference sentence, so the
 * core exercise works without an AI provider. Word-level alignment with
 * spelling tolerance; feedback is shaped like the AI's FeedbackItem[] so the
 * existing feedback panel renders it unchanged.
 */

/**
 * Same splitter ExerciseStateService uses for the Vietnamese source. A '.' between digits
 * ("500.000 đồng") is a thousands separator, not a sentence end.
 */
const SENTENCE_RE = /(?:\d\.(?=\d)|[^.!?])+[.!?]+(?=['"]?\s|$)/g;

const CONTRACTIONS: Record<string, string> = {
  "i'm": 'i am', "you're": 'you are', "we're": 'we are', "they're": 'they are',
  "he's": 'he is', "she's": 'she is', "it's": 'it is', "that's": 'that is', "there's": 'there is',
  "what's": 'what is', "let's": 'let us',
  "i've": 'i have', "you've": 'you have', "we've": 'we have', "they've": 'they have',
  "i'll": 'i will', "you'll": 'you will', "we'll": 'we will', "they'll": 'they will', "it'll": 'it will',
  "he'll": 'he will', "she'll": 'she will',
  "i'd": 'i would', "you'd": 'you would', "we'd": 'we would', "they'd": 'they would',
  "don't": 'do not', "doesn't": 'does not', "didn't": 'did not', "isn't": 'is not', "aren't": 'are not',
  "wasn't": 'was not', "weren't": 'were not', "haven't": 'have not', "hasn't": 'has not', "hadn't": 'had not',
  "can't": 'cannot', "couldn't": 'could not', "won't": 'will not', "wouldn't": 'would not',
  "shouldn't": 'should not', "mustn't": 'must not',
};

export interface OfflineGrade {
  score: number;
  feedback: FeedbackItem[];
  /** Reference sentence with the words the learner missed/changed in 'quotes'. */
  highlightedReference: string;
}

type Op =
  | { kind: 'match'; ref: string; ans: string }
  | { kind: 'spelling'; ref: string; ans: string }
  | { kind: 'substitute'; ref: string; ans: string }
  | { kind: 'missing'; ref: string }
  | { kind: 'extra'; ans: string };

/** Titles/abbreviations whose period doesn't end a sentence ("Ms. Mai", "Mr. Nguyen"). */
const ABBREVIATION_END = /\b(Mr|Mrs|Ms|Dr|Prof|St|Jr|Sr|vs|etc|e\.g|i\.e)\.$/i;

/** Split English text into sentences, re-joining pieces that only ended on an abbreviation. */
export function splitEnglishSentences(text: string): string[] {
  const raw = (text ?? '').match(SENTENCE_RE)?.map((s) => s.trim()) ?? [];
  const out: string[] = [];
  for (const piece of raw) {
    if (out.length && ABBREVIATION_END.test(out[out.length - 1])) out[out.length - 1] += ` ${piece}`;
    else out.push(piece);
  }
  return out;
}

/** The reference English sentence aligned with source sentence `index`, or null if misaligned. */
export function referenceSentence(englishText: string | undefined, index: number, sourceSentenceCount: number): string | null {
  const refs = splitEnglishSentences(englishText ?? '');
  if (refs.length !== sourceSentenceCount || !refs[index]) return null;
  return refs[index];
}

/** Lowercase, expand contractions, drop punctuation → comparable tokens. */
export function tokens(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .split(/\s+/)
    .map((w) => w.replace(/^[^a-z0-9']+|[^a-z0-9']+$/g, ''))
    .filter(Boolean)
    .flatMap((w) => (CONTRACTIONS[w] ?? w).split(' '));
}

function levenshtein(a: string, b: string): number {
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...new Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
  }
  return dp[a.length][b.length];
}

/** A typo rather than a different word: small edit distance relative to length. */
function isTypo(ref: string, ans: string): boolean {
  if (ref.length < 4 || ans.length < 3) return false;
  return levenshtein(ref, ans) <= (ref.length >= 8 ? 2 : 1);
}

/** Word-level alignment (Needleman-Wunsch). Typos cost 0.3, other edits 1. */
function align(ref: string[], ans: string[]): { ops: Op[]; cost: number } {
  const m = ref.length;
  const n = ans.length;
  const subCost = (i: number, j: number) => (ref[i] === ans[j] ? 0 : isTypo(ref[i], ans[j]) ? 0.3 : 1);
  const dp = Array.from({ length: m + 1 }, () => new Array<number>(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + subCost(i - 1, j - 1));
    }
  }
  const ops: Op[] = [];
  let i = m;
  let j = n;
  while (i > 0 || j > 0) {
    const diagOk = i > 0 && j > 0 && Math.abs(dp[i][j] - (dp[i - 1][j - 1] + subCost(i - 1, j - 1))) < 1e-9;
    const deleteOk = i > 0 && Math.abs(dp[i][j] - (dp[i - 1][j] + 1)) < 1e-9;
    // On a tie between "different word" and "missing word", call it missing: walking backwards this
    // pairs the learner's word with the earlier, usually closer, reference word
    // ("so beautiful" vs "such a beautiful" → so→such, missing "a").
    const preferMissing = deleteOk && diagOk && subCost(i - 1, j - 1) === 1;
    if (diagOk && !preferMissing) {
      const r = ref[i - 1];
      const a = ans[j - 1];
      ops.unshift(r === a ? { kind: 'match', ref: r, ans: a } : isTypo(r, a) ? { kind: 'spelling', ref: r, ans: a } : { kind: 'substitute', ref: r, ans: a });
      i--;
      j--;
    } else if (deleteOk) {
      ops.unshift({ kind: 'missing', ref: ref[i - 1] });
      i--;
    } else {
      ops.unshift({ kind: 'extra', ans: ans[j - 1] });
      j--;
    }
  }
  return { ops, cost: dp[m][n] };
}

export function gradeOffline(answer: string, reference: string): OfflineGrade {
  const ref = tokens(reference);
  const ans = tokens(answer);
  const { ops, cost } = align(ref, ans);

  const denom = Math.max(ref.length, ans.length, 1);
  let score = Math.round(Math.max(0, 1 - cost / denom) * 100);
  // Only a perfect match may reach 100 (100 auto-advances in the exercise flow).
  if (cost > 0) score = Math.min(score, 99);

  const spelling = ops.filter((o): o is Extract<Op, { kind: 'spelling' }> => o.kind === 'spelling');
  const substitutes = ops.filter((o): o is Extract<Op, { kind: 'substitute' }> => o.kind === 'substitute');
  const missing = ops.filter((o): o is Extract<Op, { kind: 'missing' }> => o.kind === 'missing');
  const extra = ops.filter((o): o is Extract<Op, { kind: 'extra' }> => o.kind === 'extra');

  const highlightedReference = highlightReference(reference, ops);
  const feedback: FeedbackItem[] = [];
  const item = (type: FeedbackItem['type'], originalText: string, suggestion: string, explanation: string): FeedbackItem => ({
    type,
    originalText,
    suggestion,
    explanation,
    startIndex: -1,
    endIndex: -1,
  });

  if (spelling.length) {
    feedback.push(
      item(
        'spelling',
        spelling.map((o) => o.ans).join(', '),
        spelling.map((o) => `'${o.ref}'`).join(', '),
        `Sai chính tả: ${spelling.map((o) => `"${o.ans}" → '${o.ref}'`).join(' · ')}`
      )
    );
  }
  if (substitutes.length) {
    feedback.push(
      item(
        'vocabulary',
        substitutes.map((o) => o.ans).join(', '),
        substitutes.map((o) => `'${o.ref}'`).join(', '),
        `Câu mẫu dùng ${substitutes.map((o) => `'${o.ref}'`).join(', ')} thay cho ${substitutes.map((o) => `"${o.ans}"`).join(', ')}.`
      )
    );
  }
  if (missing.length || extra.length) {
    const parts: string[] = [];
    if (missing.length) parts.push(`Thiếu: ${missing.map((o) => `'${o.ref}'`).join(', ')}`);
    if (extra.length) parts.push(`Thừa: ${extra.map((o) => `"${o.ans}"`).join(', ')}`);
    feedback.push(item('structure', extra.map((o) => o.ans).join(', '), missing.map((o) => `'${o.ref}'`).join(', ') || '—', parts.join(' · ')));
  }
  if (cost > 0) {
    feedback.push(
      item(
        'suggestion',
        answer,
        highlightedReference,
        'Câu mẫu tham khảo. Nếu câu của bạn khác nhưng vẫn đúng nghĩa, bấm nút “Câu mình cũng đúng”.'
      )
    );
  }

  return { score, feedback, highlightedReference };
}

/**
 * Rebuild the reference keeping its original casing/punctuation, quoting words the learner
 * got wrong. Adjacent wrong words share one pair of quotes ('such a') because the feedback
 * panel's highlighter can't match two quoted words separated by a single space.
 */
function highlightReference(reference: string, ops: Op[]): string {
  const wrong = ops.filter((o) => o.kind === 'missing' || o.kind === 'substitute' || o.kind === 'spelling').map((o) => (o as { ref: string }).ref);
  if (!wrong.length) return reference;
  const pending = [...wrong];
  const words = reference.split(/\s+/).filter(Boolean);
  const flagged = words.map((word) => {
    const core = word.toLowerCase().replace(/^[^a-z0-9']+|[^a-z0-9']+$/g, '');
    const idx = core ? pending.indexOf(core) : -1;
    if (idx < 0) return false;
    pending.splice(idx, 1);
    return true;
  });

  const out: string[] = [];
  for (let i = 0; i < words.length; ) {
    if (!flagged[i]) {
      out.push(words[i++]);
      continue;
    }
    let j = i;
    while (j + 1 < words.length && flagged[j + 1]) j++;
    const group = words.slice(i, j + 1).join(' ');
    const m = group.match(/^([^A-Za-z0-9']*)(.*?)([^A-Za-z0-9']*)$/);
    out.push(m ? `${m[1]}'${m[2]}'${m[3]}` : group);
    i = j + 1;
  }
  return out.join(' ');
}

/**
 * Progressive hints from the reference sentence (no AI needed):
 * 1 → first letter of every word, 2 → every other word revealed, 3 → full sentence.
 */
export function offlineHint(reference: string, level: number): string {
  const words = reference.split(/\s+/).filter(Boolean);
  if (level >= 3) return `Câu mẫu: **${reference}** — hãy tự gõ lại để nhớ.`;
  const masked = words.map((w, i) => {
    if (level === 2 && i % 2 === 0) return w;
    return w.replace(/^([^A-Za-z]*[A-Za-z])([A-Za-z'’-]*)/, (_, first: string, rest: string) => first + '·'.repeat(rest.length));
  });
  const label = level === 2 ? 'Một nửa câu' : `${words.length} từ, chữ cái đầu`;
  return `${label}: ${masked.join(' ')}`;
}
