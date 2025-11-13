import { Component, ChangeDetectionStrategy, input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MostPracticedData } from '../../../models/enhanced-analytics.model';

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
  
  data = input.required<MostPracticedData[]>();

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
}
