import { Component, ChangeDetectionStrategy, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { AnalyticsService } from '../../services/analytics.service';
import { ProgressService } from '../../services/progress.service';
import { ProgressMigrationUtility } from '../../services/progress-migration.utility';
import { TimeRange } from '../../models/analytics.model';
import { ProgressChartsComponent } from './progress-charts/progress-charts';
import { PerformanceAnalysisComponent } from './performance-analysis/performance-analysis';
import { ActivityHeatmapComponent } from './activity-heatmap/activity-heatmap';
import { VocabularyStatsComponent } from './vocabulary-stats/vocabulary-stats';
import { UserProgressHelper } from '../../models/exercise.model';

@Component({
  selector: 'app-dashboard',
  imports: [CommonModule, RouterModule, ProgressChartsComponent, PerformanceAnalysisComponent, ActivityHeatmapComponent, VocabularyStatsComponent],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DashboardComponent {
  private analyticsService = inject(AnalyticsService);
  private progressService = inject(ProgressService);
  private migrationUtility = inject(ProgressMigrationUtility);

  userProgress = toSignal(this.progressService.getUserProgress());
  selectedTimeRange = signal<TimeRange>('30d');
  isLoading = signal(false);
  isMigrating = signal(false);
  migrationComplete = signal(false);

  analytics = computed(() => {
    const progress = this.userProgress();
    const timeRange = this.selectedTimeRange();
    return this.analyticsService.computeAnalytics(progress, timeRange);
  });

  hasEnoughData = computed(() => {
    const progress = this.userProgress();
    return progress && UserProgressHelper.getAttemptsCount(progress) >= 2;
  });

  needsMigration = computed(() => {
    const progress = this.userProgress();
    return progress && this.migrationUtility.needsMigration(progress);
  });

  exportData(): void {
    const progress = this.userProgress();
    const analytics = this.analytics();
    
    if (!progress) return;

    const exportData = this.analyticsService.exportProgressData(progress, analytics);
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const date = new Date().toISOString().split('T')[0];
    link.download = `daily-english-stats-${date}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  printReport(): void {
    window.print();
  }

  setTimeRange(range: TimeRange): void {
    this.selectedTimeRange.set(range);
  }

  runMigration(): void {
    this.isMigrating.set(true);
    this.migrationUtility.migrateProgressData().subscribe({
      next: (success) => {
        this.isMigrating.set(false);
        if (success) {
          this.migrationComplete.set(true);
          // Reload page to refresh analytics
          setTimeout(() => window.location.reload(), 1000);
        }
      },
      error: (error) => {
        console.error('Migration failed:', error);
        this.isMigrating.set(false);
      }
    });
  }
}
