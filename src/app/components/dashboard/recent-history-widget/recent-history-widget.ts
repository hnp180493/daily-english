import { Component, ChangeDetectionStrategy, inject, computed, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { ExerciseHistoryService } from '../../../services/exercise-history.service';
import { ExerciseHistoryRecord } from '../../../models/exercise-history.model';
import { ExerciseService } from '../../../services/exercise.service';

@Component({
  selector: 'app-recent-history-widget',
  imports: [CommonModule],
  templateUrl: './recent-history-widget.html',
  styleUrl: './recent-history-widget.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RecentHistoryWidgetComponent {
  private exerciseHistoryService = inject(ExerciseHistoryService);
  private exerciseService = inject(ExerciseService);
  private router = inject(Router);

  // Load recent history (limit 10) using toSignal for reactive updates
  private historyData = toSignal(this.exerciseHistoryService.getRecentHistory(10), {
    initialValue: [] as ExerciseHistoryRecord[]
  });

  history = computed(() => this.historyData());
  isLoading = computed(() => false); // toSignal handles loading state
  isEmpty = computed(() => this.history().length === 0);
  
  exerciseTitles = signal<Map<string, string>>(new Map());

  constructor() {
    effect(() => {
      const records = this.history();
      const ids = records.map(r => r.exerciseId);
      
      if (ids.length === 0) return;
      
      this.exerciseService.getExercisesByIds(ids).subscribe(exercises => {
        const titleMap = new Map<string, string>();
        exercises.forEach(ex => {
          titleMap.set(ex.id, ex.title);
        });
        this.exerciseTitles.set(titleMap);
      });
    });
  }

  /**
   * Format completion date
   */
  formatDate(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) {
      return `${diffMins} min${diffMins !== 1 ? 's' : ''} ago`;
    } else if (diffHours < 24) {
      return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    } else if (diffDays < 7) {
      return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
    } else {
      return date.toLocaleDateString();
    }
  }

  /**
   * Format time spent in minutes
   */
  formatTimeSpent(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    
    if (minutes === 0) {
      return `${remainingSeconds}s`;
    } else if (remainingSeconds === 0) {
      return `${minutes}m`;
    } else {
      return `${minutes}m ${remainingSeconds}s`;
    }
  }

  /**
   * Get exercise title or fallback to ID
   */
  getExerciseTitle(exerciseId: string): string {
    return this.exerciseTitles().get(exerciseId) || exerciseId;
  }

  /**
   * Navigate to exercise detail in review mode
   */
  viewExercise(exerciseId: string): void {
    this.router.navigate(['/exercise', exerciseId], {
      queryParams: { mode: 'review' }
    });
  }
}
