import { Component, ChangeDetectionStrategy, inject, input, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { switchMap, of } from 'rxjs';
import { ExerciseHistoryService } from '../../../services/exercise-history.service';
import { ActivityTimelineData } from '../../../models/exercise-history.model';

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

  // Accept time range input from parent component
  timeRange = input<TimeRange>('7d');

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

  // Load activity timeline data using computed that reacts to time range changes
  private timelineData = toSignal(
    computed(() => {
      const { startDate, endDate } = this.dateRange();
      return this.exerciseHistoryService.getActivityTimeline(startDate, endDate);
    })()
  );

  timeline = computed(() => this.timelineData() || []);
  isLoading = computed(() => this.timelineData() === undefined);
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
    const max = this.maxCompletions();
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
