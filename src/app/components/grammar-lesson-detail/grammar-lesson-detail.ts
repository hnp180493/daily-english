import { ChangeDetectionStrategy, Component, OnDestroy, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subject, switchMap, takeUntil } from 'rxjs';
import { GrammarLesson, GrammarPracticeItem, GrammarQuickCheck } from '../../models/review.model';
import { GrammarLessonsService } from '../../services/grammar-lessons.service';
import { LessonPracticeGeneratorService } from '../../services/lesson-practice-generator.service';
import { ToastService } from '../../services/toast.service';

interface PracticeState {
  item: GrammarPracticeItem;
  userAnswer: string;
  revealed: boolean;
  hintShown: boolean;
}

interface QuickCheckState {
  check: GrammarQuickCheck;
  selected: number | null;
}

@Component({
  selector: 'app-grammar-lesson-detail',
  imports: [CommonModule, RouterLink],
  templateUrl: './grammar-lesson-detail.html',
  styleUrl: './grammar-lesson-detail.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GrammarLessonDetailComponent implements OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private service = inject(GrammarLessonsService);
  private generator = inject(LessonPracticeGeneratorService);
  private toast = inject(ToastService);
  private destroy$ = new Subject<void>();

  isLoading = signal(true);
  lesson = signal<GrammarLesson | null>(null);
  practiceStates = signal<PracticeState[]>([]);
  quickCheckStates = signal<QuickCheckState[]>([]);

  /** Progressive disclosure — deep dive (sections + tips + mistakes) collapsed by default. */
  showDeepDive = signal(false);

  /** AI generation state. */
  isGeneratingPractice = signal(false);
  /** Index of the first generated (AI) item — items before this index are from JSON. */
  firstGeneratedIndex = signal<number | null>(null);

  /** Reactive learned state for the current lesson. */
  isCurrentLessonLearned = computed(() => {
    const l = this.lesson();
    return l ? this.service.isLearned(l.id) : false;
  });

  practiceScore = computed(() => {
    const states = this.practiceStates();
    if (states.length === 0) return null;
    const revealed = states.filter((s) => s.revealed);
    if (revealed.length === 0) return null;
    const correct = revealed.filter((s) => this.isAnswerCorrect(s)).length;
    return { correct, total: revealed.length, percent: Math.round((correct / revealed.length) * 100) };
  });

  /** Mastery: how many quick checks user got right out of total answered. */
  quickCheckScore = computed(() => {
    const states = this.quickCheckStates();
    if (states.length === 0) return null;
    const answered = states.filter((s) => s.selected !== null);
    if (answered.length === 0) return null;
    const correct = answered.filter((s) => s.selected === s.check.correctIndex).length;
    return { correct, total: answered.length, allDone: answered.length === states.length };
  });

  constructor() {
    this.route.paramMap
      .pipe(
        switchMap((params) => {
          const slug = params.get('slug') || '';
          this.isLoading.set(true);
          return this.service.getLessonBySlug(slug);
        }),
        takeUntil(this.destroy$)
      )
      .subscribe((lesson) => {
        this.lesson.set(lesson);
        this.practiceStates.set(
          (lesson?.practice || []).map((item) => ({
            item,
            userAnswer: '',
            revealed: false,
            hintShown: false,
          }))
        );
        this.quickCheckStates.set(
          (lesson?.quickChecks || []).map((check) => ({ check, selected: null }))
        );
        this.showDeepDive.set(false);
        this.firstGeneratedIndex.set(null);
        this.isLoading.set(false);
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // Practice
  updateAnswer(index: number, value: string): void {
    this.practiceStates.update((states) =>
      states.map((s, i) => (i === index ? { ...s, userAnswer: value } : s))
    );
  }

  reveal(index: number): void {
    this.practiceStates.update((states) =>
      states.map((s, i) => (i === index ? { ...s, revealed: true } : s))
    );
  }

  showHint(index: number): void {
    this.practiceStates.update((states) =>
      states.map((s, i) => (i === index ? { ...s, hintShown: true } : s))
    );
  }

  isAnswerCorrect(state: PracticeState): boolean {
    return this.normalize(state.userAnswer) === this.normalize(state.item.english);
  }

  // Quick check
  selectQuickCheck(index: number, optionIndex: number): void {
    this.quickCheckStates.update((states) =>
      states.map((s, i) => (i === index ? { ...s, selected: optionIndex } : s))
    );
  }

  isQuickCheckAnswered(index: number): boolean {
    return this.quickCheckStates()[index]?.selected !== null;
  }

  quickCheckOptionClass(stateIndex: number, optionIndex: number): string {
    const state = this.quickCheckStates()[stateIndex];
    if (!state || state.selected === null) return 'qc-option';
    if (optionIndex === state.check.correctIndex) return 'qc-option qc-correct';
    if (optionIndex === state.selected) return 'qc-option qc-incorrect';
    return 'qc-option qc-dim';
  }

  // Deep dive toggle
  toggleDeepDive(): void {
    this.showDeepDive.update((v) => !v);
  }

  /** Whether this practice item came from AI generation (vs static JSON). */
  isGeneratedItem(index: number): boolean {
    const first = this.firstGeneratedIndex();
    return first !== null && index >= first;
  }

  /**
   * Ask AI to generate 5 fresh practice items for this lesson, excluding what's
   * already on screen. Append them and scroll to the first new one.
   */
  generateMorePractice(): void {
    const lesson = this.lesson();
    if (!lesson || this.isGeneratingPractice()) return;

    this.isGeneratingPractice.set(true);
    const exclude = this.practiceStates().map((s) => s.item.vietnamese);
    const insertAt = this.practiceStates().length;

    this.generator.generate(lesson, 5, exclude).subscribe({
      next: (items) => {
        if (items.length === 0) {
          this.toast.show('AI returned no items. Try again.', 'warning', 3000);
          this.isGeneratingPractice.set(false);
          return;
        }
        const newStates = items.map((item) => ({
          item,
          userAnswer: '',
          revealed: false,
          hintShown: false,
        }));
        this.practiceStates.update((states) => [...states, ...newStates]);
        if (this.firstGeneratedIndex() === null) {
          this.firstGeneratedIndex.set(insertAt);
        }
        this.toast.show(`Added ${items.length} fresh practice sentences.`, 'success', 2500);
        this.isGeneratingPractice.set(false);

        // Scroll the first new item into view after the DOM updates.
        setTimeout(() => {
          const el = document.querySelector<HTMLElement>(`[data-practice-index="${insertAt}"]`);
          el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 60);
      },
      error: (err) => {
        this.isGeneratingPractice.set(false);
        this.toast.show(err?.message || 'Could not generate practice. Check your AI provider.', 'error', 5000);
      },
    });
  }

  private normalize(text: string): string {
    return text
      .toLowerCase()
      .replace(/[.,!?;:]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  goBack(): void {
    this.router.navigate(['/grammar-lessons']);
  }

  toggleLearned(): void {
    const l = this.lesson();
    if (!l) return;
    const nowLearned = this.service.toggleLearned(l.id);
    this.toast.show(
      nowLearned ? `Marked "${l.title}" as learned ✓` : `Removed learned mark from "${l.title}"`,
      nowLearned ? 'success' : 'info',
      2000
    );
  }

  levelLabel(level?: string): string {
    switch (level) {
      case 'beginner':
        return 'Beginner';
      case 'intermediate':
        return 'Intermediate';
      case 'advanced':
        return 'Advanced';
      default:
        return 'All levels';
    }
  }

  /** Pick a gradient class for each scenario card so the row feels lively. */
  scenarioGradient(index: number): string {
    const palette = ['gradient-purple', 'gradient-blue', 'gradient-rose', 'gradient-emerald'];
    return palette[index % palette.length];
  }
}
