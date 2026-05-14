import { ChangeDetectionStrategy, Component, OnDestroy, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subject, switchMap, takeUntil } from 'rxjs';
import { ReadingPassage, ReadingQuizAnswer, ReadingVocabulary } from '../../models/reading.model';
import { ReadingService } from '../../services/reading.service';
import { FlashcardService } from '../../services/flashcard.service';
import { ToastService } from '../../services/toast.service';

type Mode = 'read' | 'vocabulary' | 'quiz' | 'result';

@Component({
  selector: 'app-reading-detail',
  imports: [CommonModule, RouterLink],
  templateUrl: './reading-detail.html',
  styleUrl: './reading-detail.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReadingDetailComponent implements OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private service = inject(ReadingService);
  private flashcards = inject(FlashcardService);
  private toast = inject(ToastService);
  private destroy$ = new Subject<void>();

  isLoading = signal(true);
  passage = signal<ReadingPassage | null>(null);
  mode = signal<Mode>('read');

  // Quiz state
  quizIndex = signal(0);
  selectedAnswers = signal<Record<string, number>>({}); // questionId -> selectedIndex
  quizSubmitted = signal(false);

  paragraphs = computed(() => {
    const p = this.passage();
    return p ? p.passage.split(/\n\n+/) : [];
  });

  currentQuestion = computed(() => {
    const p = this.passage();
    if (!p) return null;
    return p.quiz[this.quizIndex()] || null;
  });

  isLastQuestion = computed(() => {
    const p = this.passage();
    if (!p) return false;
    return this.quizIndex() >= p.quiz.length - 1;
  });

  selectedForCurrent = computed(() => {
    const q = this.currentQuestion();
    if (!q) return undefined;
    return this.selectedAnswers()[q.id];
  });

  quizScore = computed(() => {
    const p = this.passage();
    if (!p) return 0;
    const answers = this.selectedAnswers();
    const correct = p.quiz.filter((q) => answers[q.id] === q.correctIndex).length;
    return Math.round((correct / p.quiz.length) * 100);
  });

  correctCount = computed(() => {
    const p = this.passage();
    if (!p) return 0;
    const answers = this.selectedAnswers();
    return p.quiz.filter((q) => answers[q.id] === q.correctIndex).length;
  });

  constructor() {
    this.route.paramMap
      .pipe(
        switchMap((params) => {
          const slug = params.get('slug') || '';
          this.isLoading.set(true);
          return this.service.getPassageBySlug(slug);
        }),
        takeUntil(this.destroy$)
      )
      .subscribe((passage) => {
        this.passage.set(passage);
        this.resetQuiz();
        this.mode.set('read');
        this.isLoading.set(false);
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  setMode(mode: Mode): void {
    this.mode.set(mode);
    if (mode === 'quiz') {
      this.resetQuiz();
    }
  }

  selectAnswer(questionId: string, optionIndex: number): void {
    if (this.quizSubmitted()) return;
    this.selectedAnswers.update((current) => ({ ...current, [questionId]: optionIndex }));
  }

  nextQuestion(): void {
    const p = this.passage();
    if (!p) return;
    if (this.quizIndex() < p.quiz.length - 1) {
      this.quizIndex.update((i) => i + 1);
    }
  }

  prevQuestion(): void {
    if (this.quizIndex() > 0) {
      this.quizIndex.update((i) => i - 1);
    }
  }

  submitQuiz(): void {
    const p = this.passage();
    if (!p) return;
    const answers = this.selectedAnswers();
    const quizAnswers: ReadingQuizAnswer[] = p.quiz.map((q) => ({
      questionId: q.id,
      selectedIndex: answers[q.id] ?? -1,
      isCorrect: answers[q.id] === q.correctIndex,
    }));
    this.service.recordQuizCompletion(p.id, quizAnswers, this.quizScore());
    this.quizSubmitted.set(true);
    this.mode.set('result');
  }

  resetQuiz(): void {
    this.quizIndex.set(0);
    this.selectedAnswers.set({});
    this.quizSubmitted.set(false);
  }

  retryQuiz(): void {
    this.resetQuiz();
    this.mode.set('quiz');
  }

  isQuizComplete(): boolean {
    const p = this.passage();
    if (!p) return false;
    const answers = this.selectedAnswers();
    return p.quiz.every((q) => answers[q.id] !== undefined);
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
    this.router.navigate(['/reading']);
  }

  levelLabel(level?: string): string {
    return level === 'beginner' ? 'Beginner' : level === 'intermediate' ? 'Intermediate' : level === 'advanced' ? 'Advanced' : '';
  }

  // -----------------------------
  // Flashcard integration
  // -----------------------------

  isInFlashcards(word: string): boolean {
    return this.flashcards.hasCardForWord(word);
  }

  addWordToFlashcards(v: ReadingVocabulary): void {
    if (this.isInFlashcards(v.word)) return;
    const passage = this.passage();
    const result = this.flashcards.addFromVocabList([v], {
      tag: 'reading',
      category: passage?.topic?.toLowerCase().replace(/\s+/g, '-'),
    });
    if (result.added > 0) {
      this.toast.show(`"${v.word}" added to flashcards.`, 'success', 2000);
    }
  }

  addAllVocabToFlashcards(): void {
    const passage = this.passage();
    if (!passage) return;
    const result = this.flashcards.addFromVocabList(passage.vocabulary, {
      tag: 'reading',
      category: passage.topic?.toLowerCase().replace(/\s+/g, '-'),
    });
    if (result.added === 0) {
      this.toast.show(`All ${result.skipped} words already in your flashcards.`, 'info', 2500);
    } else {
      const skippedMsg = result.skipped > 0 ? ` (${result.skipped} already there)` : '';
      this.toast.show(`Added ${result.added} words to flashcards${skippedMsg}.`, 'success', 2500);
    }
  }

  hasUnaddedVocab(): boolean {
    const passage = this.passage();
    if (!passage) return false;
    return passage.vocabulary.some((v) => !this.isInFlashcards(v.word));
  }
}
