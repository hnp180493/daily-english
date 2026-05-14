import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { WritingLevel, WritingPrompt } from '../../models/writing.model';
import { WritingService } from '../../services/writing.service';

type LevelFilter = 'all' | WritingLevel;

@Component({
  selector: 'app-writing-list',
  imports: [CommonModule],
  templateUrl: './writing-list.html',
  styleUrl: './writing-list.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WritingListComponent implements OnInit {
  private service = inject(WritingService);
  private router = inject(Router);

  isLoading = signal(true);
  prompts = signal<WritingPrompt[]>([]);
  levelFilter = signal<LevelFilter>('all');

  filtered = computed(() => {
    const level = this.levelFilter();
    return this.prompts().filter((p) => level === 'all' || p.level === level);
  });

  ngOnInit(): void {
    this.service.loadAll().then((items) => {
      this.prompts.set(items);
      this.isLoading.set(false);
    });
  }

  setLevelFilter(level: LevelFilter): void {
    this.levelFilter.set(level);
  }

  openPrompt(p: WritingPrompt): void {
    this.router.navigate(['/writing', p.slug || p.id]);
  }

  goBack(): void {
    this.router.navigate(['/']);
  }

  bestScore(promptId: string): number | null {
    return this.service.getBestScoreForPrompt(promptId);
  }

  hasDraft(promptId: string): boolean {
    return (this.service.loadDraft(promptId) || '').trim().length > 0;
  }

  levelLabel(level: WritingLevel): string {
    return level === 'beginner' ? 'Beginner' : level === 'intermediate' ? 'Intermediate' : 'Advanced';
  }

  levelClass(level: WritingLevel): string {
    return level === 'beginner'
      ? 'bg-green-500/20 text-green-300 border border-green-500/30'
      : level === 'intermediate'
      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
      : 'bg-red-500/20 text-red-300 border border-red-500/30';
  }

  typeLabel(type: string): string {
    const map: Record<string, string> = {
      opinion: 'Opinion',
      discussion: 'Discussion',
      'problem-solution': 'Problem & Solution',
      descriptive: 'Descriptive',
      narrative: 'Narrative',
      argumentative: 'Argumentative',
    };
    return map[type] || type;
  }
}
