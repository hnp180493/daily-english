import { Component, ChangeDetectionStrategy, input, output, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Exercise, ExerciseStatus } from '../../models/exercise.model';
import { FavoriteService } from '../../services/favorite.service';
import { ProgressService } from '../../services/progress.service';
import { ExerciseService } from '../../services/exercise.service';

@Component({
  selector: 'app-exercise-card',
  imports: [CommonModule],
  templateUrl: './exercise-card.html',
  styleUrl: './exercise-card.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ExerciseCardComponent {
  private favoriteService = inject(FavoriteService);
  private progressService = inject(ProgressService);
  private exerciseService = inject(ExerciseService);
  private router = inject(Router);
  
  exercise = input.required<Exercise>();
  status = input.required<ExerciseStatus>();
  startExercise = output<string>();

  isFavorite = computed(() => this.favoriteService.isFavorite(this.exercise().id));
  
  // Generate SEO-friendly slug for the exercise
  exerciseSlug = computed(() => this.exerciseService.getExerciseSlug(this.exercise()));

  statusLabel = computed(() => {
    const status = this.status();
    if (status.status === 'new') {
      return 'New';
    }
    if (status.bestScore && status.bestScore === 100) {
      if (status.perfectCompletions && status.perfectCompletions >= 2) {
        return `Mastered (${status.perfectCompletions}×)`;
      }
      return 'Completed';
    }
    return `Attempt ${status.attemptCount}`;
  });

  isStatusNew = computed(() => this.status().status === 'new');
  
  isCompleted = computed(() => {
    const status = this.status();
    const completed = status.bestScore !== undefined && status.bestScore >= 90;
    console.log('Exercise:', this.exercise().title, 'bestScore:', status.bestScore, 'isCompleted:', completed);
    return completed;
  });

  isMastered = computed(() => {
    const status = this.status();
    return status.perfectCompletions !== undefined && status.perfectCompletions >= 2;
  });

  bestScore = computed(() => this.status().bestScore);

  buttonLabel = computed(() => {
    const status = this.status();
    if (status.status === 'new') {
      return 'Start Exercise';
    }
    if (status.bestScore === 100) {
      return 'Review';
    }
    return 'Continue';
  });

  difficultyLabel = computed(() => {
    return this.exercise().level.charAt(0).toUpperCase() + this.exercise().level.slice(1);
  });

  onStart(): void {
    const slug = this.exerciseSlug();
    const status = this.status();
    
    // If exercise has been attempted (has bestScore), navigate to review mode
    if (status.bestScore !== undefined) {
      this.router.navigate(['/exercise', slug], { queryParams: { mode: 'review' } });
    } else {
      // New exercise - normal start
      this.startExercise.emit(this.exercise().id);
      this.router.navigate(['/exercise', slug]);
    }
  }

  toggleFavorite(event: Event): void {
    event.stopPropagation();
    this.favoriteService.toggleFavorite(this.exercise().id);
  }
  
  onPracticeDictation(event: Event): void {
    event.stopPropagation();
    const slug = this.exerciseSlug();
    this.router.navigate(['/exercises', slug, 'dictation']);
  }
  
  // Check if dictation is available (translation completed)
  hasDictationAvailable(): boolean {
    // For now, return false - will be implemented when needed
    return false;
  }
  
  // Check if dictation has been completed
  hasDictationCompleted(): boolean {
    // For now, return false - will be implemented when needed
    return false;
  }
}
