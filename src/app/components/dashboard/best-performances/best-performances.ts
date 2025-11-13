import { Component, ChangeDetectionStrategy, input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { BestPerformanceData } from '../../../models/enhanced-analytics.model';

/**
 * Best Performances Component
 * Showcases top scoring exercises
 */
@Component({
  selector: 'app-best-performances',
  imports: [CommonModule],
  templateUrl: './best-performances.html',
  styleUrl: './best-performances.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BestPerformancesComponent {
  private router = inject(Router);
  
  data = input.required<BestPerformanceData[]>();

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
   * Get medal icon for rank
   */
  getMedalIcon(rank: number): string {
    const medals: Record<number, string> = {
      1: '🥇',
      2: '🥈',
      3: '🥉'
    };
    return medals[rank] || '';
  }

  /**
   * Format date
   */
  formatDate(date: Date): string {
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  }

  /**
   * Format time spent
   */
  formatTime(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    if (minutes === 0) {
      return `${remainingSeconds}s`;
    }
    return `${minutes}m ${remainingSeconds}s`;
  }
}
