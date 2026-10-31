import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  OnDestroy,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { DifficultyLevel } from '../../models/exercise.model';
import { ReviewRating } from '../../models/memory-retention.model';
import { WordFeedback } from '../../models/pronunciation.model';
import { FlashcardService } from '../../services/flashcard.service';
import { FsrsService, previewRatingIntervals } from '../../services/fsrs.service';
import { SpeechRecognitionService } from '../../services/pronunciation/speech-recognition.service';
import { WebSpeechAnalyzerService } from '../../services/pronunciation/web-speech-analyzer.service';
import { ProgressService } from '../../services/progress.service';
import { scoreTranslation, TODAY_LIMITS } from '../../services/today/today-session.builder';
import { TodaySessionService } from '../../services/today/today-session.service';
import { TranslationService } from '../../services/translation.service';
import { TTSService } from '../../services/tts.service';

/**
 * "Học hôm nay" — one button, ~10 minutes, no decisions:
 * due flashcards → fill-in-the-blank → shadowing → one translation.
 */
@Component({
  selector: 'app-today',
  imports: [RouterLink],
  templateUrl: './today.html',
  styleUrl: './today.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TodayComponent implements OnInit, OnDestroy {
  protected today = inject(TodaySessionService);
  protected translate = inject(TranslationService);
  protected speech = inject(SpeechRecognitionService);
  private flashcards = inject(FlashcardService);
  private fsrs = inject(FsrsService);
  private tts = inject(TTSService);
  private analyzer = inject(WebSpeechAnalyzerService);
  private progress = inject(ProgressService);

  protected readonly levels = [DifficultyLevel.BEGINNER, DifficultyLevel.INTERMEDIATE, DifficultyLevel.ADVANCED];
  protected readonly limits = TODAY_LIMITS;
  protected readonly ratings: ReviewRating[] = [1, 2, 3, 4];
  protected level = signal<DifficultyLevel>(DifficultyLevel.BEGINNER);
  protected loading = signal(false);
  protected error = signal<string | null>(null);

  // Per-step UI state (reset on every step)
  protected revealed = signal(false);
  protected picked = signal<string | null>(null);
  protected shadowScore = signal<number | null>(null);
  protected shadowWords = signal<WordFeedback[]>([]);
  protected shadowTranscript = signal('');
  protected answerText = signal('');
  protected translateScore = signal<number | null>(null);
  protected saveCard = signal(true);
  protected grading = signal(false);
  protected gradedByAI = signal(false);
  protected aiCorrected = signal<string | null>(null);
  protected aiFeedback = signal<string | null>(null);
  protected readonly canGradeWithAI = this.today.canGradeWithAI();

  protected readonly speechSupported = this.speech.isSupported();
  protected readonly dueCount = computed(() => this.flashcards.dueFlashcards().length);
  protected readonly streak = computed(() => {
    this.progress.getProgressSignal()(); // re-evaluate when progress changes
    return this.progress.calculateStreak();
  });
  protected readonly step = this.today.currentStep;
  protected readonly card = computed(() => {
    const s = this.step();
    return s?.kind === 'review' ? this.flashcards.allFlashcards().find((c) => c.id === s.cardId) ?? null : null;
  });
  protected readonly intervals = computed(() => {
    const c = this.card();
    return c ? previewRatingIntervals(this.fsrs.migrateFromLegacy(c), this.fsrs) : null;
  });
  protected readonly progressPct = computed(() =>
    this.today.totalSteps() ? Math.round((this.today.index() / this.today.totalSteps()) * 100) : 0
  );
  protected readonly estimatedSteps = computed(
    () => Math.min(this.dueCount(), TODAY_LIMITS.REVIEW) + TODAY_LIMITS.CLOZE + TODAY_LIMITS.SHADOW + TODAY_LIMITS.TRANSLATE
  );
  /** Last 7 days, oldest first, for the streak strip. */
  protected readonly week = computed(() => {
    const done = new Set(this.today.completedDates());
    const lastActive = this.progress.getProgressSignal()().lastStreakDate;
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      return { key, label: d.toLocaleDateString(this.locale(), { weekday: 'narrow' }), done: done.has(key) || key === lastActive, isToday: i === 6 };
    });
  });

  async ngOnInit(): Promise<void> {
    const active = this.today.session();
    this.level.set(active && this.today.isActive() ? active.level : await this.today.resolveLevel());
  }

  ngOnDestroy(): void {
    this.tts.stop();
    this.speech.cancel();
  }

  async start(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    this.today.setLevel(this.level());
    const ok = await this.today.start(this.level());
    this.loading.set(false);
    if (!ok) this.error.set(this.translate.t('today.no_content'));
    this.resetStepState();
  }

  chooseLevel(level: DifficultyLevel): void {
    this.level.set(level);
  }

  quit(): void {
    this.tts.stop();
    this.speech.cancel();
    this.today.abandon();
  }

  // ---- review ----
  reveal(): void {
    this.revealed.set(true);
    const c = this.card();
    if (c) this.tts.speak(c.example || c.front);
  }

  rate(rating: ReviewRating): void {
    const c = this.card();
    if (c) this.flashcards.rateCard(c.id, rating).subscribe();
    this.next({ kind: 'review' });
  }

  // ---- cloze ----
  pick(option: string): void {
    if (this.picked()) return;
    this.picked.set(option);
    const s = this.step();
    if (s?.kind === 'cloze') this.tts.speak(s.sentence.replace('_____', s.answer));
  }

  // ---- shadow ----
  listen(text: string, slow = false): void {
    const { rate } = this.tts.getSettings();
    if (slow) this.tts.setRate(Math.max(0.6, rate * 0.75));
    this.tts.speak(text, () => slow && this.tts.setRate(rate));
  }

  async toggleRecording(): Promise<void> {
    const s = this.step();
    if (s?.kind !== 'shadow') return;
    if (this.speech.state() === 'listening') {
      const result = await this.speech.stop();
      const feedback = this.analyzer.analyze(result.transcript, { level: this.level(), expectedText: s.sentence }, result.confidence);
      this.shadowTranscript.set(result.transcript);
      this.shadowScore.set(feedback.overallScore);
      this.shadowWords.set(feedback.perWordFeedback ?? []);
      return;
    }
    this.tts.stop();
    this.shadowScore.set(null);
    this.speech.reset();
    try {
      await this.speech.start();
    } catch {
      /* errorMessage signal is shown in the template */
    }
  }

  // ---- translate ----
  async checkTranslation(): Promise<void> {
    const s = this.step();
    const answer = this.answerText().trim();
    if (s?.kind !== 'translate' || !answer || this.grading()) return;

    this.grading.set(true);
    const grade = await this.today.gradeTranslation(s.vi, s.en, answer);
    this.grading.set(false);
    if (this.step() !== s) return; // learner moved on meanwhile

    const score = grade?.score ?? scoreTranslation(answer, s.en);
    this.gradedByAI.set(!!grade);
    this.aiCorrected.set(grade && grade.corrected && grade.corrected !== answer ? grade.corrected : null);
    this.aiFeedback.set(grade?.feedback || null);
    this.translateScore.set(score);
    this.saveCard.set(score < 80);
    this.tts.speak(s.en);
  }

  // ---- flow ----
  continue(): void {
    const s = this.step();
    if (!s) return;
    switch (s.kind) {
      case 'cloze':
        if (!this.picked()) return;
        this.next({ kind: 'cloze', correct: this.picked() === s.answer });
        break;
      case 'shadow':
        this.next({ kind: 'shadow', score: this.shadowScore() ?? undefined });
        break;
      case 'translate':
        if (this.translateScore() === null) {
          void this.checkTranslation();
          return;
        }
        this.next({ kind: 'translate', score: this.translateScore()!, saveCard: this.saveCard() });
        break;
      case 'review':
        if (!this.card()) this.next({ kind: 'review' }); // card was deleted meanwhile
        break;
    }
  }

  private next(result: Parameters<TodaySessionService['submit']>[0]): void {
    this.tts.stop();
    this.speech.cancel();
    this.today.submit(result);
    this.resetStepState();
  }

  private resetStepState(): void {
    this.revealed.set(false);
    this.picked.set(null);
    this.shadowScore.set(null);
    this.shadowWords.set([]);
    this.shadowTranscript.set('');
    this.answerText.set('');
    this.translateScore.set(null);
    this.saveCard.set(true);
    this.grading.set(false);
    this.gradedByAI.set(false);
    this.aiCorrected.set(null);
    this.aiFeedback.set(null);
  }

  protected intervalLabel(value: number | undefined): string {
    if (value === undefined) return '';
    return value < 0 ? `${-value}${this.translate.t('today.unit.min')}` : `${value}${this.translate.t('today.unit.day')}`;
  }

  protected optionState(option: string): 'idle' | 'correct' | 'wrong' | 'dim' {
    const picked = this.picked();
    const s = this.step();
    if (!picked || s?.kind !== 'cloze') return 'idle';
    if (option === s.answer) return 'correct';
    return option === picked ? 'wrong' : 'dim';
  }

  protected scoreClass(score: number | null): string {
    if (score === null) return '';
    return score >= 80 ? 'good' : score >= 50 ? 'ok' : 'low';
  }

  private locale(): string {
    return this.translate.language() === 'en' ? 'en-US' : 'vi-VN';
  }

  @HostListener('document:keydown', ['$event'])
  onKeydown(event: KeyboardEvent): void {
    const target = event.target as HTMLElement | null;
    if (target && (target.tagName === 'TEXTAREA' || target.tagName === 'INPUT')) return;
    const s = this.step();
    if (!s || !this.today.isActive()) return;

    if (s.kind === 'review') {
      if (!this.revealed() && (event.key === ' ' || event.key === 'Enter')) {
        event.preventDefault();
        this.reveal();
      } else if (this.revealed() && ['1', '2', '3', '4'].includes(event.key)) {
        this.rate(Number(event.key) as ReviewRating);
      }
      return;
    }
    if (s.kind === 'cloze' && !this.picked() && ['1', '2', '3', '4'].includes(event.key)) {
      const option = s.options[Number(event.key) - 1];
      if (option) this.pick(option);
      return;
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      this.continue();
    }
  }
}
