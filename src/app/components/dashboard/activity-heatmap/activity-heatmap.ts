import { Component, ChangeDetectionStrategy, input, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { EnhancedHeatmapData } from '../../../models/enhanced-analytics.model';
import { format } from 'date-fns';

interface DayDetails {
  date: string;
  formattedDate: string;
  exerciseCount: number;
  exercises: {
    id: string;
    score: number;
    timestamp: Date;
  }[];
  averageScore: number;
  totalTimeSpentSeconds: number;
  totalHintsUsed: number;
}

interface HeatmapDay {
  date: string;
  exerciseCount: number;
  intensity: 0 | 1 | 2 | 3 | 4;
  averageScore: number;
  totalTimeSpentSeconds: number;
  totalHintsUsed: number;
  exercises: { id: string; score: number; timestamp: Date }[];
}

@Component({
  selector: 'app-activity-heatmap',
  imports: [CommonModule],
  templateUrl: './activity-heatmap.html',
  styleUrl: './activity-heatmap.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ActivityHeatmapComponent {
  private router = inject(Router);

  heatmapData = input.required<EnhancedHeatmapData>();
  isLoading = signal(false);
  selectedDay = signal<DayDetails | null>(null);

  getTooltip(day: HeatmapDay): string {
    const date = new Date(day.date);
    const formattedDate = format(date, 'MMM d, yyyy');
    const exerciseText = day.exerciseCount === 1 ? 'exercise' : 'exercises';
    return `${formattedDate}: ${day.exerciseCount} ${exerciseText}`;
  }

  showDayDetails(day: HeatmapDay): void {
    if (day.exerciseCount === 0) return;

    const date = new Date(day.date);
    this.selectedDay.set({
      date: day.date,
      formattedDate: format(date, 'EEEE, MMMM d, yyyy'),
      exerciseCount: day.exerciseCount,
      exercises: day.exercises,
      averageScore: day.averageScore,
      totalTimeSpentSeconds: day.totalTimeSpentSeconds,
      totalHintsUsed: day.totalHintsUsed
    });
  }

  formatTime(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    if (minutes === 0) {
      return `${remainingSeconds}s`;
    }
    return `${minutes}m ${remainingSeconds}s`;
  }

  closeDetails(): void {
    this.selectedDay.set(null);
  }

  goToExercise(exerciseId: string): void {
    this.router.navigate(['/exercise', exerciseId]);
    this.closeDetails();
  }
}
