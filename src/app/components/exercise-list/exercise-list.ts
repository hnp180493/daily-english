import { Component, ChangeDetectionStrategy, inject, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs/operators';
import { Exercise, ExerciseCategory, DifficultyLevel } from '../../models/exercise.model';
import { ExerciseService } from '../../services/exercise.service';
import { ProgressService } from '../../services/progress.service';
import { ExerciseCardComponent } from '../exercise-card/exercise-card';
import { LoadingSpinnerComponent } from '../loading-spinner/loading-spinner';

@Component({
  selector: 'app-exercise-list',
  imports: [CommonModule, ExerciseCardComponent, LoadingSpinnerComponent],
  templateUrl: './exercise-list.html',
  styleUrl: './exercise-list.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ExerciseListComponent {
  private exerciseService = inject(ExerciseService);
  private progressService = inject(ProgressService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  allExercises = toSignal(this.exerciseService.getFilteredExercises(), { initialValue: [] });
  queryParams = toSignal(this.route.queryParams, { initialValue: {} });
  isLoading = signal(true);
  currentPage = signal(0);
  pageSize = 6;

  // Subscribe to progress changes to make status reactive
  private progress$ = this.progressService.getUserProgress();
  private progressSignal = toSignal(this.progress$, { initialValue: { exerciseHistory: {}, totalCredits: 0, totalPoints: 0, lastActivityDate: new Date(), currentStreak: 0, longestStreak: 0, lastStreakDate: '', achievements: [] } });

  // Filter exercises based on query parameters
  exercises = computed(() => {
    const all = this.allExercises();
    const params = this.queryParams() as Record<string, string>;
    
    let filtered = all;
    
    if (params['category']) {
      filtered = filtered.filter(ex => ex.category === params['category']);
    }
    
    if (params['level']) {
      filtered = filtered.filter(ex => ex.level === params['level']);
    }
    
    return filtered;
  });

  // Reset to first page when filters change
  constructor() {
    effect(() => {
      this.queryParams();
      this.currentPage.set(0);
    });

    // Track loading state
    effect(() => {
      const exercises = this.allExercises();
      if (exercises.length > 0 || exercises.length === 0) {
        setTimeout(() => this.isLoading.set(false), 300);
      }
    });
  }

  totalExercises = computed(() => this.exercises().length);
  totalPages = computed(() => Math.ceil(this.exercises().length / this.pageSize));
  
  paginatedExercises = computed(() => {
    const start = this.currentPage() * this.pageSize;
    const end = start + this.pageSize;
    return this.exercises().slice(start, end);
  });

  pages = computed(() => Array.from({ length: this.totalPages() }, (_, i) => i));

  // Create a computed signal for each exercise status to make it fully reactive
  getExerciseStatus = computed(() => {
    // Create a map of exercise statuses that updates when progress changes
    const progress = this.progressSignal();
    const exercises = this.paginatedExercises();
    
    return (exerciseId: string) => {
      return this.progressService.getExerciseStatus(exerciseId);
    };
  });

  onStartExercise(exerciseId: string): void {
    this.router.navigate(['/exercise', exerciseId]);
  }

  nextPage(): void {
    if (this.currentPage() < this.totalPages() - 1) {
      this.currentPage.update(page => page + 1);
    }
  }

  previousPage(): void {
    if (this.currentPage() > 0) {
      this.currentPage.update(page => page - 1);
    }
  }

  goToPage(page: number): void {
    this.currentPage.set(page);
  }
}
