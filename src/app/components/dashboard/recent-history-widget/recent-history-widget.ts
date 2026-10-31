import { Component, ChangeDetectionStrategy, inject, computed, signal, effect, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { ExerciseHistoryRecord } from '../../../models/exercise-history.model';
import { ExerciseService } from '../../../services/exercise.service';
import { ProgressService } from '../../../services/progress.service';
import { AuthService } from '../../../services/auth.service';
import { UserProgressHelper } from '../../../models/exercise.model';
import { TranslationService } from '../../../services/translation.service';
import { dateLocale, tCount, unitMin, unitSec } from '../dashboard-i18n';

@Component({
  selector: 'app-recent-history-widget',
  imports: [CommonModule],
  templateUrl: './recent-history-widget.html',
  styleUrl: './recent-history-widget.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RecentHistoryWidgetComponent {
  private exerciseService = inject(ExerciseService);
  private progressService = inject(ProgressService);
  private authService = inject(AuthService);
  private router = inject(Router);
  protected translate = inject(TranslationService);

  // Input from parent (Dashboard) - receives data from EnhancedAnalytics recentHistory
  historyInput = input<{ exerciseId: string; completedAt: Date; finalScore: number; timeSpentSeconds: number; hintsUsed: number }[]>([]);

  // Get user progress for guest mode
  private userProgress = toSignal(this.progressService.getUserProgress());
  private isAuthenticated = this.authService.isAuthenticated;

  // Combine authenticated and guest history
  history = computed(() => {
    // Signed in but the parent passed nothing (cloud history loading/failed): show local attempts
    if (this.isAuthenticated() && this.historyInput().length > 0) {
      // Use input data from parent (already loaded by EnhancedAnalyticsService)
      // Map to ExerciseHistoryRecord format for template compatibility
      const inputData = this.historyInput();
      return inputData.map(item => ({
        id: item.exerciseId,
        userId: '',
        exerciseId: item.exerciseId,
        completedAt: new Date(item.completedAt),
        finalScore: item.finalScore,
        timeSpentSeconds: item.timeSpentSeconds,
        hintsUsed: item.hintsUsed,
        sentenceAttempts: [],
        penaltyMetrics: {
          baseScore: item.finalScore,
          totalIncorrectAttempts: 0,
          totalRetries: 0,
          totalPenalty: 0,
          finalScore: item.finalScore
        },
        createdAt: new Date(item.completedAt)
      } as ExerciseHistoryRecord));
    } else {
      // Guest mode - convert UserProgress to ExerciseHistoryRecord format
      const progress = this.userProgress();
      if (!progress) return [];

      const attempts = UserProgressHelper.getAllAttempts(progress);
      return attempts
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 10)
        .map(attempt => ({
          id: attempt.exerciseId,
          userId: 'guest',
          exerciseId: attempt.exerciseId,
          completedAt: new Date(attempt.timestamp),
          finalScore: attempt.accuracyScore,
          timeSpentSeconds: 0, // Not tracked in old format
          hintsUsed: attempt.hintsUsed || 0,
          sentenceAttempts: [],
          penaltyMetrics: {
            baseScore: attempt.baseScore || attempt.accuracyScore,
            totalIncorrectAttempts: attempt.totalIncorrectAttempts || 0,
            totalRetries: attempt.totalRetries || 0,
            totalPenalty: attempt.totalPenalty || 0,
            finalScore: attempt.accuracyScore
          },
          createdAt: new Date(attempt.timestamp)
        } as ExerciseHistoryRecord));
    }
  });

  isLoading = computed(() => false);
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
    // Clamp: a slightly-ahead device clock produced "-197 mins ago"
    const diffMs = Math.max(0, now.getTime() - date.getTime());
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) {
      if (diffMins === 0) return this.translate.t('dashboard.time.just_now');
      return tCount(this.translate, 'dashboard.time.mins_ago', diffMins);
    } else if (diffHours < 24) {
      return tCount(this.translate, 'dashboard.time.hours_ago', diffHours);
    } else if (diffDays < 7) {
      return tCount(this.translate, 'dashboard.time.days_ago', diffDays);
    } else {
      return date.toLocaleDateString(dateLocale(this.translate));
    }
  }

  /**
   * Format time spent in minutes
   */
  formatTimeSpent(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    
    if (minutes === 0) {
      return unitSec(this.translate, remainingSeconds);
    } else if (remainingSeconds === 0) {
      return unitMin(this.translate, minutes);
    } else {
      return `${unitMin(this.translate, minutes)} ${unitSec(this.translate, remainingSeconds)}`;
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
