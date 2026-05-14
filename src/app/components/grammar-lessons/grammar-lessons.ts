import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { GrammarLesson } from '../../models/review.model';
import { GrammarLessonsService } from '../../services/grammar-lessons.service';

type LevelFilter = 'all' | 'beginner' | 'intermediate' | 'advanced';
type ProgressFilter = 'all' | 'unlearned' | 'learned';

@Component({
  selector: 'app-grammar-lessons',
  imports: [CommonModule, RouterLink],
  templateUrl: './grammar-lessons.html',
  styleUrl: './grammar-lessons.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GrammarLessonsComponent implements OnInit {
  private service = inject(GrammarLessonsService);
  private router = inject(Router);

  isLoading = signal(true);
  lessons = signal<GrammarLesson[]>([]);
  levelFilter = signal<LevelFilter>('all');
  progressFilter = signal<ProgressFilter>('all');
  searchQuery = signal('');

  filteredLessons = computed(() => {
    const level = this.levelFilter();
    const progress = this.progressFilter();
    const query = this.searchQuery().trim().toLowerCase();
    return this.lessons().filter((lesson) => {
      if (level !== 'all' && lesson.level !== level) return false;
      if (progress === 'learned' && !this.service.isLearned(lesson.id)) return false;
      if (progress === 'unlearned' && this.service.isLearned(lesson.id)) return false;
      if (!query) return true;
      const hay = `${lesson.title} ${lesson.description} ${lesson.category ?? ''}`.toLowerCase();
      return hay.includes(query);
    });
  });

  learnedCount = computed(() => this.service.learnedCount());
  totalCount = computed(() => this.lessons().length);
  isLearned = (id: string) => this.service.isLearned(id);

  ngOnInit(): void {
    this.service.loadAll().then((lessons) => {
      this.lessons.set(lessons);
      this.isLoading.set(false);
    });
  }

  setLevelFilter(level: LevelFilter): void {
    this.levelFilter.set(level);
  }

  setProgressFilter(p: ProgressFilter): void {
    this.progressFilter.set(p);
  }

  onSearchInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.searchQuery.set(target.value);
  }

  openLesson(lesson: GrammarLesson): void {
    this.router.navigate(['/grammar-lessons', lesson.slug || lesson.id]);
  }

  goBack(): void {
    this.router.navigate(['/']);
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

  levelClass(level?: string): string {
    switch (level) {
      case 'beginner':
        return 'bg-green-500/20 text-green-300 border border-green-500/30';
      case 'intermediate':
        return 'bg-amber-500/20 text-amber-300 border border-amber-500/30';
      case 'advanced':
        return 'bg-red-500/20 text-red-300 border border-red-500/30';
      default:
        return 'bg-slate-700/40 text-slate-300 border border-slate-600/30';
    }
  }

  categoryIcon(category?: string): string {
    if (!category) return '📘';
    if (category.includes('grammar')) return '📘';
    if (category.includes('structure')) return '🏗️';
    if (category.includes('vocabulary')) return '📚';
    return '📘';
  }
}
