import { Injectable, inject } from '@angular/core';
import { Observable, of, forkJoin } from 'rxjs';
import { map, catchError, retry, switchMap } from 'rxjs/operators';
import { ExerciseHistoryService } from './exercise-history.service';
import { ExerciseService } from './exercise.service';
import { ExerciseHistoryRecord } from '../models/exercise-history.model';
import { TimeRange, CATEGORY_NAMES, DIFFICULTY_NAMES } from '../models/analytics.model';
import { ExerciseCategory, DifficultyLevel } from '../models/exercise.model';
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
  PracticeStatsData,
  VocabularyStatsData
} from '../models/enhanced-analytics.model';

interface EnrichedRecord extends ExerciseHistoryRecord {
  category?: ExerciseCategory;
  level?: DifficultyLevel;
}

/**
 * Enhanced Analytics Service
 * Computes comprehensive analytics from exercise history data
 */
@Injectable({
  providedIn: 'root'
})
export class EnhancedAnalyticsService {
  private exerciseHistoryService = inject(ExerciseHistoryService);
  private exerciseService = inject(ExerciseService);

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
        
        // Enrich records with exercise metadata
        return this.enrichRecordsWithMetadata(filteredRecords).pipe(
          map(enrichedRecords => {
            // Compute all analytics
            const analytics = this.computeAllAnalytics(enrichedRecords);
            
            // Cache the result
            this.cacheAnalytics(userId, timeRange, analytics);
            
            return analytics;
          })
        );
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
        return 200; // Likely enough for 7 days
      case '30d':
        return 400; // Likely enough for 30 days
      case '90d':
        return 800; // Likely enough for 90 days
      case 'all':
        return 1500; // Maximum for all time
      default:
        return 600;
    }
  }

  /**
   * Compute all analytics from filtered records
   */
  private computeAllAnalytics(records: EnrichedRecord[]): EnhancedAnalyticsData {
    return {
      performanceTrends: this.calculatePerformanceTrends(records),
      weakAreas: this.identifyWeakAreas(records),
      timeOfDayAnalysis: this.analyzeTimeOfDayProductivity(records),
      learningVelocity: this.calculateLearningVelocity(records),
      bestPerformances: this.getBestPerformances(records, 5),
      mostPracticed: this.getMostPracticed(records, 5),
      activityHeatmap: this.generateEnhancedHeatmap(records),
      practiceStats: this.calculatePracticeStats(records),
      categoryDistribution: this.calculateCategoryDistribution(records),
      difficultyBreakdown: this.calculateDifficultyBreakdown(records),
      vocabularyStats: this.calculateVocabularyStats(records),
      categoryAccuracy: this.calculateCategoryAccuracy(records),
      difficultyComparison: this.calculateDifficultyComparison(records),
      exercisesNeedingReview: this.getExercisesNeedingReview(records),
      errorPatterns: this.analyzeErrorPatterns(records),
      recentHistory: this.getRecentHistory(records, 10)
    };
  }

  /**
   * Get recent history (first N records, already sorted by date desc)
   */
  private getRecentHistory(records: EnrichedRecord[], limit: number): any[] {
    return records.slice(0, limit).map(record => ({
      exerciseId: record.exerciseId,
      completedAt: record.completedAt,
      finalScore: record.finalScore,
      timeSpentSeconds: record.timeSpentSeconds,
      hintsUsed: record.hintsUsed
    }));
  }

  /**
   * Enrich records with exercise metadata (category and level)
   */
  private enrichRecordsWithMetadata(records: ExerciseHistoryRecord[]): Observable<EnrichedRecord[]> {
    if (records.length === 0) {
      return of([]);
    }

    // Get unique exercise IDs
    const exerciseIds = [...new Set(records.map(r => r.exerciseId))];
    
    // Load exercises
    return this.exerciseService.getExercisesByIds(exerciseIds).pipe(
      map(exercises => {
        // Create metadata map
        const metadataMap = new Map(exercises.map(ex => [ex.id, { category: ex.category, level: ex.level }]));
        
        // Enrich records
        return records.map(record => ({
          ...record,
          category: metadataMap.get(record.exerciseId)?.category,
          level: metadataMap.get(record.exerciseId)?.level
        }));
      }),
      catchError(error => {
        console.error('[EnhancedAnalytics] Failed to load exercise metadata:', error);
        return of(records as EnrichedRecord[]);
      })
    );
  }

  /**
   * Calculate category distribution from exercise history
   */
  private calculateCategoryDistribution(records: EnrichedRecord[]): any[] {
    const categoryMap = new Map<ExerciseCategory, Set<string>>();
    
    records.forEach(record => {
      if (record.category) {
        if (!categoryMap.has(record.category)) {
          categoryMap.set(record.category, new Set());
        }
        categoryMap.get(record.category)!.add(record.exerciseId);
      }
    });
    
    const total = new Set(records.filter(r => r.category).map(r => r.exerciseId)).size;
    if (total === 0) return [];
    
    return Array.from(categoryMap.entries())
      .map(([category, exerciseIds]) => ({
        category,
        categoryName: CATEGORY_NAMES[category] || category,
        count: exerciseIds.size,
        percentage: Math.round((exerciseIds.size / total) * 100 * 100) / 100
      }))
      .sort((a, b) => b.count - a.count);
  }

  /**
   * Calculate difficulty breakdown from exercise history
   */
  private calculateDifficultyBreakdown(records: EnrichedRecord[]): any[] {
    const difficultyMap = new Map<DifficultyLevel, Set<string>>();
    
    records.forEach(record => {
      if (record.level) {
        if (!difficultyMap.has(record.level)) {
          difficultyMap.set(record.level, new Set());
        }
        difficultyMap.get(record.level)!.add(record.exerciseId);
      }
    });
    
    const total = new Set(records.filter(r => r.level).map(r => r.exerciseId)).size;
    if (total === 0) return [];
    
    return Array.from(difficultyMap.entries())
      .map(([level, exerciseIds]) => ({
        level,
        levelName: DIFFICULTY_NAMES[level] || level,
        count: exerciseIds.size,
        percentage: Math.round((exerciseIds.size / total) * 100 * 100) / 100
      }))
      .sort((a, b) => {
        const order = { [DifficultyLevel.BEGINNER]: 0, [DifficultyLevel.INTERMEDIATE]: 1, [DifficultyLevel.ADVANCED]: 2 };
        return order[a.level] - order[b.level];
      });
  }

  /**
   * Get human-readable category name
   */
  private getCategoryName(category: string): string {
    const names: { [key: string]: string } = {
      'daily-life': 'Daily Life',
      'travel-transportation': 'Travel & Transportation',
      'education-work': 'Education & Work',
      'health-wellness': 'Health & Wellness',
      'society-services': 'Society & Services',
      'culture-arts': 'Culture & Arts',
      'science-environment': 'Science & Environment',
      'philosophy-beliefs': 'Philosophy & Beliefs'
    };
    return names[category] || category;
  }

  /**
   * Get human-readable difficulty name
   */
  private getDifficultyName(level: string): string {
    const names: { [key: string]: string } = {
      'beginner': 'Beginner',
      'intermediate': 'Intermediate',
      'advanced': 'Advanced'
    };
    return names[level] || level;
  }

  /**
   * Calculate category accuracy from enriched records
   */
  private calculateCategoryAccuracy(records: EnrichedRecord[]): any[] {
    const categoryData = new Map<string, { scores: number[]; exerciseIds: Set<string> }>();
    
    records.forEach(record => {
      if (record.category) {
        const category = record.category;
        if (!categoryData.has(category)) {
          categoryData.set(category, { scores: [], exerciseIds: new Set() });
        }
        const data = categoryData.get(category)!;
        data.scores.push(record.finalScore);
        data.exerciseIds.add(record.exerciseId);
      }
    });
    
    return Array.from(categoryData.entries())
      .map(([category, data]) => ({
        category,
        categoryName: this.getCategoryName(category),
        exerciseCount: data.exerciseIds.size,
        avgScore: Math.round((data.scores.reduce((sum, s) => sum + s, 0) / data.scores.length) * 100) / 100,
        totalAttempts: data.scores.length
      }))
      .sort((a, b) => b.avgScore - a.avgScore);
  }

  /**
   * Calculate difficulty comparison from enriched records
   */
  private calculateDifficultyComparison(records: EnrichedRecord[]): any[] {
    const difficultyData = new Map<string, { scores: number[]; exerciseIds: Set<string> }>();
    
    records.forEach(record => {
      if (record.level) {
        const level = record.level;
        if (!difficultyData.has(level)) {
          difficultyData.set(level, { scores: [], exerciseIds: new Set() });
        }
        const data = difficultyData.get(level)!;
        data.scores.push(record.finalScore);
        data.exerciseIds.add(record.exerciseId);
      }
    });
    
    // Determine current level from recent records
    const recentRecords = [...records]
      .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime())
      .slice(0, 10);
    const currentLevel = recentRecords.find(r => r.level)?.level || 'beginner';
    
    return Array.from(difficultyData.entries())
      .map(([level, data]) => {
        const avgScore = data.scores.reduce((sum, s) => sum + s, 0) / data.scores.length;
        const exerciseCount = data.exerciseIds.size;
        const completionRate = Math.round((data.scores.filter(s => s >= 70).length / data.scores.length) * 100);
        const readyToAdvance = avgScore >= 85 && exerciseCount >= 10;
        const scoreProgress = Math.min((avgScore / 85) * 50, 50);
        const countProgress = Math.min((exerciseCount / 10) * 50, 50);
        
        return {
          level,
          levelName: this.getDifficultyName(level),
          avgScore: Math.round(avgScore * 100) / 100,
          exerciseCount,
          completionRate,
          readyToAdvance,
          isCurrentLevel: level === currentLevel,
          advancementProgress: Math.round(scoreProgress + countProgress)
        };
      })
      .sort((a, b) => {
        const order: any = { 'beginner': 0, 'intermediate': 1, 'advanced': 2 };
        return order[a.level] - order[b.level];
      });
  }

  /**
   * Get exercises that need review (score < 75%)
   */
  private getExercisesNeedingReview(records: EnrichedRecord[]): any[] {
    // Group by exercise ID to get latest attempt
    const latestAttempts = new Map<string, EnrichedRecord>();
    
    records.forEach(record => {
      const existing = latestAttempts.get(record.exerciseId);
      if (!existing || new Date(record.completedAt) > new Date(existing.completedAt)) {
        latestAttempts.set(record.exerciseId, record);
      }
    });
    
    // Filter exercises with score < 80% and count attempts
    const needsReview = Array.from(latestAttempts.values())
      .filter(record => record.finalScore < 80)
      .map(record => {
        const attemptCount = records.filter(r => r.exerciseId === record.exerciseId).length;
        return {
          exerciseId: record.exerciseId,
          score: Math.round(record.finalScore),
          attemptCount,
          lastAttempt: new Date(record.completedAt)
        };
      })
      .sort((a, b) => a.score - b.score)
      .slice(0, 5); // Top 5 lowest scores
    
    return needsReview;
  }

  /**
   * Analyze error patterns from sentence attempts
   * Note: Currently returns empty as exercise history doesn't store detailed feedback
   * This can be enhanced when feedback data is available
   */
  private analyzeErrorPatterns(records: EnrichedRecord[]): any[] {
    // Count low-scoring attempts as potential errors
    const errorStats = {
      lowAccuracy: 0,
      highRetries: 0,
      examples: [] as string[]
    };

    records.forEach(record => {
      if (record.sentenceAttempts && Array.isArray(record.sentenceAttempts)) {
        record.sentenceAttempts.forEach(attempt => {
          // Low accuracy indicates errors
          if (attempt.accuracyScore < 70) {
            errorStats.lowAccuracy++;
            if (errorStats.examples.length < 5 && attempt.originalText) {
              errorStats.examples.push(attempt.originalText);
            }
          }
          
          // High retries indicate difficulty
          if (attempt.retryCount > 2) {
            errorStats.highRetries++;
          }
        });
      }
    });

    const patterns = [];

    // Add pattern for low accuracy sentences
    if (errorStats.lowAccuracy > 0) {
      patterns.push({
        type: 'accuracy',
        description: 'Low Accuracy Translations',
        count: errorStats.lowAccuracy,
        percentage: 100,
        examples: errorStats.examples.slice(0, 3),
        recommendation: 'Focus on understanding sentence structure and vocabulary. Review translations that scored below 70% and identify common patterns in your mistakes.'
      });
    }

    // Add pattern for high retry sentences
    if (errorStats.highRetries > 0) {
      patterns.push({
        type: 'retries',
        description: 'Sentences Requiring Multiple Attempts',
        count: errorStats.highRetries,
        percentage: Math.round((errorStats.highRetries / (errorStats.lowAccuracy + errorStats.highRetries)) * 100),
        examples: [],
        recommendation: 'These sentences required multiple attempts. Practice similar sentence structures and review grammar rules for complex sentences.'
      });
    }

    return patterns;
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

    // Convert to WeakAreaData
    const allAreas: WeakAreaData[] = Array.from(patternStats.entries())
      .filter(([_, stats]) => stats.count >= 3) // Require at least 3 occurrences
      .map(([key, stats]) => ({
        pattern: stats.pattern,
        averageAccuracy: Math.round(stats.totalAccuracy / stats.count),
        averageRetryCount: Math.round((stats.totalRetries / stats.count) * 10) / 10,
        occurrenceCount: stats.count,
        recommendation: this.getRecommendation(stats.pattern),
        exampleSentences: stats.examples
      }))
      .sort((a, b) => {
        // Sort by accuracy ascending, then by retry count descending
        if (a.averageAccuracy !== b.averageAccuracy) {
          return a.averageAccuracy - b.averageAccuracy;
        }
        return b.averageRetryCount - a.averageRetryCount;
      });

    // If no patterns below threshold, show top 3 lowest-performing patterns
    // This ensures users always see areas for improvement
    const weakAreas = allAreas.filter(area => 
      area.averageAccuracy < 85 || area.averageRetryCount > 1.5
    );

    // If user performs well on all patterns, show the 3 lowest-scoring ones
    // with accuracy < 100% as "areas to focus on"
    if (weakAreas.length === 0 && allAreas.length > 0) {
      return allAreas
        .filter(area => area.averageAccuracy < 100)
        .slice(0, 3);
    }

    return weakAreas.slice(0, 5);
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

    // Group exercises by week using local date
    const weeklyMap = new Map<string, number>();
    const now = new Date();
    const currentWeekStart = this.getWeekStartLocal(now);
    const currentWeekKey = this.getLocalDateString(currentWeekStart);

    records.forEach(record => {
      const recordDate = new Date(record.completedAt);
      const weekStart = this.getWeekStartLocal(recordDate);
      const weekKey = this.getLocalDateString(weekStart);
      weeklyMap.set(weekKey, (weeklyMap.get(weekKey) || 0) + 1);
    });

    // Calculate average exercises per week
    const totalWeeks = weeklyMap.size;
    const totalExercises = records.length;
    const averageExercisesPerWeek = totalWeeks > 0 
      ? Math.round((totalExercises / totalWeeks) * 10) / 10
      : 0;

    // Get current week count
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
      const weekStart = this.getWeekStartLocal(weekDate);
      const weekKey = this.getLocalDateString(weekStart);
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
   * Get the start of the week (Monday) for a given date in local timezone
   * Week runs from Monday to Sunday (ISO week)
   */
  private getWeekStartLocal(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    // Sunday (0) -> subtract 6 days to get to Monday
    // Monday (1) -> subtract 0 days
    // Tuesday (2) -> subtract 1 day, etc.
    const diff = day === 0 ? 6 : day - 1;
    d.setDate(d.getDate() - diff);
    // Reset time to start of day
    d.setHours(0, 0, 0, 0);
    return d;
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
   * Generate enhanced heatmap data (52 weeks like GitHub)
   */
  generateEnhancedHeatmap(records: ExerciseHistoryRecord[]): EnhancedHeatmapData {
    // Group exercises by date
    const dailyMap = new Map<string, {
      exercises: { id: string; score: number; timestamp: Date }[];
      totalScore: number;
      totalTime: number;
      totalHints: number;
    }>();

    records.forEach(record => {
      const dateStr = this.getLocalDateString(new Date(record.completedAt));
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

    // Generate 52 weeks (1 year) like GitHub
    const weeks: EnhancedHeatmapData['weeks'] = [];
    const today = new Date();
    
    // Find the start date: go back ~52 weeks and align to Sunday
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - 364); // ~52 weeks ago
    // Align to Sunday (start of week for GitHub style)
    const dayOfWeek = startDate.getDay();
    startDate.setDate(startDate.getDate() - dayOfWeek);

    // Calculate total weeks needed (from startDate to today)
    const totalDays = Math.ceil((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const totalWeeks = Math.ceil(totalDays / 7) + 1;

    for (let weekNum = 0; weekNum < totalWeeks; weekNum++) {
      const weekDays: EnhancedHeatmapData['weeks'][0]['days'] = [];

      for (let dayNum = 0; dayNum < 7; dayNum++) {
        const currentDate = new Date(startDate);
        currentDate.setDate(startDate.getDate() + (weekNum * 7) + dayNum);
        
        // Skip future dates
        if (currentDate > today) {
          continue;
        }
        
        const dateStr = this.getLocalDateString(currentDate);
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

      // Only add weeks that have days
      if (weekDays.length > 0) {
        weeks.push({
          weekNumber: weekNum + 1,
          days: weekDays
        });
      }
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
   * Invalidate all cached analytics (call after new exercise completion)
   */
  invalidateCache(): void {
    this.analyticsCache.clear();
    // Also invalidate exercise history cache
    this.exerciseHistoryService.invalidateCache();
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
      bestPerformances: [],
      mostPracticed: [],
      activityHeatmap: this.generateEnhancedHeatmap([]),
      practiceStats: this.calculatePracticeStats([]),
      categoryDistribution: [],
      difficultyBreakdown: [],
      vocabularyStats: {
        totalWords: 0,
        wordsToReview: 0,
        wordCloud: [],
        reviewWords: []
      },
      errorPatterns: []
    };
  }

  /**
   * Calculate vocabulary statistics from sentence attempts
   */
  private calculateVocabularyStats(records: ExerciseHistoryRecord[]): {
    totalWords: number;
    wordsToReview: number;
    wordCloud: { text: string; frequency: number; size: number }[];
    reviewWords: { text: string; errorCount: number; lastSeen: Date }[];
  } {
    const vocabularyMap = new Map<string, { frequency: number; errors: number; lastSeen: Date }>();

    records.forEach((record) => {
      if (record.sentenceAttempts && Array.isArray(record.sentenceAttempts)) {
        record.sentenceAttempts.forEach((sentence) => {
          if (sentence.userTranslation) {
            const words = this.extractWords(sentence.userTranslation);
            words.forEach((word) => {
              const existing = vocabularyMap.get(word) || {
                frequency: 0,
                errors: 0,
                lastSeen: record.completedAt
              };
              
              const hasError = sentence.accuracyScore < 80;
              
              vocabularyMap.set(word, {
                frequency: existing.frequency + 1,
                errors: existing.errors + (hasError ? 1 : 0),
                lastSeen: record.completedAt
              });
            });
          }
        });
      }
    });

    const totalWords = vocabularyMap.size;
    
    const reviewWords = Array.from(vocabularyMap.entries())
      .filter(([_, data]) => data.errors > 0)
      .map(([text, data]) => ({
        text,
        errorCount: data.errors,
        lastSeen: data.lastSeen
      }))
      .sort((a, b) => b.errorCount - a.errorCount)
      .slice(0, 20);

    const wordsToReview = reviewWords.length;

    const wordCloud = Array.from(vocabularyMap.entries())
      .map(([text, data]) => ({
        text,
        frequency: data.frequency,
        size: this.calculateWordSize(data.frequency, vocabularyMap)
      }))
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 50);

    return {
      totalWords,
      wordsToReview,
      wordCloud,
      reviewWords
    };
  }

  /**
   * Extract words from text
   */
  private extractWords(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter((word) => word.length > 3)
      .filter((word) => !this.isCommonWord(word));
  }

  /**
   * Check if word is common (to filter out)
   */
  private isCommonWord(word: string): boolean {
    const commonWords = new Set([
      'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'her', 'was', 'one',
      'our', 'out', 'day', 'get', 'has', 'him', 'his', 'how', 'man', 'new', 'now', 'old',
      'see', 'two', 'way', 'who', 'boy', 'did', 'its', 'let', 'put', 'say', 'she', 'too',
      'use', 'this', 'that', 'with', 'have', 'from', 'they', 'will', 'what', 'been', 'more',
      'when', 'your', 'said', 'each', 'than', 'them', 'many', 'some', 'time', 'very', 'were'
    ]);
    return commonWords.has(word);
  }

  /**
   * Calculate word size for word cloud (12-48px)
   */
  private calculateWordSize(
    frequency: number,
    vocabularyMap: Map<string, { frequency: number; errors: number; lastSeen: Date }>
  ): number {
    const maxFrequency = Math.max(...Array.from(vocabularyMap.values()).map((v) => v.frequency));
    const minSize = 12;
    const maxSize = 48;
    const ratio = frequency / maxFrequency;
    return Math.round(minSize + ratio * (maxSize - minSize));
  }
}
