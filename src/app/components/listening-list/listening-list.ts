import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ListeningLevel, ListeningTrack } from '../../models/listening.model';
import { ListeningService } from '../../services/listening.service';

type LevelFilter = 'all' | ListeningLevel;

@Component({
  selector: 'app-listening-list',
  imports: [CommonModule],
  templateUrl: './listening-list.html',
  styleUrl: './listening-list.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ListeningListComponent implements OnInit {
  private service = inject(ListeningService);
  private router = inject(Router);

  isLoading = signal(true);
  tracks = signal<ListeningTrack[]>([]);
  levelFilter = signal<LevelFilter>('all');

  filtered = computed(() => {
    const level = this.levelFilter();
    return this.tracks().filter((t) => level === 'all' || t.level === level);
  });

  ngOnInit(): void {
    this.service.loadAll().then((items) => {
      this.tracks.set(items);
      this.isLoading.set(false);
    });
  }

  setLevelFilter(level: LevelFilter): void {
    this.levelFilter.set(level);
  }

  openTrack(t: ListeningTrack): void {
    this.router.navigate(['/listening', t.slug || t.id]);
  }

  goBack(): void {
    this.router.navigate(['/']);
  }

  bestScore(trackId: string): number | null {
    return this.service.bestScore(trackId);
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

  levelLabel(level: ListeningLevel): string {
    return level === 'beginner' ? 'Beginner' : level === 'intermediate' ? 'Intermediate' : 'Advanced';
  }

  levelClass(level: ListeningLevel): string {
    return level === 'beginner'
      ? 'bg-green-500/20 text-green-300 border border-green-500/30'
      : level === 'intermediate'
      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
      : 'bg-red-500/20 text-red-300 border border-red-500/30';
  }
}
