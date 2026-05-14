import { ChangeDetectionStrategy, Component, OnDestroy, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subject, switchMap, takeUntil } from 'rxjs';
import { LISTENING_CONSTANTS, ListeningTrack } from '../../models/listening.model';
import { ReadingVocabulary } from '../../models/reading.model';
import { ListeningService } from '../../services/listening.service';
import { TTSService } from '../../services/tts.service';
import { FlashcardService } from '../../services/flashcard.service';
import { ToastService } from '../../services/toast.service';

type Mode = 'listen' | 'transcript' | 'quiz' | 'result';

@Component({
  selector: 'app-listening-player',
  imports: [CommonModule, RouterLink],
  templateUrl: './listening-player.html',
  styleUrl: './listening-player.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ListeningPlayerComponent implements OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private service = inject(ListeningService);
  private tts = inject(TTSService);
  private flashcards = inject(FlashcardService);
  private toast = inject(ToastService);
  private destroy$ = new Subject<void>();

  isLoading = signal(true);
  track = signal<ListeningTrack | null>(null);
  mode = signal<Mode>('listen');

  // Playback state
  currentSegment = signal(0);
  isPlaying = signal(false);
  isAutoPlay = signal(true);
  isSlow = signal(false);
  transcriptVisible = signal(false);

  // Quiz state
  quizIndex = signal(0);
  selectedAnswers = signal<Record<string, number>>({});
  quizSubmitted = signal(false);

  currentQuestion = computed(() => {
    const t = this.track();
    if (!t) return null;
    return t.quiz[this.quizIndex()] || null;
  });

  isLastQuestion = computed(() => {
    const t = this.track();
    return t ? this.quizIndex() >= t.quiz.length - 1 : false;
  });

  quizScore = computed(() => {
    const t = this.track();
    if (!t) return 0;
    const answers = this.selectedAnswers();
    const correct = t.quiz.filter((q) => answers[q.id] === q.correctIndex).length;
    return Math.round((correct / t.quiz.length) * 100);
  });

  correctCount = computed(() => {
    const t = this.track();
    if (!t) return 0;
    const answers = this.selectedAnswers();
    return t.quiz.filter((q) => answers[q.id] === q.correctIndex).length;
  });

  constructor() {
    this.route.paramMap
      .pipe(
        switchMap((params) => {
          const slug = params.get('slug') || '';
          this.isLoading.set(true);
          return this.service.getTrackBySlug(slug);
        }),
        takeUntil(this.destroy$)
      )
      .subscribe((track) => {
        this.stop();
        this.track.set(track);
        this.resetState();
        this.isLoading.set(false);
      });
  }

  ngOnDestroy(): void {
    this.tts.stop();
    this.destroy$.next();
    this.destroy$.complete();
  }

  private resetState(): void {
    this.mode.set('listen');
    this.currentSegment.set(0);
    this.transcriptVisible.set(false);
    this.quizIndex.set(0);
    this.selectedAnswers.set({});
    this.quizSubmitted.set(false);
  }

  setMode(mode: Mode): void {
    if (mode !== 'listen' && mode !== 'transcript') {
      this.stop();
    }
    this.mode.set(mode);
  }

  toggleTranscript(): void {
    this.transcriptVisible.update((v) => !v);
  }

  toggleSlow(): void {
    this.isSlow.update((v) => !v);
    this.tts.setRate(this.isSlow() ? LISTENING_CONSTANTS.SLOW_RATE : LISTENING_CONSTANTS.NORMAL_RATE);
  }

  toggleAutoPlay(): void {
    this.isAutoPlay.update((v) => !v);
  }

  playFromStart(): void {
    this.currentSegment.set(0);
    this.playCurrent();
  }

  playCurrent(): void {
    const t = this.track();
    if (!t) return;
    const idx = this.currentSegment();
    const seg = t.segments[idx];
    if (!seg) return;

    this.tts.setRate(this.isSlow() ? LISTENING_CONSTANTS.SLOW_RATE : LISTENING_CONSTANTS.NORMAL_RATE);
    this.isPlaying.set(true);
    this.tts.speak(seg.text, () => {
      this.isPlaying.set(false);
      if (this.isAutoPlay() && idx < t.segments.length - 1) {
        setTimeout(() => {
          this.currentSegment.set(idx + 1);
          this.playCurrent();
        }, seg.pauseAfterMs ?? LISTENING_CONSTANTS.DEFAULT_PAUSE_MS);
      }
    });
  }

  replayCurrent(): void {
    this.tts.stop();
    setTimeout(() => this.playCurrent(), 100);
  }

  next(): void {
    const t = this.track();
    if (!t) return;
    if (this.currentSegment() < t.segments.length - 1) {
      this.tts.stop();
      this.currentSegment.update((i) => i + 1);
      this.playCurrent();
    }
  }

  prev(): void {
    if (this.currentSegment() > 0) {
      this.tts.stop();
      this.currentSegment.update((i) => i - 1);
      this.playCurrent();
    }
  }

  jumpTo(index: number): void {
    this.tts.stop();
    this.currentSegment.set(index);
    this.playCurrent();
  }

  stop(): void {
    this.tts.stop();
    this.isPlaying.set(false);
  }

  startQuiz(): void {
    this.stop();
    this.quizIndex.set(0);
    this.selectedAnswers.set({});
    this.quizSubmitted.set(false);
    this.mode.set('quiz');
  }

  selectAnswer(questionId: string, optionIndex: number): void {
    if (this.quizSubmitted()) return;
    this.selectedAnswers.update((s) => ({ ...s, [questionId]: optionIndex }));
  }

  nextQuestion(): void {
    const t = this.track();
    if (!t) return;
    if (this.quizIndex() < t.quiz.length - 1) {
      this.quizIndex.update((i) => i + 1);
    }
  }

  prevQuestion(): void {
    if (this.quizIndex() > 0) {
      this.quizIndex.update((i) => i - 1);
    }
  }

  submitQuiz(): void {
    const t = this.track();
    if (!t) return;
    this.quizSubmitted.set(true);
    this.service.recordQuiz(t.id, this.quizScore());
    this.mode.set('result');
  }

  isQuizComplete(): boolean {
    const t = this.track();
    if (!t) return false;
    const answers = this.selectedAnswers();
    return t.quiz.every((q) => answers[q.id] !== undefined);
  }

  retryQuiz(): void {
    this.quizIndex.set(0);
    this.selectedAnswers.set({});
    this.quizSubmitted.set(false);
    this.mode.set('quiz');
  }

  selectedForCurrent(): number | undefined {
    const q = this.currentQuestion();
    return q ? this.selectedAnswers()[q.id] : undefined;
  }

  optionClass(questionId: string, optionIndex: number, correctIndex: number): string {
    const selected = this.selectedAnswers()[questionId];
    if (!this.quizSubmitted()) {
      return selected === optionIndex ? 'option-selected' : 'option-default';
    }
    if (optionIndex === correctIndex) return 'option-correct';
    if (optionIndex === selected) return 'option-incorrect';
    return 'option-disabled';
  }

  goBackToList(): void {
    this.router.navigate(['/listening']);
  }

  styleIcon(style: string): string {
    switch (style) {
      case 'news':
        return '📰';
      case 'monologue':
        return '🎙';
      case 'dialogue':
        return '💬';
      case 'announcement':
        return '📢';
      case 'interview':
        return '🎤';
      default:
        return '🔊';
    }
  }

  // -----------------------------
  // Flashcard integration
  // -----------------------------

  isInFlashcards(word: string): boolean {
    return this.flashcards.hasCardForWord(word);
  }

  addWordToFlashcards(v: ReadingVocabulary): void {
    if (this.isInFlashcards(v.word)) return;
    const result = this.flashcards.addFromVocabList([v], { tag: 'listening' });
    if (result.added > 0) {
      this.toast.show(`"${v.word}" added to flashcards.`, 'success', 2000);
    }
  }

  addAllVocabToFlashcards(): void {
    const track = this.track();
    if (!track) return;
    const result = this.flashcards.addFromVocabList(track.vocabulary, { tag: 'listening' });
    if (result.added === 0) {
      this.toast.show(`All ${result.skipped} words already in your flashcards.`, 'info', 2500);
    } else {
      const skippedMsg = result.skipped > 0 ? ` (${result.skipped} already there)` : '';
      this.toast.show(`Added ${result.added} words to flashcards${skippedMsg}.`, 'success', 2500);
    }
  }

  hasUnaddedVocab(): boolean {
    const track = this.track();
    if (!track) return false;
    return track.vocabulary.some((v) => !this.isInFlashcards(v.word));
  }
}
