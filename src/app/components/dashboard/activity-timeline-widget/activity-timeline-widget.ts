import { Component, ChangeDetectionStrategy, inject, input, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { toSignal, toObservable } from '@angular/core/rxjs-interop';
import { switchMap } from 'rxjs/operators';
import { ExerciseHistoryService } from '../../../services/exercise-history.service';
import { ProgressService } from '../../../services/progress.service';
import { AuthService } from '../../../services/auth.service';
import { UserProgressHelper } from '../../../models/exercise.model';

export type TimeRange = '7d' | '30d' | '90d';

@Component({
  selector: 'app-activity-timeline-widget',
  imports: [CommonModule],
  templateUrl: './activity-timeline-widget.html',
  styleUrl: './activity-timeline-widget.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ActivityTimelineWidgetComponent {
  private exerciseHistoryService = inject(ExerciseHistoryService);
  private progressService = inject(ProgressService);
  private authService = inject(AuthService);

  // Accept time range input from parent component
  timeRange = input<TimeRange>('7d');

  // Get user progress for guest mode
  private userProgress = toSignal(this.progressService.getUserProgress());
  private isAuthenticated = this.authService.isAuthenticated;

  // Calculate start and end dates based on time range
  private dateRange = computed(() => {
    const range = this.timeRange();
    const endDate = new Date();
    const startDate = new Date();

    switch (range) {
      case '7d':
        startDate.setDate(endDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(endDate.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(endDate.getDate() - 90);
        break;
    }

    return { startDate, endDate };
  });

  // Load activity timeline data - reactive to date range changes
  private timelineData = toSignal(
    toObservable(this.dateRange).pipe(
      switchMap(({ startDate, endDate }) => 
        this.exerciseHistoryService.getActivityTimeline(startDate, endDate)
      )
    ),
    { initialValue: [] }
  );

  // Combine authenticated and guest timeline
  timeline = computed(() => {
    if (this.isAuthenticated()) {
      return this.timelineData() || [];
    } else {
      // Guest mode - build timeline from UserProgress
      const progress = this.userProgress();
      if (!progress) return [];
      
      const { startDate, endDate } = this.dateRange();
      const attempts = UserProgressHelper.getAllAttempts(progress);
      
      // Group by date
      const dateMap = new Map<string, number>();
      attempts.forEach(attempt => {
        const attemptDate = new Date(attempt.timestamp);
        if (attemptDate >= startDate && attemptDate <= endDate) {
          const dateStr = attemptDate.toISOString().split('T')[0];
          dateMap.set(dateStr, (dateMap.get(dateStr) || 0) + 1);
        }
      });
      
      return Array.from(dateMap.entries())
        .map(([date, completionCount]) => ({ date, completionCount }))
        .sort((a, b) => a.date.localeCompare(b.date));
    }
  });

  isLoading = computed(() => false);
  isEmpty = computed(() => {
    const data = this.timeline();
    return data.length === 0 || data.every(d => d.completionCount === 0);
  });

  // Get max completion count for scaling
  maxCompletions = computed(() => {
    const data = this.timeline();
    if (data.length === 0) return 1;
    return Math.max(...data.map(d => d.completionCount), 1);
  });

  /**
   * Format date for display
   */
  formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric'
    });
  }

  /**
   * Get bar height percentage
   */
  getBarHeight(count: number): number {
    if (count === 0) return 0;
    const max = this.maxCompletions();
    // Linear scale from count to max
    return (count / max) * 100;
  }

  /**
   * Get bar color class based on count
   */
  getBarColorClass(count: number): string {
    if (count === 0) return 'bar-empty';
    if (count >= 5) return 'bar-high';
    if (count >= 3) return 'bar-medium';
    return 'bar-low';
  }
}
