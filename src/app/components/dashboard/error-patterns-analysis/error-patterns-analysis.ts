import { Component, ChangeDetectionStrategy, input } from '@angular/core';
import { CommonModule } from '@angular/common';

interface ErrorPattern {
  type: string;
  description: string;
  count: number;
  percentage: number;
  examples: string[];
  recommendation: string;
}

@Component({
  selector: 'app-error-patterns-analysis',
  imports: [CommonModule],
  templateUrl: './error-patterns-analysis.html',
  styleUrl: './error-patterns-analysis.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ErrorPatternsAnalysisComponent {
  data = input.required<ErrorPattern[]>();

  getErrorIcon(type: string): string {
    const icons: Record<string, string> = {
      'grammar': '📝',
      'vocabulary': '📚',
      'structure': '🏗️',
      'spelling': '✍️',
      'suggestion': '💡'
    };
    return icons[type] || '⚠️';
  }

  getErrorColor(type: string): string {
    const colors: Record<string, string> = {
      'grammar': 'error-grammar',
      'vocabulary': 'error-vocabulary',
      'structure': 'error-structure',
      'spelling': 'error-spelling',
      'suggestion': 'error-suggestion'
    };
    return colors[type] || 'error-default';
  }

  getSeverityClass(percentage: number): string {
    if (percentage >= 30) return 'severity-high';
    if (percentage >= 15) return 'severity-medium';
    return 'severity-low';
  }
}
