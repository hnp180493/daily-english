import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ReadingLevel, ReadingPassage } from '../../models/reading.model';
import { ReadingService } from '../../services/reading.service';

type LevelFilter = 'all' | ReadingLevel;

@Component({
  selector: 'app-reading-list',
  imports: [CommonModule],
  templateUrl: './reading-list.html',
  styleUrl: './reading-list.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReadingListComponent implements OnInit {
  private service = inject(ReadingService);
  private router = inject(Router);

  isLoading = signal(true);
  passages = signal<ReadingPassage[]>([]);
  levelFilter = signal<LevelFilter>('all');

  filtered = computed(() => {
    const level = this.levelFilter();
    return this.passages().filter((p) => level === 'all' || p.level === level);
  });

  ngOnInit(): void {
    this.service.loadAll().then((items) => {
      this.passages.set(items);
      this.isLoading.set(false);
    });
  }

  setLevelFilter(level: LevelFilter): void {
    this.levelFilter.set(level);
  }

  openPassage(p: ReadingPassage): void {
    this.router.navigate(['/reading', p.slug || p.id]);
  }

  goBack(): void {
    this.router.navigate(['/']);
  }

  progressFor(passageId: string): number | null {
    const p = this.service.getProgress(passageId);
    return p?.quizScore ?? null;
  }

  levelLabel(level: ReadingLevel): string {
    return level === 'beginner' ? 'Beginner' : level === 'intermediate' ? 'Intermediate' : 'Advanced';
  }

  levelClass(level: ReadingLevel): string {
    return level === 'beginner'
      ? 'bg-green-500/20 text-green-300 border border-green-500/30'
      : level === 'intermediate'
      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
      : 'bg-red-500/20 text-red-300 border border-red-500/30';
  }
}
