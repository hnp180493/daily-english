import { Component, ChangeDetectionStrategy, input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LearningVelocityData } from '../../../models/enhanced-analytics.model';

/**
 * Learning Velocity Component
 * Displays practice frequency and consistency metrics
 */
@Component({
  selector: 'app-learning-velocity',
  imports: [CommonModule],
  templateUrl: './learning-velocity.html',
  styleUrl: './learning-velocity.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LearningVelocityComponent {
  data = input.required<LearningVelocityData>();

  /**
   * Computed property for velocity status
   */
  velocityStatus = computed(() => {
    const d = this.data();
    if (d.percentageDifference > 0) return 'above';
    if (d.percentageDifference < 0) return 'below';
    return 'at';
  });

  /**
   * Computed property for encouragement message
   */
  encouragementMessage = computed(() => {
    const status = this.velocityStatus();
    if (status === 'below') {
      return 'Keep going! Consistency is key to improvement.';
    }
    if (status === 'above') {
      return 'Great momentum! You\'re exceeding your average pace.';
    }
    return 'You\'re maintaining a steady learning pace.';
  });

  /**
   * Computed property for max bar height calculation
   */
  maxWeeklyCount = computed(() => {
    const d = this.data();
    return Math.max(...d.weeklyBreakdown.map(w => w.exerciseCount), 1);
  });

  /**
   * Calculate bar height percentage for chart
   */
  getBarHeight(count: number): number {
    const max = this.maxWeeklyCount();
    return max > 0 ? (count / max) * 100 : 0;
  }

  /**
   * Get color class based on velocity status
   */
  getStatusColorClass(): string {
    const status = this.velocityStatus();
    if (status === 'above') return 'text-green-600 dark:text-green-400';
    if (status === 'below') return 'text-red-600 dark:text-red-400';
    return 'text-yellow-600 dark:text-yellow-400';
  }

  /**
   * Get background color class based on velocity status
   */
  getStatusBgClass(): string {
    const status = this.velocityStatus();
    if (status === 'above') return 'bg-green-50 dark:bg-green-900/20';
    if (status === 'below') return 'bg-red-50 dark:bg-red-900/20';
    return 'bg-yellow-50 dark:bg-yellow-900/20';
  }

  /**
   * Format percentage with sign
   */
  formatPercentage(value: number): string {
    const sign = value > 0 ? '+' : '';
    return `${sign}${value}%`;
  }
}
