import { Component, ChangeDetectionStrategy, input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TimeOfDayData } from '../../../models/enhanced-analytics.model';

/**
 * Time-of-Day Analysis Component
 * Shows productivity patterns by time of day
 */
@Component({
  selector: 'app-time-of-day-analysis',
  imports: [CommonModule],
  templateUrl: './time-of-day-analysis.html',
  styleUrl: './time-of-day-analysis.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TimeOfDayAnalysisComponent {
  data = input.required<TimeOfDayData>();

  /**
   * Check if there's insufficient data
   */
  hasInsufficientData = computed(() => {
    const d = this.data();
    const totalExercises = d.periods.reduce((sum, p) => sum + p.exerciseCount, 0);
    return totalExercises < 20;
  });

  /**
   * Get total exercises
   */
  totalExercises = computed(() => {
    return this.data().periods.reduce((sum, p) => sum + p.exerciseCount, 0);
  });

  /**
   * Get icon for time period
   */
  getPeriodIcon(periodName: string): string {
    const icons: Record<string, string> = {
      morning: '☀️',
      afternoon: '🌤️',
      evening: '🌆',
      night: '🌙'
    };
    return icons[periodName] || '';
  }

  /**
   * Get accuracy color class
   */
  getAccuracyColorClass(accuracy: number): string {
    if (accuracy >= 80) return 'text-green-600 dark:text-green-400';
    if (accuracy >= 60) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  }
}
