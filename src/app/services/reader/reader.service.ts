import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ReadingPassage } from '../../models/reading.model';
import { AIUnifiedService } from '../ai/ai-unified.service';
import { FlashcardService } from '../flashcard.service';
import { ReadingService } from '../reading.service';
import { SkillSyncService, mergeRecords } from '../skill-sync.service';
import { Vocab, VocabEntry, WordStatus, markRemainingKnown, parseLookup, statusOf } from './reader.logic';

export interface ReaderText {
  id: string;
  title: string;
  content: string;
  createdAt: number;
  lastOpenedAt: number;
  /** Set when the text was opened from the built-in reading passages. */
  sampleId?: string;
}

export const READER_LIMITS = {
  MAX_TEXTS: 30,
  /** Keeps a synced row comfortably under the 512 KB cap in user_skill_data. */
  MAX_CHARS: 12000,
  LOOKUP_CACHE: 300,
} as const;

const TEXTS_KEY = 'reader-texts-v1';
const VOCAB_KEY = 'reader-vocab-v1';
const LOOKUP_CACHE_KEY = 'reader-lookup-cache-v1';

/**
 * LingQ-style reader state: the learner's own texts plus a personal vocabulary
 * of learning/known words. Both are stored locally and synced for signed-in users.
 * Saving a word creates a flashcard (word + meaning + original sentence), so it
 * shows up in "Học hôm nay" reviews.
 */
@Injectable({ providedIn: 'root' })
export class ReaderService {
  private sync = inject(SkillSyncService);
  private flashcards = inject(FlashcardService);
  private reading = inject(ReadingService);
  private ai = inject(AIUnifiedService);

  readonly texts = signal<ReaderText[]>(load<ReaderText[]>(TEXTS_KEY, []));
  readonly vocab = signal<Vocab>(load<Vocab>(VOCAB_KEY, {}));
  readonly knownCount = computed(() => Object.values(this.vocab()).filter((v) => v.status === 'known').length);
  readonly learningCount = computed(() => Object.values(this.vocab()).filter((v) => v.status === 'learning').length);
  readonly sortedTexts = computed(() => [...this.texts()].sort((a, b) => b.lastOpenedAt - a.lastOpenedAt));

  private lookupCache: Record<string, { meaning: string; note?: string }> = load(LOOKUP_CACHE_KEY, {});

  constructor() {
    // Texts can be deleted → newest-wins. Vocab only grows/changes per word → per-word merge.
    this.sync.register<ReaderText[]>({
      key: TEXTS_KEY,
      read: () => this.texts(),
      write: (_uid, value) => {
        this.texts.set(Array.isArray(value) ? value : []);
        save(TEXTS_KEY, this.texts());
      },
    });
    this.sync.register<Vocab>({
      key: VOCAB_KEY,
      read: () => this.vocab(),
      write: (_uid, value) => {
        this.vocab.set(value ?? {});
        save(VOCAB_KEY, this.vocab());
      },
      merge: (local, remote) => mergeRecords(local, remote, (a, b) => (a.updatedAt >= b.updatedAt ? a : b)),
    });
  }

  // ---------- texts ----------

