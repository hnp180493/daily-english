import { Component, ChangeDetectionStrategy, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HintsAnalysisData } from '../../../models/enhanced-analytics.model';

@Component({
  selector: 'app-hints-usage-analysis',
  imports: [CommonModule],
  templateUrl: './hints-usage-analysis.html',
  styleUrl: './hints-usage-analysis.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    'class': 'block'
  }
})
export class HintsUsageAnalysisComponent {
  data = input.required<HintsAnalysisData | null>();

  getTrendIcon(trend: 'increasing' | 'stable' | 'decreasing'): string {
    switch (trend) {
      case 'increasing': return '↑';
      case 'stable': return '→';
      case 'decreasing': return '↓';
    }
  }

  getTrendColor(trend: 'increasing' | 'stable' | 'decreasing'): string {
    switch (trend) {
      case 'increasing': return 'text-red-600 dark:text-red-400';
      case 'stable': return 'text-yellow-600 dark:text-yellow-400';
      case 'decreasing': return 'text-green-600 dark:text-green-400';
    }
  }

  getTrendLabel(trend: 'increasing' | 'stable' | 'decreasing'): string {
    switch (trend) {
      case 'increasing': return 'Increasing';
      case 'stable': return 'Stable';
      case 'decreasing': return 'Decreasing';
    }
  }

  formatPercentage(value: number): string {
    const abs = Math.abs(value);
    return `${abs.toFixed(1)}%`;
  }
}
