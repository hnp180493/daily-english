import { Component, ChangeDetectionStrategy, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AnalyticsData, HeatmapDay } from '../../../models/analytics.model';
import { format } from 'date-fns';

@Component({
  selector: 'app-activity-heatmap',
  imports: [CommonModule],
  templateUrl: './activity-heatmap.html',
  styleUrl: './activity-heatmap.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ActivityHeatmapComponent {
  analytics = input.required<AnalyticsData>();

  getTooltip(day: HeatmapDay): string {
    const date = new Date(day.date);
    const formattedDate = format(date, 'MMM d, yyyy');
    const exerciseText = day.count === 1 ? 'exercise' : 'exercises';
    return `${formattedDate}: ${day.count} ${exerciseText}`;
  }

  showDayDetails(day: HeatmapDay): void {
    if (day.count > 0) {
      console.log('Day details:', day);
      // Future enhancement: Show modal with exercise details
    }
  }
}
