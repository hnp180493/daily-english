import { Component, ChangeDetectionStrategy, input, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PerformanceTrendData } from '../../../models/enhanced-analytics.model';
import { TranslationService } from '../../../services/translation.service';
import { dateLocale, tCount } from '../dashboard-i18n';

/**
 * Performance Trend Chart Component
 * Displays a line chart showing performance changes over time
 */
@Component({
  selector: 'app-performance-trend-chart',
  imports: [CommonModule],
  templateUrl: './performance-trend-chart.html',
  styleUrl: './performance-trend-chart.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PerformanceTrendChartComponent {
  data = input.required<PerformanceTrendData>();
  protected translate = inject(TranslationService);

  /**
   * Check if there's insufficient data
   */
  hasInsufficientData = computed(() => {
    const d = this.data();
    return d.dailyAverages.length < 3;
  });

  /**
   * SVG dimensions
   */
  readonly chartWidth = 600;
  readonly chartHeight = 300;
  readonly padding = { top: 20, right: 20, bottom: 40, left: 50 };

  /**
   * Calculate chart dimensions
   */
  innerWidth = computed(() => this.chartWidth - this.padding.left - this.padding.right);
  innerHeight = computed(() => this.chartHeight - this.padding.top - this.padding.bottom);

  /**
   * Calculate Y scale (0-100 for scores)
   */
  getYPosition(score: number): number {
    const height = this.innerHeight();
    return this.padding.top + height - (score / 100) * height;
  }

  /**
   * Calculate X scale
   */
  getXPosition(index: number, total: number): number {
    const width = this.innerWidth();
    return this.padding.left + (index / (total - 1)) * width;
  }

  /**
   * Generate path for line chart
   */
  linePath = computed(() => {
    const d = this.data();
    if (d.dailyAverages.length === 0) return '';

    const points = d.dailyAverages.map((day, index) => {
      const x = this.getXPosition(index, d.dailyAverages.length);
      const y = this.getYPosition(day.averageScore);
      return `${x},${y}`;
    });

    return `M ${points.join(' L ')}`;
  });

  /**
   * Generate path for trend line
   */
  trendLinePath = computed(() => {
    const d = this.data();
    if (d.dailyAverages.length < 2) return '';

    const firstIndex = 0;
    const lastIndex = d.dailyAverages.length - 1;

    // Least-squares line: anchor at the regression intercept (mean(y) - slope * mean(x)), not at the
    // first data point — that made the "trend" sit above/below every later point. Clamp to 0..100.
    const n = d.dailyAverages.length;
    const meanX = (n - 1) / 2;
    const meanY = d.dailyAverages.reduce((sum, day) => sum + day.averageScore, 0) / n;
    const intercept = meanY - d.trendSlope * meanX;
    const clamp = (v: number) => Math.max(0, Math.min(100, v));
    const firstScore = clamp(intercept);
    const lastScore = clamp(intercept + d.trendSlope * lastIndex);

    const x1 = this.getXPosition(firstIndex, d.dailyAverages.length);
    const y1 = this.getYPosition(firstScore);
    const x2 = this.getXPosition(lastIndex, d.dailyAverages.length);
    const y2 = this.getYPosition(lastScore);

    return `M ${x1},${y1} L ${x2},${y2}`;
  });

  /**
   * Get Y-axis labels (0, 25, 50, 75, 100)
   */
  yAxisLabels = [0, 25, 50, 75, 100];

  /**
   * Calculate label interval for X-axis
   */
  labelInterval = computed(() => {
    const length = this.data().dailyAverages.length;
    return Math.ceil(length / 5);
  });

  /**
   * Get trend icon
   */
  getTrendIcon(): string {
    const d = this.data();
    if (d.trendDirection === 'improving') return '↑';
    if (d.trendDirection === 'declining') return '↓';
    return '→';
  }

  /**
   * Get trend color class
   */
  getTrendColorClass(): string {
    const d = this.data();
    if (d.trendDirection === 'improving') return 'text-green-600 dark:text-green-400';
    if (d.trendDirection === 'declining') return 'text-red-600 dark:text-red-400';
    return 'text-yellow-600 dark:text-yellow-400';
  }

  /**
   * Get trend text
   */
  getTrendText(): string {
    const d = this.data();
    if (d.trendDirection === 'improving') return this.translate.t('dashboard.trend.improving');
    if (d.trendDirection === 'declining') return this.translate.t('dashboard.trend.declining');
    return this.translate.t('dashboard.stable');
  }

  /**
   * Format date for display
   */
  formatDate(dateStr: string): string {
    // 'YYYY-MM-DD' parsed as LOCAL date (new Date(str) is UTC midnight → previous day in UTC-x)
    const [y, m, d] = dateStr.split('-').map(Number);
    const date = new Date(y, (m || 1) - 1, d || 1);
    return date.toLocaleDateString(dateLocale(this.translate), { month: 'numeric', day: 'numeric' });
  }

  /**
   * Get accessible label for data point
   */
  getDataPointLabel(day: { date: string; averageScore: number; exerciseCount: number }): string {
    return tCount(this.translate, 'dashboard.trend.point', day.exerciseCount, {
      date: this.formatDate(day.date),
      score: day.averageScore
    });
  }
}
