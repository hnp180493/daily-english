import { Component, ChangeDetectionStrategy, input, inject, signal, effect, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MostPracticedData } from '../../../models/enhanced-analytics.model';
import { ExerciseService } from '../../../services/exercise.service';

/**
 * Most Practiced Component
 * Shows most frequently practiced exercises
 */
@Component({
  selector: 'app-most-practiced',
  imports: [CommonModule],
  templateUrl: './most-practiced.html',
  styleUrl: './most-practiced.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MostPracticedComponent {
  private router = inject(Router);
  private exerciseService = inject(ExerciseService);
  private cdr = inject(ChangeDetectorRef);
  
  data = input.required<MostPracticedData[]>();
  exerciseTitles = signal<Map<string, string>>(new Map());

  constructor() {
    effect(() => {
      const practices = this.data();
      const ids = practices.map(p => p.exerciseId);
      
      if (ids.length === 0) return;
      
      this.exerciseService.getExercisesByIds(ids).subscribe(exercises => {
        const titleMap = new Map<string, string>();
        exercises.forEach(ex => {
          titleMap.set(ex.id, ex.title);
        });
        this.exerciseTitles.set(titleMap);
        this.cdr.markForCheck();
      });
    });
  }

  /**
   * Navigate to exercise detail page
   */
  navigateToExercise(exerciseId: string): void {
    this.router.navigate(['/exercise', exerciseId]);
  }

  /**
   * Handle keyboard navigation
   */
  handleKeyDown(event: KeyboardEvent, exerciseId: string): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.navigateToExercise(exerciseId);
    }
  }

  /**
   * Get improvement icon
   */
  getImprovementIcon(percentage: number): string {
    if (percentage > 0) return '↑';
    if (percentage < 0) return '↓';
    return '→';
  }

  /**
   * Get improvement color class
   */
  getImprovementColorClass(percentage: number): string {
    if (percentage > 0) return 'text-green-600 dark:text-green-400';
    if (percentage < 0) return 'text-red-600 dark:text-red-400';
    return 'text-yellow-600 dark:text-yellow-400';
  }

  /**
   * Get improvement text
   */
  getImprovementText(percentage: number): string {
    if (percentage > 0) return 'Improved';
    if (percentage < 0) return 'Declined';
    return 'Same';
  }

  /**
   * Get exercise title or fallback to ID
   */
  getExerciseTitle(exerciseId: string): string {
    return this.exerciseTitles().get(exerciseId) || exerciseId;
  }
}
