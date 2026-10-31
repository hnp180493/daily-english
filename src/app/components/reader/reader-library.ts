import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ReadingPassage } from '../../models/reading.model';
import { READER_LIMITS, ReaderService, ReaderText } from '../../services/reader/reader.service';
import { TextStats, textStats, tokenize } from '../../services/reader/reader.logic';
import { TranslationService } from '../../services/translation.service';

/** Reader home: paste a new text, reopen your texts, or start from a sample passage. */
@Component({
  selector: 'app-reader-library',
  imports: [RouterLink],
  templateUrl: './reader-library.html',
  styleUrl: './reader.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReaderLibraryComponent implements OnInit {
  protected reader = inject(ReaderService);
  protected translate = inject(TranslationService);
  private router = inject(Router);

  protected readonly maxChars = READER_LIMITS.MAX_CHARS;
  protected title = signal('');
  protected content = signal('');
  protected samples = signal<ReadingPassage[]>([]);

  /** Stats per saved text, recomputed when vocabulary changes. */
  protected readonly items = computed(() => {
    const vocab = this.reader.vocab();
    return this.reader.sortedTexts().map((text) => ({ text, stats: textStats(this.wordsOf(text), vocab) }));
  });

  private wordCache = new Map<string, string[]>();

  async ngOnInit(): Promise<void> {
    this.samples.set(await this.reader.samples());
  }

  open(): void {
    if (!this.content().trim()) return;
    const text = this.reader.addText(this.title(), this.content());
    this.router.navigate(['/reader', text.id]);
  }

  openSample(passage: ReadingPassage): void {
    const text = this.reader.openSample(passage);
    this.router.navigate(['/reader', text.id]);
  }

  remove(text: ReaderText, event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    if (confirm(this.translate.t('reader.confirm_delete'))) this.reader.deleteText(text.id);
  }

  protected statsLabel(stats: TextStats): string {
    return this.translate
      .t('reader.stats_short')
      .replace('{new}', String(stats.newCount))
      .replace('{pct}', String(stats.knownPct));
  }

  protected sampleOpened(passage: ReadingPassage): boolean {
    return this.reader.texts().some((t) => t.sampleId === passage.id);
  }

  private wordsOf(text: ReaderText): string[] {
    let words = this.wordCache.get(text.id);
    if (!words) {
      words = tokenize(text.content).words;
      this.wordCache.set(text.id, words);
    }
    return words;
  }
}
