import { Component, ChangeDetectionStrategy, input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AnalyticsData } from '../../../models/analytics.model';

@Component({
  selector: 'app-performance-analysis',
  imports: [CommonModule],
  templateUrl: './performance-analysis.html',
  styleUrl: './performance-analysis.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PerformanceAnalysisComponent {
  private router = inject(Router);
  
  analytics = input.required<AnalyticsData>();

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

  goToExercise(exerciseId: string): void {
    this.router.navigate(['/exercise', exerciseId]);
  }
}
