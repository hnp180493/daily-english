import { Injectable, inject } from '@angular/core';
import { Observable, of } from 'rxjs';
import { map, catchError, retry, switchMap } from 'rxjs/operators';
import { ExerciseHistoryService } from './exercise-history.service';
import { ExerciseHistoryRecord } from '../models/exercise-history.model';
import { TimeRange } from '../models/analytics.model';
import {
  EnhancedAnalyticsData,
  PerformanceTrendData,
  WeakAreaData,
  TimeOfDayData,
  LearningVelocityData,
  HintsAnalysisData,
  BestPerformanceData,
  MostPracticedData,
  EnhancedHeatmapData,
  PracticeStatsData
} from '../models/enhanced-analytics.model';

/**
 * Enhanced Analytics Service
 * Computes comprehensive analytics from exercise history data
 */
@Injectable({
  providedIn: 'root'
})
export class EnhancedAnalyticsService {
  private exerciseHistoryService = inject(ExerciseHistoryService);

  // Cache with 5-minute TTL
  private analyticsCache = new Map<string, {
    data: EnhancedAnalyticsData;
    timestamp: number;
  }>();

  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  /**
   * Main method to compute all analytics
   */
  computeHistoryAnalytics(
    userId: string,
    timeRange: TimeRange
  ): Observable<EnhancedAnalyticsData> {
    // Check cache first
    const cached = this.getCachedAnalytics(userId, timeRange);
    if (cached) {
      return of(cached);
    }

    // Calculate date range
    const { startDate, endDate } = this.getDateRange(timeRange);

    // Fetch history data with optimized limit based on time range
    const limit = this.getOptimalLimit(timeRange);

    // Fetch history data and compute analytics
    return this.exerciseHistoryService.getRecentHistory(limit).pipe(
      switchMap(records => {
        // Filter records by date range
        const filteredRecords = this.filterRecordsByDateRange(records, startDate, endDate);
        
        // Compute all analytics
        const analytics = this.computeAllAnalytics(filteredRecords);
        
        // Cache the result
        this.cacheAnalytics(userId, timeRange, analytics);
        
        return of(analytics);
      }),
      catchError(error => {
        console.error('[EnhancedAnalytics] Failed to compute analytics:', error);
        return of(this.getEmptyAnalytics());
      }),
      retry({ count: 2, delay: 1000 })
    );
  }

  /**
   * Get optimal limit based on time range to reduce data fetching
   */
  private getOptimalLimit(timeRange: TimeRange): number {
    switch (timeRange) {
      case '7d':
        return 100; // Likely enough for 7 days
      case '30d':
        return 300; // Likely enough for 30 days
      case '90d':
        return 500; // Likely enough for 90 days
      case 'all':
        return 1000; // Maximum for all time
      default:
        return 300;
    }
  }

  /**
   * Compute all analytics from filtered records
   */
  private computeAllAnalytics(records: ExerciseHistoryRecord[]): EnhancedAnalyticsData {
    return {
      performanceTrends: this.calculatePerformanceTrends(records),
      weakAreas: this.identifyWeakAreas(records),
      timeOfDayAnalysis: this.analyzeTimeOfDayProductivity(records),
      learningVelocity: this.calculateLearningVelocity(records),
      hintsAnalysis: this.analyzeHintsUsage(records),
      bestPerformances: this.getBestPerformances(records, 5),
      mostPracticed: this.getMostPracticed(records, 5),
      activityHeatmap: this.generateEnhancedHeatmap(records),
      practiceStats: this.calculatePracticeStats(records)
    };
  }

