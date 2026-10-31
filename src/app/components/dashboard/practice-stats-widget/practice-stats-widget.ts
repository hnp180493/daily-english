import { Component, ChangeDetectionStrategy, input, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PracticeStatsData } from '../../../models/enhanced-analytics.model';
import { TranslationService } from '../../../services/translation.service';
import { tCount, unitHour, unitMin, unitSec } from '../dashboard-i18n';

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
  protected translate = inject(TranslationService);

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
    // diff is a gap between two percentages, i.e. percentage POINTS
    if (d.trend === 'improving') {
      return tCount(this.translate, 'dashboard.stats.trend_better', diff);
    }
    if (d.trend === 'declining') {
      return tCount(this.translate, 'dashboard.stats.trend_below', diff);
    }
    return this.translate.t('dashboard.stats.trend_stable');
  });

  /**
   * Format time spent as hours and minutes
   */
  formatTotalTime(minutes: number): string {
    if (minutes < 60) {
      return unitMin(this.translate, minutes);
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    if (remainingMinutes === 0) {
      return unitHour(this.translate, hours);
    }
    return `${unitHour(this.translate, hours)} ${unitMin(this.translate, remainingMinutes)}`;
  }

  /**
   * Format average time per exercise
   */
  formatAverageTime(minutes: number): string {
    if (minutes < 1) {
      return unitSec(this.translate, Math.round(minutes * 60));
    }
    return unitMin(this.translate, Math.round(minutes));
  }
}