  addText(title: string, content: string): ReaderText {
    const now = Date.now();
    const text: ReaderText = {
      id: `rt_${now.toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
      title: title.trim() || deriveTitle(content),
      content: content.trim().slice(0, READER_LIMITS.MAX_CHARS),
      createdAt: now,
      lastOpenedAt: now,
    };
    this.setTexts([text, ...this.texts()]);
    return text;
  }

  /** Open a built-in passage in the reader (reuses the existing copy if any). */
  openSample(passage: ReadingPassage): ReaderText {
    const existing = this.texts().find((t) => t.sampleId === passage.id);
    if (existing) {
      this.touch(existing.id);
      return existing;
    }
    const text = this.addText(passage.title, passage.passage);
    const withSample = { ...text, sampleId: passage.id };
    this.setTexts(this.texts().map((t) => (t.id === text.id ? withSample : t)));
    return withSample;
  }

  getText(id: string): ReaderText | undefined {
    return this.texts().find((t) => t.id === id);
  }

  touch(id: string): void {
    this.setTexts(this.texts().map((t) => (t.id === id ? { ...t, lastOpenedAt: Date.now() } : t)));
  }

  deleteText(id: string): void {
    this.setTexts(this.texts().filter((t) => t.id !== id));
  }

  samples(): Promise<ReadingPassage[]> {
    return firstValueFrom(this.reading.getAllPassages());
  }

  // ---------- vocabulary ----------

  status(word: string): WordStatus {
    return statusOf(word, this.vocab());
  }

  entry(word: string): VocabEntry | undefined {
    return this.vocab()[word];
  }

  setStatus(word: string, status: WordStatus, meaning?: string): void {
    const next = { ...this.vocab() };
    if (status === 'new') delete next[word];
    else next[word] = { status, meaning: meaning ?? next[word]?.meaning, updatedAt: Date.now() };
    this.setVocab(next);
  }

  /** Mark the word as learning and create a flashcard with the original sentence. */
  saveWord(word: string, meaning: string, sentence: string): boolean {
    this.setStatus(word, 'learning', meaning.trim() || undefined);
    if (this.flashcards.hasCardForWord(word)) return false;
    this.flashcards
      .createCustomCard({ front: word, back: meaning.trim() || '—', example: sentence, category: 'reader', tags: ['reader'] })
      .subscribe();
    return true;
  }

  /** "Finish text": every still-new word becomes known. Returns how many words changed. */
  finishText(words: string[]): number {
    const { vocab, changed } = markRemainingKnown(words, this.vocab());
    if (changed) this.setVocab(vocab);
    return changed;
  }

  // ---------- lookup ----------

  canLookup(): boolean {
    return this.ai.isConfigured();
  }

  cachedLookup(word: string): { meaning: string; note?: string } | undefined {
    return this.lookupCache[word];
  }

  /** Ask the configured AI provider for the Vietnamese meaning of a word in its sentence. */
  async lookup(word: string, sentence: string): Promise<{ meaning: string; note?: string } | null> {
    const cached = this.lookupCache[word];
    if (cached) return cached;
    if (!this.canLookup()) return null;

    const raw = await firstValueFrom(
      this.ai.complete(
        [
          {
            role: 'system',
            content:
              'You are a concise English-Vietnamese dictionary for Vietnamese learners. Reply with JSON only: ' +
              '{"meaning": "<short Vietnamese meaning that fits THIS sentence>", "note": "<part of speech + one short usage tip in Vietnamese, optional>"}',
          },
          { role: 'user', content: `Word: "${word}"\nSentence: "${sentence}"` },
        ],
        { maxTokens: 150 }
      )
    );
    const parsed = parseLookup(raw);
    if (parsed) {
      this.lookupCache[word] = parsed;
      const keys = Object.keys(this.lookupCache);
      if (keys.length > READER_LIMITS.LOOKUP_CACHE) delete this.lookupCache[keys[0]];
      save(LOOKUP_CACHE_KEY, this.lookupCache);
    }
    return parsed;
  }

  private setTexts(texts: ReaderText[]): void {
    this.texts.set(texts.slice(0, READER_LIMITS.MAX_TEXTS));
    save(TEXTS_KEY, this.texts());
    this.sync.markChanged(TEXTS_KEY);
  }

  private setVocab(vocab: Vocab): void {
    this.vocab.set(vocab);
    save(VOCAB_KEY, vocab);
    this.sync.markChanged(VOCAB_KEY);
  }
}

function deriveTitle(content: string): string {
  const firstLine = content.trim().split('\n')[0] ?? '';
  return firstLine.length > 60 ? `${firstLine.slice(0, 57)}...` : firstLine || 'Untitled';
}

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function save(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Quota exceeded: in-memory state still works this session.
  }
}
