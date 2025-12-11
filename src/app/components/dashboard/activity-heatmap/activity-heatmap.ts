import { Component, ChangeDetectionStrategy, input, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { EnhancedHeatmapData } from '../../../models/enhanced-analytics.model';
import { ProgressService } from '../../../services/progress.service';
import { ExerciseService } from '../../../services/exercise.service';
import { format } from 'date-fns';
import { firstValueFrom } from 'rxjs';

interface ExerciseDetail {
  id: string;
  name: string;
  score: number;
  timestamp: Date;
}

interface DayDetails {
  date: string;
  formattedDate: string;
  exerciseCount: number;
  exercises: ExerciseDetail[];
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

interface MonthLabel {
  name: string;
  colStart: number;
  colSpan: number;
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
  private progressService = inject(ProgressService);
  private exerciseService = inject(ExerciseService);

  heatmapData = input.required<EnhancedHeatmapData>();
  isLoading = signal(false);
  selectedDay = signal<DayDetails | null>(null);

  // Cache for exercise names
  private exerciseNameCache = new Map<string, string>();

  readonly dayLabels = ['', 'Mon', '', 'Wed', '', 'Fri', ''];

  // Get streak from ProgressService (same source as header)
  currentStreak = computed(() => {
    const progress = this.progressService.getProgressSignal()();
    return progress?.currentStreak || 0;
  });

  longestStreak = computed(() => {
    const progress = this.progressService.getProgressSignal()();
    const longest = progress?.longestStreak || 0;
    const current = progress?.currentStreak || 0;
    return Math.max(longest, current);
  });

  // Compute month labels from heatmap data
  monthLabels = computed<MonthLabel[]>(() => {
    const data = this.heatmapData();
    if (!data?.weeks?.length) return [];

    const months: MonthLabel[] = [];
    let currentMonth = '';
    let colStart = 0;
    let colSpan = 0;

    data.weeks.forEach((week, weekIndex) => {
      if (week.days.length > 0) {
        const firstDay = new Date(week.days[0].date);
        const monthName = format(firstDay, 'MMM');

        if (monthName !== currentMonth) {
          if (currentMonth && colSpan > 0) {
            months.push({ name: currentMonth, colStart, colSpan });
          }
          currentMonth = monthName;
          colStart = weekIndex;
          colSpan = 1;
        } else {
          colSpan++;
        }
      }
    });

    // Push last month
    if (currentMonth && colSpan > 0) {
      months.push({ name: currentMonth, colStart, colSpan });
    }

    return months;
  });

  // Total contributions count
  totalContributions = computed(() => {
    const data = this.heatmapData();
    if (!data?.weeks?.length) return 0;

    return data.weeks.reduce((total, week) => {
      return total + week.days.reduce((weekTotal, day) => weekTotal + day.exerciseCount, 0);
    }, 0);
  });

  getTooltip(day: HeatmapDay): string {
    const date = new Date(day.date);
    const formattedDate = format(date, 'MMM d, yyyy');
    if (day.exerciseCount === 0) {
      return `No exercises on ${formattedDate}`;
    }
    const exerciseText = day.exerciseCount === 1 ? 'exercise' : 'exercises';
    return `${day.exerciseCount} ${exerciseText} on ${formattedDate}`;
  }

  async showDayDetails(day: HeatmapDay): Promise<void> {
    if (day.exerciseCount === 0) return;

    this.isLoading.set(true);
    const date = new Date(day.date);

    // Load exercise names
    const exerciseIds = [...new Set(day.exercises.map(e => e.id))];
    const uncachedIds = exerciseIds.filter(id => !this.exerciseNameCache.has(id));

    if (uncachedIds.length > 0) {
      try {
        const exercises = await firstValueFrom(this.exerciseService.getExercisesByIds(uncachedIds));
        exercises.forEach(ex => {
          this.exerciseNameCache.set(ex.id, ex.title);
        });
      } catch {
        // Fallback to ID if loading fails
      }
    }

    // Map exercises with names
    const exercisesWithNames: ExerciseDetail[] = day.exercises.map(e => ({
      id: e.id,
      name: this.exerciseNameCache.get(e.id) || e.id,
      score: e.score,
      timestamp: e.timestamp
    }));

    this.selectedDay.set({
      date: day.date,
      formattedDate: format(date, 'EEEE, MMMM d, yyyy'),
      exerciseCount: day.exerciseCount,
      exercises: exercisesWithNames,
      averageScore: day.averageScore,
      totalTimeSpentSeconds: day.totalTimeSpentSeconds,
      totalHintsUsed: day.totalHintsUsed
    });

    this.isLoading.set(false);
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
