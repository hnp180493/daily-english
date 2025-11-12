import { Component, ChangeDetectionStrategy, input, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AnalyticsData, HeatmapDay } from '../../../models/analytics.model';
import { ProgressService } from '../../../services/progress.service';
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
}

@Component({
  selector: 'app-activity-heatmap',
  imports: [CommonModule],
  templateUrl: './activity-heatmap.html',
  styleUrl: './activity-heatmap.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ActivityHeatmapComponent {
  private progressService = inject(ProgressService);
  private router = inject(Router);

  analytics = input.required<AnalyticsData>();
  selectedDay = signal<DayDetails | null>(null);

  getTooltip(day: HeatmapDay): string {
    const date = new Date(day.date);
    const formattedDate = format(date, 'MMM d, yyyy');
    const exerciseText = day.count === 1 ? 'exercise' : 'exercises';
    return `${formattedDate}: ${day.count} ${exerciseText}`;
  }

  showDayDetails(day: HeatmapDay): void {
    if (day.count === 0) return;

    // Get all attempts for this day
    this.progressService.getUserProgress().subscribe(progress => {
      const allAttempts = Object.values(progress.exerciseHistory);
      const dayAttempts = allAttempts.filter(attempt => {
        const attemptDate = new Date(attempt.timestamp).toISOString().split('T')[0];
        return attemptDate === day.date;
      });

      if (dayAttempts.length === 0) {
        // No actual attempts, just streak placeholder
        const date = new Date(day.date);
        this.selectedDay.set({
          date: day.date,
          formattedDate: format(date, 'EEEE, MMMM d, yyyy'),
          exerciseCount: 0,
          exercises: [],
          averageScore: 0
        });
        return;
      }

      const exercises = dayAttempts.map(attempt => ({
        id: attempt.exerciseId,
        score: Math.round(attempt.accuracyScore),
        timestamp: new Date(attempt.timestamp)
      }));

      const averageScore = Math.round(
        exercises.reduce((sum, ex) => sum + ex.score, 0) / exercises.length
      );

      const date = new Date(day.date);
      this.selectedDay.set({
        date: day.date,
        formattedDate: format(date, 'EEEE, MMMM d, yyyy'),
        exerciseCount: exercises.length,
        exercises,
        averageScore
      });
    });
  }

  closeDetails(): void {
    this.selectedDay.set(null);
  }

  goToExercise(exerciseId: string): void {
    this.router.navigate(['/exercise', exerciseId]);
    this.closeDetails();
  }
}
