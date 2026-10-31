import { ChangeDetectionStrategy, Component, HostListener, OnDestroy, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { ReaderService } from '../../services/reader/reader.service';
import { ReaderToken, WordStatus, statusOf, textStats, tokenize } from '../../services/reader/reader.logic';
import { TranslationService } from '../../services/translation.service';
import { TTSService } from '../../services/tts.service';

interface Selection {
  word: string;
  surface: string;
  sentence: string;
}

/**
 * Reading view: new words are blue, words you are learning are yellow, known
 * words are plain. Click a word to see its meaning, save it as a flashcard or
 * mark it known. "Finish" marks every remaining blue word as known.
 */
@Component({
  selector: 'app-reader-view',
  imports: [RouterLink],
  templateUrl: './reader-view.html',
  styleUrl: './reader.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReaderViewComponent implements OnDestroy {
  private route = inject(ActivatedRoute);
  private readonly id = toSignal(this.route.paramMap.pipe(map((p) => p.get('id') ?? '')), { initialValue: '' });

  protected reader = inject(ReaderService);
  protected translate = inject(TranslationService);
  private tts = inject(TTSService);

  protected readonly text = computed(() => this.reader.getText(this.id()));
  protected readonly doc = computed(() => tokenize(this.text()?.content ?? ''));
  protected readonly stats = computed(() => textStats(this.doc().words, this.reader.vocab()));

  protected selected = signal<Selection | null>(null);
  protected meaning = signal('');
  protected note = signal<string | null>(null);
  protected looking = signal(false);
  protected lookupError = signal(false);
  protected savedCount = signal(0);
  protected finished = signal<number | null>(null);
  protected playingSentence = signal<number | null>(null);
  private playRun = 0;
  private touched = false;

  protected readonly canLookup = this.reader.canLookup();

  constructor() {
    queueMicrotask(() => this.markOpened());
  }

  ngOnDestroy(): void {
    this.stopReading();
  }

  protected statusOf(token: ReaderToken): WordStatus | null {
    return token.word ? statusOf(token.word, this.reader.vocab(), this.doc().properNouns) : null;
  }

  async select(token: ReaderToken): Promise<void> {
    if (!token.word) return;
    const word = token.word;
    const sentence = this.doc().sentences[token.sentence] ?? '';
    this.selected.set({ word, surface: token.text, sentence });
    this.note.set(null);
    this.lookupError.set(false);
    this.tts.speak(token.text);

    const saved = this.reader.entry(word)?.meaning;
    const cached = this.reader.cachedLookup(word);
    this.meaning.set(saved ?? cached?.meaning ?? '');
    this.note.set(cached?.note ?? null);
    if (saved || cached || !this.canLookup) return;

    this.looking.set(true);
    try {
      const result = await this.reader.lookup(word, sentence);
      // Ignore late answers for a word the learner already moved away from.
      if (this.selected()?.word !== word) return;
      if (result) {
        if (!this.meaning()) this.meaning.set(result.meaning);
        this.note.set(result.note ?? null);
      } else {
        this.lookupError.set(true);
      }
    } catch {
      if (this.selected()?.word === word) this.lookupError.set(true);
    } finally {
      if (this.selected()?.word === word) this.looking.set(false);
    }
  }

  close(): void {
    this.selected.set(null);
  }

  save(): void {
    const sel = this.selected();
    if (!sel) return;
    if (this.reader.saveWord(sel.word, this.meaning(), sel.sentence)) this.savedCount.update((n) => n + 1);
    this.close();
  }

  setStatus(status: WordStatus): void {
    const sel = this.selected();
    if (!sel) return;
    this.reader.setStatus(sel.word, status, this.meaning() || undefined);
    this.close();
  }

  finish(): void {
    this.stopReading();
    this.finished.set(this.reader.finishText(this.doc().words));
    this.close();
  }

  speak(text: string): void {
    this.stopReading();
    this.tts.speak(text);
  }

  /** Read the whole text aloud sentence by sentence, highlighting the current one. */
  toggleReading(): void {
    if (this.playingSentence() !== null) return this.stopReading();
    const run = ++this.playRun;
    const sentences = this.doc().sentences;
    const next = (i: number) => {
      if (run !== this.playRun || i >= sentences.length) {
        if (run === this.playRun) this.playingSentence.set(null);
        return;
      }
      this.playingSentence.set(i);
      this.tts.speak(sentences[i], () => setTimeout(() => next(i + 1), 250));
    };
    next(0);
  }

  stopReading(): void {
    this.playRun++;
    this.playingSentence.set(null);
    this.tts.stop();
  }

  protected googleTranslateUrl(word: string): string {
    return `https://translate.google.com/?sl=en&tl=vi&op=translate&text=${encodeURIComponent(word)}`;
  }

  protected highlight(sentence: string, surface: string): { before: string; match: string; after: string } {
    const i = sentence.toLowerCase().indexOf(surface.toLowerCase());
    if (i < 0) return { before: sentence, match: '', after: '' };
    return { before: sentence.slice(0, i), match: sentence.slice(i, i + surface.length), after: sentence.slice(i + surface.length) };
  }

  private markOpened(): void {
    if (this.touched || !this.text()) return;
    this.touched = true;
    this.reader.touch(this.id());
  }

  @HostListener('document:keydown', ['$event'])
  onKeydown(event: KeyboardEvent): void {
    const target = event.target as HTMLElement | null;
    if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
      if (event.key === 'Enter' && this.selected()) {
        event.preventDefault();
        this.save();
      }
      return;
    }
    if (event.key === 'Escape') this.close();
    if (!this.selected()) return;
    if (event.key === 's') this.save();
    if (event.key === 'k') this.setStatus('known');
  }
}
