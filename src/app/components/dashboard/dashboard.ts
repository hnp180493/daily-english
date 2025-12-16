import { Component, ChangeDetectionStrategy, signal, computed, inject, effect, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';
import { InternalAnalyticsService } from '../../services/internal-analytics.service';
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
import { ErrorPatternsAnalysisComponent } from './error-patterns-analysis/error-patterns-analysis';
import { DictationStatsWidgetComponent } from './dictation-stats-widget/dictation-stats-widget';
import { DashboardSkeletonComponent } from './dashboard-skeleton/dashboard-skeleton';
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
    ErrorPatternsAnalysisComponent,
    DashboardSkeletonComponent,
    // DictationStatsWidgetComponent
  ],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DashboardComponent implements OnInit, OnDestroy {
  private analyticsService = inject(InternalAnalyticsService);
  private enhancedAnalyticsService = inject(EnhancedAnalyticsService);
  private progressService = inject(ProgressService);
  private authService = inject(AuthService);
  private migrationUtility = inject(ProgressMigrationUtility);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  userProgress = toSignal(this.progressService.getUserProgress());
  currentUser = this.authService.currentUser;
  selectedTimeRange = signal<TimeRange>('30d');
  historyTimeRange = signal<HistoryTimeRange>('7d');
  activeTab = signal<'overview' | 'performance' | 'activity' | 'insights'>('overview');
  isLoading = signal(true);
  isLoadingEnhanced = signal(false);
  enhancedError = signal<string | null>(null);
  isMigrating = signal(false);
  migrationComplete = signal(false);

  // Debounced time range changes
  private timeRangeChange$ = new Subject<{ userId: string; timeRange: TimeRange }>();
  
  enhancedAnalytics = signal<EnhancedAnalyticsData | null>(null);

  // Local analytics signal for guest mode
  private localAnalytics = signal<any>(null);

  // Compute analytics from enhanced data (Supabase) with exercise info
  analytics = computed(() => {
    const enhanced = this.enhancedAnalytics();
    if (!enhanced) {
      // Guest mode - return local analytics
      return this.localAnalytics() || this.analyticsService.computeAnalytics(this.userProgress(), this.selectedTimeRange());
    }
    
    // Build analytics from enhanced data
    return this.buildAnalyticsFromEnhanced(enhanced);
  });
  
  private buildAnalyticsFromEnhanced(enhanced: EnhancedAnalyticsData): any {
    // Extract score trends from performance trends
    const scoreTrends = {
      dates: enhanced.performanceTrends.dailyAverages.map(d => d.date),
      scores: enhanced.performanceTrends.dailyAverages.map(d => d.averageScore),
      averageScore: enhanced.performanceTrends.overallAverage
    };
    
    return {
      scoreTrends,
      categoryDistribution: enhanced.categoryDistribution || [],
      difficultyBreakdown: enhanced.difficultyBreakdown || [],
      topErrors: [],
      exercisesNeedingReview: enhanced.exercisesNeedingReview || [],
      categoryAccuracy: enhanced.categoryAccuracy || [],
      difficultyComparison: enhanced.difficultyComparison || [],
      heatmapData: [],
      currentStreak: enhanced.activityHeatmap.currentStreak,
      longestStreak: enhanced.activityHeatmap.longestStreak,
      vocabularyStats: enhanced.vocabularyStats,
      exportTimestamp: new Date(),
      totalExercises: enhanced.practiceStats.totalExercisesCompleted
    };
  }

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
          this.isLoading.set(false);
          this.enhancedAnalytics.set(data);
        },
        error: (error) => {
          console.error('Failed to load enhanced analytics:', error);
          this.isLoadingEnhanced.set(false);
          this.isLoading.set(false);
          this.enhancedError.set('Failed to load analytics. Please try again.');
        }
      });

    // Watch for time range changes
    effect(() => {
      const user = this.currentUser();
      const timeRange = this.selectedTimeRange();
      
      if (user?.uid) {
        this.timeRangeChange$.next({ userId: user.uid, timeRange });
      } else {
        // Guest mode - enhanced analytics will be null, reload local analytics
        this.enhancedAnalytics.set(null);
        this.loadLocalAnalytics();
      }
    });
  }

  ngOnInit(): void {
    // Scroll to top when entering dashboard
    window.scrollTo({ top: 0, behavior: 'instant' });
    
    // Read tab from query params
    const tabParam = this.route.snapshot.queryParamMap.get('tab');
    if (tabParam && ['overview', 'performance', 'activity', 'insights'].includes(tabParam)) {
      this.activeTab.set(tabParam as 'overview' | 'performance' | 'activity' | 'insights');
    }
    
    // Initial load
    const user = this.currentUser();
    const timeRange = this.selectedTimeRange();
    
    if (user?.uid) {
      this.timeRangeChange$.next({ userId: user.uid, timeRange });
    } else {
      // Guest mode - compute local analytics asynchronously
      this.loadLocalAnalytics();
    }
  }

  ngOnDestroy(): void {
    // Clean up subscription
    this.timeRangeChange$.complete();
  }

  private async loadLocalAnalytics(): Promise<void> {
    this.isLoading.set(true);
    const progress = this.userProgress();
    const timeRange = this.selectedTimeRange();
    
    if (progress) {
      const analytics = await this.analyticsService.computeAnalyticsAsync(progress, timeRange);
      this.localAnalytics.set(analytics);
    }
    this.isLoading.set(false);
  }

  retryEnhancedAnalytics(): void {
    const user = this.currentUser();
    const timeRange = this.selectedTimeRange();
    
    if (!user?.uid) return;
    
    this.timeRangeChange$.next({ userId: user.uid, timeRange });
  }

  hasEnoughData = computed(() => {
    const progress = this.userProgress();
    return progress && UserProgressHelper.getAttemptsCount(progress) >= 1;
  });

  // Compute practice stats for guest mode from local data
  guestPracticeStats = computed(() => {
    const progress = this.userProgress();
    if (!progress || this.currentUser()) return null;

    const attempts = UserProgressHelper.getAllAttempts(progress);
    if (attempts.length === 0) return null;

    const totalExercisesCompleted = attempts.length;
    const averageAccuracy = attempts.reduce((sum, a) => sum + a.accuracyScore, 0) / totalExercisesCompleted;
    const totalTimeSpentMinutes = 0; // Not tracked in guest mode
    const averageTimePerExercise = 0; // Not tracked in guest mode
    const totalHintsUsed = attempts.reduce((sum, a) => sum + (a.hintsUsed || 0), 0);

    // Calculate trend (compare recent vs overall)
    const recentAttempts = attempts.slice(-5);
    const recentAverage = recentAttempts.reduce((sum, a) => sum + a.accuracyScore, 0) / recentAttempts.length;
    const overallAverage = averageAccuracy;

    return {
      totalExercisesCompleted,
      averageAccuracy: Math.round(averageAccuracy),
      totalTimeSpentMinutes,
      averageTimePerExercise,
      totalHintsUsed,
      trend: recentAverage > overallAverage ? 'improving' as const : 
             recentAverage < overallAverage ? 'declining' as const : 
             'stable' as const,
      recentAverage: Math.round(recentAverage),
      overallAverage: Math.round(overallAverage)
    };
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
    // Update URL query params without reloading
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab },
      queryParamsHandling: 'merge',
      replaceUrl: true
    });
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
