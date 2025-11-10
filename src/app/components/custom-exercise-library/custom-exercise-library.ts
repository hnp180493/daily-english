import { Component, ChangeDetectionStrategy, inject, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { CustomExerciseService } from '../../services/custom-exercise.service';
import { ToastService } from '../../services/toast.service';
import { DifficultyLevel } from '../../models/exercise.model';
import { LoadingSpinnerComponent } from '../loading-spinner/loading-spinner';

@Component({
  selector: 'app-custom-exercise-library',
  imports: [CommonModule, FormsModule, RouterModule, LoadingSpinnerComponent],
  templateUrl: './custom-exercise-library.html',
  styleUrl: './custom-exercise-library.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CustomExerciseLibrary {
  // Services
  private customExerciseService = inject(CustomExerciseService);
  private toastService = inject(ToastService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  // State signals
  exercises = toSignal(this.customExerciseService.getCustomExercises(), { initialValue: [] });
  searchQuery = signal('');
  selectedDifficulty = signal<DifficultyLevel | null>(null);
  selectedTags = signal<string[]>([]);
  deleteConfirmId = signal<string | null>(null);
  isLoading = signal(true);

  constructor() {
    // Track loading state
    effect(() => {
      const exercises = this.exercises();
      if (exercises.length >= 0) {
        setTimeout(() => this.isLoading.set(false), 300);
      }
    });

    // Apply query parameters on initialization
    effect(() => {
      const params = this.route.snapshot.queryParams;
      
      // Apply level filter from query params
      if (params['level']) {
        const level = params['level'] as DifficultyLevel;
        if (Object.values(DifficultyLevel).includes(level)) {
          this.selectedDifficulty.set(level);
        }
      }

      // Apply search query from query params
      if (params['search']) {
        this.searchQuery.set(params['search']);
      }

      // Apply tags filter from query params
      if (params['tags']) {
        const tags = Array.isArray(params['tags']) ? params['tags'] : [params['tags']];
        this.selectedTags.set(tags);
      }
    });
  }

  // Enums for template
  DifficultyLevel = DifficultyLevel;
  difficultyLevels = Object.values(DifficultyLevel);

  // Computed signals
  filteredExercises = computed(() => {
    let result = this.exercises() || [];

    // Apply search filter
    const query = this.searchQuery().toLowerCase();
    if (query) {
      result = result.filter(ex =>
        ex.title.toLowerCase().includes(query) ||
        ex.sourceText.toLowerCase().includes(query) ||
        ex.tags?.some(t => t.toLowerCase().includes(query))
      );
    }

    // Apply difficulty filter
    const difficulty = this.selectedDifficulty();
    if (difficulty) {
      result = result.filter(ex => ex.level === difficulty);
    }

    // Apply tag filter
    const tags = this.selectedTags();
    if (tags.length > 0) {
      result = result.filter(ex =>
        tags.every(tag => ex.tags?.includes(tag))
      );
    }

    return result;
  });

  allTags = computed(() => {
    const exercises = this.exercises() || [];
    const tags = new Set<string>();
    exercises.forEach(ex => {
      ex.tags?.forEach(t => tags.add(t));
    });
    return Array.from(tags).sort();
  });

  hasActiveFilters = computed(() => {
    return this.searchQuery().length > 0 ||
           this.selectedDifficulty() !== null ||
           this.selectedTags().length > 0;
  });

  createNew(): void {
    this.router.navigate(['/exercise/create']);
  }

  editExercise(id: string): void {
    this.router.navigate(['/exercise/edit', id]);
  }

  confirmDelete(id: string): void {
    this.deleteConfirmId.set(id);
  }

  cancelDelete(): void {
    this.deleteConfirmId.set(null);
  }

  deleteExercise(id: string): void {
    this.customExerciseService.deleteExercise(id).subscribe({
      next: () => {
        this.deleteConfirmId.set(null);
        this.toastService.success('Exercise deleted successfully');
      },
      error: (error) => {
        this.toastService.error(`Failed to delete exercise: ${error.message}`);
        this.deleteConfirmId.set(null);
      }
    });
  }

  practiceExercise(id: string): void {
    this.router.navigate(['/exercise', id]);
  }

  clearFilters(): void {
    this.searchQuery.set('');
    this.selectedDifficulty.set(null);
    this.selectedTags.set([]);
  }

  toggleDifficultyFilter(level: DifficultyLevel): void {
    if (this.selectedDifficulty() === level) {
      this.selectedDifficulty.set(null);
    } else {
      this.selectedDifficulty.set(level);
    }
  }

  toggleTagFilter(tag: string): void {
    const current = this.selectedTags();
    if (current.includes(tag)) {
      this.selectedTags.set(current.filter(t => t !== tag));
    } else {
      this.selectedTags.set([...current, tag]);
    }
  }

  formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  }
}
