import { Component, ChangeDetectionStrategy, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AnalyticsData } from '../../../models/analytics.model';

@Component({
  selector: 'app-performance-analysis',
  imports: [CommonModule],
  templateUrl: './performance-analysis.html',
  styleUrl: './performance-analysis.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PerformanceAnalysisComponent {
  analytics = input.required<AnalyticsData>();

  getErrorIcon(type: string): string {
    const icons: Record<string, string> = {
      grammar: '📝',
      vocabulary: '📚',
      structure: '🏗️',
      spelling: '✍️',
      suggestion: '💡'
    };
    return icons[type] || '⚠️';
  }

  getAccuracyClass(avgScore: number): string {
    if (avgScore >= 80) return 'high';
    if (avgScore >= 60) return 'medium';
    return 'low';
  }

  getPerformanceLabel(avgScore: number): string {
    if (avgScore >= 80) return 'Excellent';
    if (avgScore >= 60) return 'Good';
    return 'Needs Practice';
  }
}