  /**
   * Calculate performance trends
   */
  calculatePerformanceTrends(records: ExerciseHistoryRecord[]): PerformanceTrendData {
    if (records.length === 0) {
      return {
        dailyAverages: [],
        trendDirection: 'stable',
        trendSlope: 0,
        overallAverage: 0
      };
    }

    // Group by date and calculate daily averages
    const dailyMap = new Map<string, { totalScore: number; count: number }>();

    records.forEach(record => {
      const dateStr = new Date(record.completedAt).toISOString().split('T')[0];
      const existing = dailyMap.get(dateStr) || { totalScore: 0, count: 0 };
      dailyMap.set(dateStr, {
        totalScore: existing.totalScore + record.finalScore,
        count: existing.count + 1
      });
    });

    // Convert to daily averages array
    const dailyAverages = Array.from(dailyMap.entries())
      .map(([date, data]) => ({
        date,
        averageScore: Math.round(data.totalScore / data.count),
        exerciseCount: data.count
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Calculate overall average
    const overallAverage = Math.round(
      records.reduce((sum, r) => sum + r.finalScore, 0) / records.length
    );

    // Calculate trend using linear regression
    const trendSlope = this.calculateLinearRegressionSlope(dailyAverages);

    // Determine trend direction
    let trendDirection: 'improving' | 'stable' | 'declining';
    if (trendSlope > 0.5) {
      trendDirection = 'improving';
    } else if (trendSlope < -0.5) {
      trendDirection = 'declining';
    } else {
      trendDirection = 'stable';
    }

    return {
      dailyAverages,
      trendDirection,
      trendSlope,
      overallAverage
    };
  }

  /**
   * Calculate linear regression slope
   */
  private calculateLinearRegressionSlope(
    dailyAverages: { date: string; averageScore: number; exerciseCount: number }[]
  ): number {
    if (dailyAverages.length < 2) return 0;

    const n = dailyAverages.length;
    let sumX = 0;
    let sumY = 0;
    let sumXY = 0;
    let sumX2 = 0;

    dailyAverages.forEach((day, index) => {
      const x = index;
      const y = day.averageScore;
      sumX += x;
      sumY += y;
      sumXY += x * y;
      sumX2 += x * x;
    });

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    return slope;
  }

  /**
   * Identify weak areas
   */
  identifyWeakAreas(records: ExerciseHistoryRecord[]): WeakAreaData[] {
    if (records.length < 10) {
      return [];
    }

    // Pattern keywords for identification
    const patterns = [
      { key: 'passive', name: 'Passive voice', keywords: ['was', 'were', 'been', 'being', 'by'] },
      { key: 'past_perfect', name: 'Past perfect tense', keywords: ['had', 'have', 'has been'] },
      { key: 'conditional', name: 'Conditional sentences', keywords: ['would', 'could', 'should', 'if'] },
      { key: 'present_perfect', name: 'Present perfect tense', keywords: ['have', 'has', 'since', 'for'] },
      { key: 'relative_clause', name: 'Relative clauses', keywords: ['which', 'who', 'whom', 'whose', 'that'] },
      { key: 'modal', name: 'Modal verbs', keywords: ['must', 'might', 'may', 'can', 'could'] },
      { key: 'gerund', name: 'Gerunds and infinitives', keywords: ['ing', 'to '] },
      { key: 'article', name: 'Articles', keywords: ['the', 'a', 'an'] }
    ];

    // Analyze sentence attempts
    const patternStats = new Map<string, {
      pattern: string;
      totalAccuracy: number;
      totalRetries: number;
      count: number;
      examples: { original: string; userTranslation: string; accuracyScore: number }[];
    }>();

    records.forEach(record => {
      record.sentenceAttempts.forEach(attempt => {
        // Skip if originalText or userTranslation is undefined
        if (!attempt.originalText || !attempt.userTranslation) {
          return;
        }
        
        const lowerOriginal = attempt.originalText.toLowerCase();
        const lowerTranslation = attempt.userTranslation.toLowerCase();

        patterns.forEach(pattern => {
          const hasPattern = pattern.keywords.some(keyword => 
            lowerOriginal.includes(keyword) || lowerTranslation.includes(keyword)
          );

          if (hasPattern) {
            const existing = patternStats.get(pattern.key) || {
              pattern: pattern.name,
              totalAccuracy: 0,
              totalRetries: 0,
              count: 0,
              examples: []
            };

            existing.totalAccuracy += attempt.accuracyScore;
            existing.totalRetries += attempt.retryCount;
            existing.count += 1;

            if (existing.examples.length < 3) {
              existing.examples.push({
                original: attempt.originalText,
                userTranslation: attempt.userTranslation,
                accuracyScore: attempt.accuracyScore
              });
            }

            patternStats.set(pattern.key, existing);
          }
        });
      });
    });

    // Convert to WeakAreaData and sort by average accuracy
    const weakAreas: WeakAreaData[] = Array.from(patternStats.entries())
      .map(([key, stats]) => ({
        pattern: stats.pattern,
        averageAccuracy: Math.round(stats.totalAccuracy / stats.count),
        averageRetryCount: Math.round((stats.totalRetries / stats.count) * 10) / 10,
        occurrenceCount: stats.count,
        recommendation: this.getRecommendation(stats.pattern),
        exampleSentences: stats.examples
      }))
      .sort((a, b) => a.averageAccuracy - b.averageAccuracy)
      .slice(0, 3);

    return weakAreas;
  }

  /**
   * Get recommendation for a pattern
   */
  private getRecommendation(pattern: string): string {
    const recommendations: Record<string, string> = {
      'Passive voice': 'Practice identifying passive constructions and converting between active and passive voice',
      'Past perfect tense': 'Focus on understanding when to use past perfect vs. simple past',
      'Conditional sentences': 'Review the different types of conditionals (zero, first, second, third)',
      'Present perfect tense': 'Practice distinguishing between present perfect and simple past',
      'Relative clauses': 'Study defining vs. non-defining relative clauses and proper pronoun usage',
      'Modal verbs': 'Review the different meanings and uses of modal verbs',
      'Gerunds and infinitives': 'Learn which verbs are followed by gerunds vs. infinitives',
      'Articles': 'Practice when to use definite, indefinite, or no article'
    };

    return recommendations[pattern] || 'Practice more exercises focusing on this pattern';
  }

  /**
   * Analyze time-of-day productivity
   */
  analyzeTimeOfDayProductivity(records: ExerciseHistoryRecord[]): TimeOfDayData {
    const periodStats = {
      morning: { totalScore: 0, count: 0 },
      afternoon: { totalScore: 0, count: 0 },
      evening: { totalScore: 0, count: 0 },
      night: { totalScore: 0, count: 0 }
    };

    // Categorize exercises by time of day
    records.forEach(record => {
      const hour = new Date(record.completedAt).getHours();
      let period: 'morning' | 'afternoon' | 'evening' | 'night';

      if (hour >= 6 && hour < 12) {
        period = 'morning';
      } else if (hour >= 12 && hour < 18) {
        period = 'afternoon';
      } else if (hour >= 18 && hour < 24) {
        period = 'evening';
      } else {
        period = 'night';
      }

      periodStats[period].totalScore += record.finalScore;
      periodStats[period].count += 1;
    });

    // Calculate averages and find most productive
    let maxAccuracy = 0;
    let mostProductivePeriod: 'morning' | 'afternoon' | 'evening' | 'night' = 'morning';

    const periods = [
      {
        name: 'morning' as const,
        displayName: 'Morning',
        timeRange: '6:00 AM - 12:00 PM',
        exerciseCount: periodStats.morning.count,
        averageAccuracy: periodStats.morning.count > 0 
          ? Math.round(periodStats.morning.totalScore / periodStats.morning.count)
          : 0,
        isMostProductive: false
      },
      {
        name: 'afternoon' as const,
        displayName: 'Afternoon',
        timeRange: '12:00 PM - 6:00 PM',
        exerciseCount: periodStats.afternoon.count,
        averageAccuracy: periodStats.afternoon.count > 0
          ? Math.round(periodStats.afternoon.totalScore / periodStats.afternoon.count)
          : 0,
        isMostProductive: false
      },
      {
        name: 'evening' as const,
        displayName: 'Evening',
        timeRange: '6:00 PM - 12:00 AM',
        exerciseCount: periodStats.evening.count,
        averageAccuracy: periodStats.evening.count > 0
          ? Math.round(periodStats.evening.totalScore / periodStats.evening.count)
          : 0,
        isMostProductive: false
      },
      {
        name: 'night' as const,
        displayName: 'Night',
        timeRange: '12:00 AM - 6:00 AM',
        exerciseCount: periodStats.night.count,
        averageAccuracy: periodStats.night.count > 0
          ? Math.round(periodStats.night.totalScore / periodStats.night.count)
          : 0,
        isMostProductive: false
      }
    ];

    // Identify most productive period (requires >= 20 exercises)
    if (records.length >= 20) {
      periods.forEach(period => {
        if (period.averageAccuracy > maxAccuracy && period.exerciseCount > 0) {
          maxAccuracy = period.averageAccuracy;
          mostProductivePeriod = period.name;
        }
      });

      const mostProductiveIndex = periods.findIndex(p => p.name === mostProductivePeriod);
      if (mostProductiveIndex !== -1) {
        periods[mostProductiveIndex].isMostProductive = true;
      }
    }

    return { periods };
  }

  /**
   * Calculate learning velocity
   */
  calculateLearningVelocity(records: ExerciseHistoryRecord[]): LearningVelocityData {
    if (records.length === 0) {
      return {
        averageExercisesPerWeek: 0,
        currentWeekCount: 0,
        percentageDifference: 0,
        weeklyBreakdown: []
      };
    }

    // Group exercises by week
    const weeklyMap = new Map<string, number>();
    const now = new Date();
    const currentWeekStart = this.getWeekStart(now);

    records.forEach(record => {
      const weekStart = this.getWeekStart(new Date(record.completedAt));
      const weekKey = weekStart.toISOString().split('T')[0];
      weeklyMap.set(weekKey, (weeklyMap.get(weekKey) || 0) + 1);
    });

    // Calculate average exercises per week
    const totalWeeks = weeklyMap.size;
    const totalExercises = records.length;
    const averageExercisesPerWeek = totalWeeks > 0 
      ? Math.round((totalExercises / totalWeeks) * 10) / 10
      : 0;

    // Get current week count
    const currentWeekKey = currentWeekStart.toISOString().split('T')[0];
    const currentWeekCount = weeklyMap.get(currentWeekKey) || 0;

    // Calculate percentage difference
    const percentageDifference = averageExercisesPerWeek > 0
      ? Math.round(((currentWeekCount - averageExercisesPerWeek) / averageExercisesPerWeek) * 100)
      : 0;

    // Get last 4 weeks breakdown
    const weeklyBreakdown: { weekLabel: string; exerciseCount: number }[] = [];
    for (let i = 3; i >= 0; i--) {
      const weekDate = new Date(now);
      weekDate.setDate(weekDate.getDate() - (i * 7));
      const weekStart = this.getWeekStart(weekDate);
      const weekKey = weekStart.toISOString().split('T')[0];
      const count = weeklyMap.get(weekKey) || 0;

      weeklyBreakdown.push({
        weekLabel: `Week of ${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
        exerciseCount: count
      });
    }

    return {
      averageExercisesPerWeek,
      currentWeekCount,
      percentageDifference,
      weeklyBreakdown
    };
  }

  /**
   * Get the start of the week (Monday) for a given date
   */
  private getWeekStart(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
    return new Date(d.setDate(diff));
  }

  /**
   * Get local date string in YYYY-MM-DD format (not UTC)
   */
  private getLocalDateString(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Analyze hints usage
   */
  analyzeHintsUsage(records: ExerciseHistoryRecord[]): HintsAnalysisData {
    if (records.length === 0) {
      return {
        totalHintsUsed: 0,
        averageHintsPerExercise: 0,
        trend: 'stable',
        recentAverage: 0,
        overallAverage: 0,
        percentageChange: 0
      };
    }

    // Calculate total hints used
    const totalHintsUsed = records.reduce((sum, r) => sum + r.hintsUsed, 0);

    // Calculate overall average
    const overallAverage = Math.round((totalHintsUsed / records.length) * 10) / 10;

    // Calculate recent average (last 10 exercises)
    const recentRecords = records.slice(0, Math.min(10, records.length));
    const recentHints = recentRecords.reduce((sum, r) => sum + r.hintsUsed, 0);
    const recentAverage = recentRecords.length > 0
      ? Math.round((recentHints / recentRecords.length) * 10) / 10
      : 0;

    // Calculate percentage change
    const percentageChange = overallAverage > 0
      ? Math.round(((recentAverage - overallAverage) / overallAverage) * 100)
      : 0;

    // Determine trend
    let trend: 'increasing' | 'stable' | 'decreasing';
    if (percentageChange > 10) {
      trend = 'increasing';
    } else if (percentageChange < -10) {
      trend = 'decreasing';
    } else {
      trend = 'stable';
    }

    return {
      totalHintsUsed,
      averageHintsPerExercise: overallAverage,
      trend,
      recentAverage,
      overallAverage,
      percentageChange
    };
  }

  /**
   * Get best performances
   */
  getBestPerformances(records: ExerciseHistoryRecord[], limit: number): BestPerformanceData[] {
    if (records.length === 0) {
      return [];
    }

    // Sort by final score descending
    const sorted = [...records].sort((a, b) => b.finalScore - a.finalScore);

    // Take top N and add rank
    return sorted.slice(0, limit).map((record, index) => ({
      exerciseId: record.exerciseId,
      score: record.finalScore,
      completedAt: new Date(record.completedAt),
      timeSpentSeconds: record.timeSpentSeconds,
      rank: index + 1
    }));
  }

  /**
   * Get most practiced exercises
   */
  getMostPracticed(records: ExerciseHistoryRecord[], limit: number): MostPracticedData[] {
    if (records.length === 0) {
      return [];
    }

    // Group by exercise ID
    const exerciseMap = new Map<string, {
      attempts: ExerciseHistoryRecord[];
      totalScore: number;
    }>();

    records.forEach(record => {
      const existing = exerciseMap.get(record.exerciseId) || {
        attempts: [],
        totalScore: 0
      };
      existing.attempts.push(record);
      existing.totalScore += record.finalScore;
      exerciseMap.set(record.exerciseId, existing);
    });

    // Convert to MostPracticedData and sort by attempt count
    const mostPracticed = Array.from(exerciseMap.entries())
      .map(([exerciseId, data]) => {
        const attemptCount = data.attempts.length;
        const averageScore = Math.round(data.totalScore / attemptCount);
        
        // Sort attempts by date to get first and recent
        const sortedAttempts = data.attempts.sort((a, b) => 
          new Date(a.completedAt).getTime() - new Date(b.completedAt).getTime()
        );
        
        const firstAttemptScore = sortedAttempts[0].finalScore;
        const recentAttemptScore = sortedAttempts[sortedAttempts.length - 1].finalScore;
        
        const improvementPercentage = firstAttemptScore > 0
          ? Math.round(((recentAttemptScore - firstAttemptScore) / firstAttemptScore) * 100)
          : 0;

        return {
          exerciseId,
          attemptCount,
          averageScore,
          firstAttemptScore,
          recentAttemptScore,
          improvementPercentage
        };
      })
      .sort((a, b) => b.attemptCount - a.attemptCount)
      .slice(0, limit);

    return mostPracticed;
  }

  /**
   * Generate enhanced heatmap data
   */
  generateEnhancedHeatmap(records: ExerciseHistoryRecord[]): EnhancedHeatmapData {
    if (records.length === 0) {
      return {
        weeks: [],
        currentStreak: 0,
        longestStreak: 0
      };
    }

    // Group exercises by date
    const dailyMap = new Map<string, {
      exercises: { id: string; score: number; timestamp: Date }[];
      totalScore: number;
      totalTime: number;
      totalHints: number;
    }>();

    records.forEach(record => {
      const dateStr = new Date(record.completedAt).toISOString().split('T')[0];
      const existing = dailyMap.get(dateStr) || {
        exercises: [],
        totalScore: 0,
        totalTime: 0,
        totalHints: 0
      };

      existing.exercises.push({
        id: record.exerciseId,
        score: record.finalScore,
        timestamp: new Date(record.completedAt)
      });
      existing.totalScore += record.finalScore;
      existing.totalTime += record.timeSpentSeconds;
      existing.totalHints += record.hintsUsed;

      dailyMap.set(dateStr, existing);
    });

    // Generate weeks for last 12 weeks
    const weeks: EnhancedHeatmapData['weeks'] = [];
    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - 84); // 12 weeks ago

    for (let weekNum = 0; weekNum < 12; weekNum++) {
      const weekDays: EnhancedHeatmapData['weeks'][0]['days'] = [];

      for (let dayNum = 0; dayNum < 7; dayNum++) {
        const currentDate = new Date(startDate);
        currentDate.setDate(startDate.getDate() + (weekNum * 7) + dayNum);
        const dateStr = currentDate.toISOString().split('T')[0];

        const dayData = dailyMap.get(dateStr);
        const exerciseCount = dayData?.exercises.length || 0;

        // Determine intensity (0-4)
        let intensity: 0 | 1 | 2 | 3 | 4;
        if (exerciseCount === 0) intensity = 0;
        else if (exerciseCount === 1) intensity = 1;
        else if (exerciseCount <= 3) intensity = 2;
        else if (exerciseCount <= 5) intensity = 3;
        else intensity = 4;

        const averageScore = dayData
          ? Math.round(dayData.totalScore / exerciseCount)
          : 0;

        weekDays.push({
          date: dateStr,
          exerciseCount,
          intensity,
          averageScore,
          totalTimeSpentSeconds: dayData?.totalTime || 0,
          totalHintsUsed: dayData?.totalHints || 0,
          exercises: dayData?.exercises || []
        });
      }

      weeks.push({
        weekNumber: weekNum + 1,
        days: weekDays
      });
    }

    // Calculate streaks
    const { currentStreak, longestStreak } = this.calculateStreaks(dailyMap);

    return {
      weeks,
      currentStreak,
      longestStreak
    };
  }

  /**
   * Calculate current and longest streaks
   */
  private calculateStreaks(dailyMap: Map<string, any>): { currentStreak: number; longestStreak: number } {
    const sortedDates = Array.from(dailyMap.keys()).sort();
    
    console.log('[EnhancedAnalytics] calculateStreaks - sortedDates:', sortedDates);
    
    if (sortedDates.length === 0) {
      return { currentStreak: 0, longestStreak: 0 };
    }

    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 1;

    // Use local date instead of UTC
    const today = new Date();
    const todayStr = this.getLocalDateString(today);
    
    // Check if today or yesterday has activity to maintain streak
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = this.getLocalDateString(yesterday);
    
    console.log('[EnhancedAnalytics] Today:', todayStr, 'Yesterday:', yesterdayStr);
    console.log('[EnhancedAnalytics] Has today?', dailyMap.has(todayStr), 'Has yesterday?', dailyMap.has(yesterdayStr));
    
    // Calculate current streak (working backwards from most recent activity)
    if (dailyMap.has(todayStr) || dailyMap.has(yesterdayStr)) {
      let checkDate = dailyMap.has(todayStr) ? new Date(today) : new Date(yesterday);
      
      while (true) {
        const dateStr = this.getLocalDateString(checkDate);
        if (dailyMap.has(dateStr)) {
          currentStreak++;
          checkDate.setDate(checkDate.getDate() - 1);
        } else {
          break;
        }
      }
    }
    
    console.log('[EnhancedAnalytics] Current streak:', currentStreak);

    // Calculate longest streak by checking consecutive dates
    for (let i = 0; i < sortedDates.length; i++) {
      if (i === 0) {
        tempStreak = 1;
      } else {
        const prevDate = new Date(sortedDates[i - 1]);
        const currentDate = new Date(sortedDates[i]);
        
        // Calculate difference in days
        const dayDiff = Math.round((currentDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));
        
        if (dayDiff === 1) {
          // Consecutive day
          tempStreak++;
        } else {
          // Gap found, save current streak and reset
          longestStreak = Math.max(longestStreak, tempStreak);
          tempStreak = 1;
        }
      }
    }
    
    // Don't forget to check the last streak
    longestStreak = Math.max(longestStreak, tempStreak);
    
    console.log('[EnhancedAnalytics] Longest streak:', longestStreak);

    return { currentStreak, longestStreak };
  }

  /**
   * Calculate practice statistics
   */
  calculatePracticeStats(records: ExerciseHistoryRecord[]): PracticeStatsData {
    if (records.length === 0) {
      return {
        totalExercisesCompleted: 0,
        averageAccuracy: 0,
        totalTimeSpentMinutes: 0,
        averageTimePerExercise: 0,
        totalHintsUsed: 0,
        trend: null,
        recentAverage: 0,
        overallAverage: 0
      };
    }

    // Calculate basic statistics
    const totalExercisesCompleted = records.length;
    const totalScore = records.reduce((sum, r) => sum + r.finalScore, 0);
    const averageAccuracy = Math.round(totalScore / totalExercisesCompleted);
    
    const totalTimeSpentSeconds = records.reduce((sum, r) => sum + r.timeSpentSeconds, 0);
    const totalTimeSpentMinutes = Math.round(totalTimeSpentSeconds / 60);
    const averageTimePerExercise = Math.round(totalTimeSpentMinutes / totalExercisesCompleted);
    
    const totalHintsUsed = records.reduce((sum, r) => sum + r.hintsUsed, 0);

    // Calculate trend (requires >= 5 exercises)
    let trend: 'improving' | 'stable' | 'declining' | null = null;
    let recentAverage = 0;
    const overallAverage = averageAccuracy;

    if (totalExercisesCompleted >= 5) {
      // Get recent 10 exercises (or all if less than 10)
      const recentCount = Math.min(10, totalExercisesCompleted);
      const recentRecords = records.slice(0, recentCount);
      const recentScore = recentRecords.reduce((sum, r) => sum + r.finalScore, 0);
      recentAverage = Math.round(recentScore / recentCount);

      // Determine trend
      const difference = recentAverage - overallAverage;
      if (difference > 5) {
        trend = 'improving';
      } else if (difference < -5) {
        trend = 'declining';
      } else {
        trend = 'stable';
      }
    }

    return {
      totalExercisesCompleted,
      averageAccuracy,
      totalTimeSpentMinutes,
      averageTimePerExercise,
      totalHintsUsed,
      trend,
      recentAverage,
      overallAverage
    };
  }

  /**
   * Get date range based on TimeRange
   */
  private getDateRange(timeRange: TimeRange): { startDate: Date; endDate: Date } {
    const endDate = new Date();
    const startDate = new Date();

    switch (timeRange) {
      case '7d':
        startDate.setDate(endDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(endDate.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(endDate.getDate() - 90);
        break;
      case 'all':
        startDate.setFullYear(2000); // Far past date
        break;
    }

    return { startDate, endDate };
  }

  /**
   * Filter records by date range
   */
  private filterRecordsByDateRange(
    records: ExerciseHistoryRecord[],
    startDate: Date,
    endDate: Date
  ): ExerciseHistoryRecord[] {
    return records.filter(record => {
      const completedAt = new Date(record.completedAt);
      return completedAt >= startDate && completedAt <= endDate;
    });
  }

  /**
   * Get cached analytics
   */
  private getCachedAnalytics(userId: string, timeRange: TimeRange): EnhancedAnalyticsData | null {
    const key = this.getCacheKey(userId, timeRange);
    const cached = this.analyticsCache.get(key);

    if (!cached) return null;

    const age = Date.now() - cached.timestamp;
    if (age > this.CACHE_TTL) {
      this.analyticsCache.delete(key);
      return null;
    }

    return cached.data;
  }

  /**
   * Cache analytics
   */
  private cacheAnalytics(
    userId: string,
    timeRange: TimeRange,
    data: EnhancedAnalyticsData
  ): void {
    const key = this.getCacheKey(userId, timeRange);
    this.analyticsCache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  /**
   * Get cache key
   */
  private getCacheKey(userId: string, timeRange: TimeRange): string {
    return `${userId}-${timeRange}`;
  }

  /**
   * Get empty analytics structure
   */
  private getEmptyAnalytics(): EnhancedAnalyticsData {
    return {
      performanceTrends: this.calculatePerformanceTrends([]),
      weakAreas: [],
      timeOfDayAnalysis: this.analyzeTimeOfDayProductivity([]),
      learningVelocity: this.calculateLearningVelocity([]),
      hintsAnalysis: this.analyzeHintsUsage([]),
      bestPerformances: [],
      mostPracticed: [],
      activityHeatmap: this.generateEnhancedHeatmap([]),
      practiceStats: this.calculatePracticeStats([])
    };
  }
}
