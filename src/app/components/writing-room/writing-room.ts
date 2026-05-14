import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subject, switchMap, takeUntil } from 'rxjs';
import { WritingAttempt, WritingFeedback, WritingPrompt } from '../../models/writing.model';
import { WritingService } from '../../services/writing.service';
import { AIUnifiedService } from '../../services/ai/ai-unified.service';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-writing-room',
  imports: [CommonModule, RouterLink],
  templateUrl: './writing-room.html',
  styleUrl: './writing-room.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WritingRoomComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private service = inject(WritingService);
  private ai = inject(AIUnifiedService);
  private toast = inject(ToastService);
  private destroy$ = new Subject<void>();
  private autoSaveTimer: any = null;
  private startedAt: Date | null = null;

  isLoading = signal(true);
  prompt = signal<WritingPrompt | null>(null);
  essayText = signal('');
  feedback = signal<WritingFeedback | null>(null);
  isSubmitting = signal(false);
  showHints = signal(false);

  wordCount = computed(() => this.service.countWords(this.essayText()));

  wordCountClass = computed(() => {
    const p = this.prompt();
    const count = this.wordCount();
    if (!p) return '';
    if (count < p.wordCountTarget.min) return 'text-amber-400';
    if (count > p.wordCountTarget.max) return 'text-amber-400';
    return 'text-green-400';
  });

  canSubmit = computed(() => {
    const count = this.wordCount();
    return count >= 40 && !this.isSubmitting() && !!this.prompt();
  });

  ngOnInit(): void {
    this.route.paramMap
      .pipe(
        switchMap((params) => {
          const slug = params.get('slug') || '';
          this.isLoading.set(true);
          return this.service.getPromptBySlug(slug);
        }),
        takeUntil(this.destroy$)
      )
      .subscribe((prompt) => {
        this.prompt.set(prompt);
        if (prompt) {
          this.essayText.set(this.service.loadDraft(prompt.id));
          this.startedAt = new Date();
        }
        this.feedback.set(null);
        this.isLoading.set(false);
      });
  }

  ngOnDestroy(): void {
    if (this.autoSaveTimer) clearTimeout(this.autoSaveTimer);
    this.destroy$.next();
    this.destroy$.complete();
  }

  onEssayChange(value: string): void {
    this.essayText.set(value);
    const p = this.prompt();
    if (!p) return;
    if (this.autoSaveTimer) clearTimeout(this.autoSaveTimer);
    this.autoSaveTimer = setTimeout(() => this.service.saveDraft(p.id, value), 500);
  }

  toggleHints(): void {
    this.showHints.update((v) => !v);
  }

  async submit(): Promise<void> {
    const p = this.prompt();
    const essay = this.essayText().trim();
    if (!p || !essay) return;

    this.isSubmitting.set(true);
    this.feedback.set(null);
    try {
      const fb = await new Promise<WritingFeedback>((resolve, reject) => {
        this.ai.analyzeWriting(p, essay).subscribe({ next: resolve, error: reject });
      });
      this.feedback.set(fb);

      const attempt: WritingAttempt = {
        id: `attempt-${Date.now()}`,
        promptId: p.id,
        essayText: essay,
        wordCount: this.wordCount(),
        durationMs: this.startedAt ? Date.now() - this.startedAt.getTime() : 0,
        feedback: fb,
        startedAt: this.startedAt || new Date(),
        submittedAt: new Date(),
      };
      this.service.recordAttempt(attempt);
      this.toast.show(`Graded! Overall band ${fb.overallBand}`, 'success', 3000);

      setTimeout(() => {
        const feedbackEl = document.getElementById('feedback-section');
        feedbackEl?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } catch (err: any) {
      console.error('[WritingRoom] AI grading error:', err);
      this.toast.show(
        err?.message || 'Could not grade. Check your AI provider in Profile (requires OpenAI/Gemini/Azure/OpenRouter/DeepSeek configured).',
        'error',
        5000
      );
    } finally {
      this.isSubmitting.set(false);
    }
  }

  clearDraft(): void {
    const p = this.prompt();
    if (!p) return;
    if (!confirm('Clear your entire essay and start over?')) return;
    this.essayText.set('');
    this.service.clearDraft(p.id);
    this.feedback.set(null);
  }

  resetForNewAttempt(): void {
    this.feedback.set(null);
    this.startedAt = new Date();
    const textarea = document.querySelector<HTMLTextAreaElement>('.essay-textarea');
    textarea?.focus();
  }

  goBack(): void {
    this.router.navigate(['/writing']);
  }

  bandColor(band: number): string {
    if (band >= 7) return 'text-green-300';
    if (band >= 5.5) return 'text-blue-300';
    if (band >= 4) return 'text-amber-300';
    return 'text-red-300';
  }

  bandBgColor(band: number): string {
    if (band >= 7) return 'bg-green-500/10 border-green-500/30';
    if (band >= 5.5) return 'bg-blue-500/10 border-blue-500/30';
    if (band >= 4) return 'bg-amber-500/10 border-amber-500/30';
    return 'bg-red-500/10 border-red-500/30';
  }

  errorTypeLabel(type: string): string {
    const map: Record<string, string> = {
      grammar: 'Grammar',
      vocabulary: 'Vocabulary',
      spelling: 'Spelling',
      meaning: 'Meaning',
      tense: 'Tense',
      structure: 'Structure',
      other: 'Other',
    };
    return map[type] || type;
  }

  errorTypeColor(type: string): string {
    const map: Record<string, string> = {
      grammar: 'bg-blue-500/20 text-blue-300 border border-blue-500/30',
      vocabulary: 'bg-purple-500/20 text-purple-300 border border-purple-500/30',
      spelling: 'bg-red-500/20 text-red-300 border border-red-500/30',
      meaning: 'bg-orange-500/20 text-orange-300 border border-orange-500/30',
      tense: 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30',
      structure: 'bg-pink-500/20 text-pink-300 border border-pink-500/30',
    };
    return map[type] || 'bg-slate-700/40 text-slate-300 border border-slate-600/30';
  }
}
