import { Component, ChangeDetectionStrategy, input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PracticeStatsData } from '../../../models/enhanced-analytics.model';

/**
 * Practice Stats Widget Component
 * Displays comprehensive practice statistics with trend indicators
 */
@Component({
  selector: 'app-practice-stats-widget',
  imports: [CommonModule],
  templateUrl: './practice-stats-widget.html',
  styleUrl: './practice-stats-widget.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PracticeStatsWidgetComponent {
  data = input.required<PracticeStatsData>();

  /**
   * Check if there's no data
   */
  isEmpty = computed(() => {
    const d = this.data();
    return d.totalExercisesCompleted === 0;
  });

  /**
   * Get trend icon based on trend direction
   */
  getTrendIcon = computed(() => {
    const trend = this.data().trend;
    if (trend === 'improving') return '↑';
    if (trend === 'declining') return '↓';
    if (trend === 'stable') return '→';
    return '';
  });

  /**
   * Get trend color class
   */
  getTrendColorClass = computed(() => {
    const trend = this.data().trend;
    if (trend === 'improving') return 'text-green-600 dark:text-green-400';
    if (trend === 'declining') return 'text-red-600 dark:text-red-400';
    if (trend === 'stable') return 'text-yellow-600 dark:text-yellow-400';
    return '';
  });

  /**
   * Get trend text
   */
  getTrendText = computed(() => {
    const d = this.data();
    if (!d.trend) return '';
    
    const diff = Math.abs(d.recentAverage - d.overallAverage);
    if (d.trend === 'improving') {
      return `${diff}% better than average`;
    }
    if (d.trend === 'declining') {
      return `${diff}% below average`;
    }
    return 'Maintaining steady performance';
  });

  /**
   * Format time spent as hours and minutes
   */
  formatTotalTime(minutes: number): string {
    if (minutes < 60) {
      return `${minutes}m`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    if (remainingMinutes === 0) {
      return `${hours}h`;
    }
    return `${hours}h ${remainingMinutes}m`;
  }

  /**
   * Format average time per exercise
   */
  formatAverageTime(minutes: number): string {
    if (minutes < 1) {
      return `${Math.round(minutes * 60)}s`;
    }
    return `${Math.round(minutes)}m`;
  }
}
