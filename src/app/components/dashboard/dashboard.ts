import { Component, ChangeDetectionStrategy, signal, computed, inject, effect, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';
import { AnalyticsService } from '../../services/analytics.service';
import { EnhancedAnalyticsService } from '../../services/enhanced-analytics.service';
import { ProgressService } from '../../services/progress.service';
import { ProgressMigrationUtility } from '../../services/progress-migration.utility';
import { AuthService } from '../../services/auth.service';
import { TimeRange } from '../../models/analytics.model';
import { EnhancedAnalyticsData } from '../../models/enhanced-analytics.model';
import { ProgressChartsComponent } from './progress-charts/progress-charts';
import { PerformanceAnalysisComponent } from './performance-analysis/performance-analysis';
import { ActivityHeatmapComponent } from './activity-heatmap/activity-heatmap';
import { VocabularyStatsComponent } from './vocabulary-stats/vocabulary-stats';
import { RecentHistoryWidgetComponent } from './recent-history-widget/recent-history-widget';
import { PracticeStatsWidgetComponent } from './practice-stats-widget/practice-stats-widget';
import { ActivityTimelineWidgetComponent, TimeRange as HistoryTimeRange } from './activity-timeline-widget/activity-timeline-widget';
import { PerformanceTrendChartComponent } from './performance-trend-chart/performance-trend-chart';
import { WeakAreasAnalysisComponent } from './weak-areas-analysis/weak-areas-analysis';
import { TimeOfDayAnalysisComponent } from './time-of-day-analysis/time-of-day-analysis';
import { BestPerformancesComponent } from './best-performances/best-performances';
import { MostPracticedComponent } from './most-practiced/most-practiced';
import { LearningVelocityComponent } from './learning-velocity/learning-velocity';
import { HintsUsageAnalysisComponent } from './hints-usage-analysis/hints-usage-analysis';
import { UserProgressHelper } from '../../models/exercise.model';

@Component({
  selector: 'app-dashboard',
  imports: [
    CommonModule, 
    RouterModule, 
    ProgressChartsComponent, 
    PerformanceAnalysisComponent, 
    ActivityHeatmapComponent, 
    VocabularyStatsComponent,
    RecentHistoryWidgetComponent,
    PracticeStatsWidgetComponent,
    ActivityTimelineWidgetComponent,
    PerformanceTrendChartComponent,
    WeakAreasAnalysisComponent,
    TimeOfDayAnalysisComponent,
    BestPerformancesComponent,
    MostPracticedComponent,
    LearningVelocityComponent,
    HintsUsageAnalysisComponent
  ],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DashboardComponent implements OnInit {
  private analyticsService = inject(AnalyticsService);
  private enhancedAnalyticsService = inject(EnhancedAnalyticsService);
  private progressService = inject(ProgressService);
  private authService = inject(AuthService);
  private migrationUtility = inject(ProgressMigrationUtility);

  userProgress = toSignal(this.progressService.getUserProgress());
  currentUser = this.authService.currentUser;
  selectedTimeRange = signal<TimeRange>('30d');
  historyTimeRange = signal<HistoryTimeRange>('7d');
  activeTab = signal<'overview' | 'performance' | 'activity' | 'insights'>('overview');
  isLoading = signal(false);
  isLoadingEnhanced = signal(false);
  enhancedError = signal<string | null>(null);
  isMigrating = signal(false);
  migrationComplete = signal(false);

  // Debounced time range changes
  private timeRangeChange$ = new Subject<{ userId: string; timeRange: TimeRange }>();
  
  enhancedAnalytics = signal<EnhancedAnalyticsData | null>(null);

  analytics = computed(() => {
    const progress = this.userProgress();
    const timeRange = this.selectedTimeRange();
    return this.analyticsService.computeAnalytics(progress, timeRange);
  });

  constructor() {
    // Set up debounced analytics loading
    this.timeRangeChange$
      .pipe(
        debounceTime(300), // Debounce for 300ms
        distinctUntilChanged((prev, curr) => 
          prev.userId === curr.userId && prev.timeRange === curr.timeRange
        ),
        switchMap(({ userId, timeRange }) => {
          this.isLoadingEnhanced.set(true);
          this.enhancedError.set(null);
          return this.enhancedAnalyticsService.computeHistoryAnalytics(userId, timeRange);
        })
      )
      .subscribe({
        next: (data) => {
          this.isLoadingEnhanced.set(false);
          this.enhancedAnalytics.set(data);
        },
        error: (error) => {
          console.error('Failed to load enhanced analytics:', error);
          this.isLoadingEnhanced.set(false);
          this.enhancedError.set('Failed to load analytics. Please try again.');
        }
      });

    // Watch for time range changes
    effect(() => {
      const user = this.currentUser();
      const timeRange = this.selectedTimeRange();
      
      if (user?.uid) {
        this.timeRangeChange$.next({ userId: user.uid, timeRange });
      }
    });
  }

  ngOnInit(): void {
    // Initial load
    const user = this.currentUser();
    const timeRange = this.selectedTimeRange();
    
    if (user?.uid) {
      this.timeRangeChange$.next({ userId: user.uid, timeRange });
    }
  }

  retryEnhancedAnalytics(): void {
    const user = this.currentUser();
    const timeRange = this.selectedTimeRange();
    
    if (!user?.uid) return;
    
    this.timeRangeChange$.next({ userId: user.uid, timeRange });
  }

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
    const enhanced = this.enhancedAnalytics();
    
    if (!progress) return;

    // Prepare export data with enhanced analytics
    const exportData = {
      ...this.analyticsService.exportProgressData(progress, analytics),
      enhancedAnalytics: enhanced ? {
        performanceTrends: {
          dailyAverages: enhanced.performanceTrends.dailyAverages,
          trendDirection: enhanced.performanceTrends.trendDirection,
          trendSlope: enhanced.performanceTrends.trendSlope,
          overallAverage: enhanced.performanceTrends.overallAverage
        },
        weakAreas: enhanced.weakAreas.map((area: any) => ({
          pattern: area.pattern,
          averageAccuracy: area.averageAccuracy,
          averageRetryCount: area.averageRetryCount,
          occurrenceCount: area.occurrenceCount,
          recommendation: area.recommendation,
          exampleCount: area.exampleSentences.length
        })),
        timeOfDayAnalysis: {
          periods: enhanced.timeOfDayAnalysis.periods.map((period: any) => ({
            name: period.name,
            displayName: period.displayName,
            timeRange: period.timeRange,
            exerciseCount: period.exerciseCount,
            averageAccuracy: period.averageAccuracy,
            isMostProductive: period.isMostProductive
          }))
        },
        learningVelocity: {
          averageExercisesPerWeek: enhanced.learningVelocity.averageExercisesPerWeek,
          currentWeekCount: enhanced.learningVelocity.currentWeekCount,
          percentageDifference: enhanced.learningVelocity.percentageDifference,
          weeklyBreakdown: enhanced.learningVelocity.weeklyBreakdown
        },
        hintsAnalysis: {
          totalHintsUsed: enhanced.hintsAnalysis.totalHintsUsed,
          averageHintsPerExercise: enhanced.hintsAnalysis.averageHintsPerExercise,
          trend: enhanced.hintsAnalysis.trend,
          recentAverage: enhanced.hintsAnalysis.recentAverage,
          overallAverage: enhanced.hintsAnalysis.overallAverage,
          percentageChange: enhanced.hintsAnalysis.percentageChange
        },
        bestPerformances: enhanced.bestPerformances.map((perf: any) => ({
          exerciseId: perf.exerciseId,
          score: perf.score,
          completedAt: perf.completedAt.toISOString(),
          timeSpentSeconds: perf.timeSpentSeconds,
          rank: perf.rank
        })),
        mostPracticed: enhanced.mostPracticed.map((ex: any) => ({
          exerciseId: ex.exerciseId,
          attemptCount: ex.attemptCount,
          averageScore: ex.averageScore,
          firstAttemptScore: ex.firstAttemptScore,
          recentAttemptScore: ex.recentAttemptScore,
          improvementPercentage: ex.improvementPercentage
        })),
        activityHeatmap: {
          currentStreak: enhanced.activityHeatmap.currentStreak,
          longestStreak: enhanced.activityHeatmap.longestStreak,
          totalDaysActive: enhanced.activityHeatmap.weeks.reduce(
            (sum: number, week: any) => sum + week.days.filter((d: any) => d.exerciseCount > 0).length,
            0
          )
        },
        practiceStats: {
          totalExercisesCompleted: enhanced.practiceStats.totalExercisesCompleted,
          averageAccuracy: enhanced.practiceStats.averageAccuracy,
          totalTimeSpentMinutes: enhanced.practiceStats.totalTimeSpentMinutes,
          averageTimePerExercise: enhanced.practiceStats.averageTimePerExercise,
          totalHintsUsed: enhanced.practiceStats.totalHintsUsed,
          trend: enhanced.practiceStats.trend,
          recentAverage: enhanced.practiceStats.recentAverage,
          overallAverage: enhanced.practiceStats.overallAverage
        }
      } : null,
      exportedAt: new Date().toISOString(),
      exportVersion: '2.0'
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const date = new Date().toISOString().split('T')[0];
    link.download = `daily-english-history-${date}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  printReport(): void {
    window.print();
  }

  setTimeRange(range: TimeRange): void {
    this.selectedTimeRange.set(range);
    // The effect will automatically trigger the debounced load
  }

  setHistoryTimeRange(range: HistoryTimeRange): void {
    this.historyTimeRange.set(range);
  }

  setActiveTab(tab: 'overview' | 'performance' | 'activity' | 'insights'): void {
    this.activeTab.set(tab);
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
