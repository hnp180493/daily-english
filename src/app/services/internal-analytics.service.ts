import { Injectable, inject } from '@angular/core';
import {
  AnalyticsData,
  TimeRange,
  HeatmapWeek,
  ExportData,
  CATEGORY_NAMES,
  DIFFICULTY_NAMES,
  ERROR_DESCRIPTIONS
} from '../models/analytics.model';
import {
  UserProgress,
  UserProgressHelper,
  ExerciseCategory,
  DifficultyLevel,
  ExerciseAttempt,
  FeedbackItem
} from '../models/exercise.model';
import { ExerciseService } from './exercise.service';
import { firstValueFrom } from 'rxjs';

interface CacheEntry {
  data: AnalyticsData;
  timestamp: number;
}

interface EnrichedAttempt extends ExerciseAttempt {
  enrichedCategory?: ExerciseCategory;
  enrichedLevel?: DifficultyLevel;
}

@Injectable({
  providedIn: 'root'
})
export class InternalAnalyticsService {
  private exerciseService = inject(ExerciseService);
  private cache = new Map<string, CacheEntry>();
  private readonly CACHE_TIMEOUT = 5 * 60 * 1000; // 5 minutes
  private exerciseMetadataCache = new Map<string, { category: ExerciseCategory; level: DifficultyLevel }>();

  /**
   * Main method to compute all analytics data
   */
  async computeAnalyticsAsync(progress: UserProgress | undefined, timeRange: TimeRange = '30d'): Promise<AnalyticsData> {
    if (!this.validateProgressData(progress)) {
      return this.getEmptyAnalytics();
    }

    const cacheKey = this.generateCacheKey(progress!, timeRange);
    const cached = this.cache.get(cacheKey);

    if (cached && !this.isCacheExpired(cached.timestamp)) {
      return cached.data;
    }

    // Enrich attempts with exercise metadata
    await this.enrichAttemptsWithMetadata(progress!);

    const analytics = this.performComputation(progress!, timeRange);
    this.cache.set(cacheKey, {
      data: analytics,
      timestamp: Date.now()
    });

    return analytics;
  }

  /**
   * Synchronous version for backward compatibility
   */
  computeAnalytics(progress: UserProgress | undefined, timeRange: TimeRange = '30d'): AnalyticsData {
    if (!this.validateProgressData(progress)) {
      return this.getEmptyAnalytics();
    }

    const cacheKey = this.generateCacheKey(progress!, timeRange);
    const cached = this.cache.get(cacheKey);

    if (cached && !this.isCacheExpired(cached.timestamp)) {
      return cached.data;
    }

    const analytics = this.performComputation(progress!, timeRange);
    this.cache.set(cacheKey, {
      data: analytics,
      timestamp: Date.now()
    });

    return analytics;
  }

  /**
   * Enrich attempts with exercise metadata from ExerciseService
   */
  private async enrichAttemptsWithMetadata(progress: UserProgress): Promise<void> {
    const allAttempts = UserProgressHelper.getAllAttempts(progress);
    const exerciseIds = [...new Set(allAttempts.map(a => a.exerciseId))];
    
    // Load exercises that aren't in cache
    const uncachedIds = exerciseIds.filter(id => !this.exerciseMetadataCache.has(id));
    
    if (uncachedIds.length > 0) {
      try {
        const exercises = await firstValueFrom(this.exerciseService.getExercisesByIds(uncachedIds));
        exercises.forEach(ex => {
          this.exerciseMetadataCache.set(ex.id, {
            category: ex.category,
            level: ex.level
          });
        });
      } catch (error) {
        console.error('Failed to load exercise metadata:', error);
      }
    }

    // Enrich attempts with cached metadata
    allAttempts.forEach((attempt: EnrichedAttempt) => {
      const metadata = this.exerciseMetadataCache.get(attempt.exerciseId);
      if (metadata) {
        attempt.enrichedCategory = metadata.category;
        attempt.enrichedLevel = metadata.level;
      }
    });
  }

  /**
   * Generate cache key based on progress data and time range
   */
  private generateCacheKey(progress: UserProgress, timeRange: TimeRange): string {
    const attemptsCount = UserProgressHelper.getAttemptsCount(progress);
    return `${attemptsCount}-${progress.lastActivityDate}-${timeRange}`;
  }

  /**
   * Check if cache entry has expired
   */
  private isCacheExpired(timestamp: number): boolean {
    return Date.now() - timestamp > this.CACHE_TIMEOUT;
  }

  /**
   * Validate progress data
   */
  private validateProgressData(progress: UserProgress | undefined): boolean {
    if (!progress || !progress.exerciseHistory) {
      return false;
    }
    return UserProgressHelper.getAttemptsCount(progress) > 0;
  }

  /**
   * Get empty analytics structure
   */
  private getEmptyAnalytics(): AnalyticsData {
    return {
      scoreTrends: {
        dates: [],
        scores: [],
        averageScore: 0
      },
      categoryDistribution: [],
      difficultyBreakdown: [],
      topErrors: [],
      exercisesNeedingReview: [],
      categoryAccuracy: [],
      difficultyComparison: [],
      heatmapData: [],
      currentStreak: 0,
      longestStreak: 0,
      vocabularyStats: {
        totalWords: 0,
        wordsToReview: 0,
        wordCloud: [],
        reviewWords: []
      },
      exportTimestamp: new Date(),
      totalExercises: 0
    };
  }

  /**
   * Perform all analytics computations
   */
  private performComputation(progress: UserProgress, timeRange: TimeRange): AnalyticsData {
    return {
      scoreTrends: this.computeScoreTrends(progress, timeRange),
      categoryDistribution: this.aggregateCategoryStats(progress),
      difficultyBreakdown: this.analyzeDifficultyDistribution(progress),
      topErrors: this.extractTopErrors(progress),
      exercisesNeedingReview: this.getExercisesNeedingReview(progress),
      categoryAccuracy: this.calculateCategoryAccuracy(progress),
      difficultyComparison: this.computeDifficultyComparison(progress),
      ...this.generateActivityHeatmap(progress),
      vocabularyStats: this.extractVocabularyStats(progress),
      exportTimestamp: new Date(),
      totalExercises: UserProgressHelper.getAttemptsCount(progress)
    };
  }

  /**
   * Compute score trends over time with filtering by time range
   */
  computeScoreTrends(
    progress: UserProgress,
    timeRange: TimeRange
  ): { dates: string[]; scores: number[]; averageScore: number } {
    const cutoffDate = this.getCutoffDate(timeRange);
    const allAttempts = UserProgressHelper.getAllAttempts(progress);
    const filteredAttempts = allAttempts.filter(
      (attempt) => new Date(attempt.timestamp) >= cutoffDate
    );

    if (filteredAttempts.length === 0) {
      return { dates: [], scores: [], averageScore: 0 };
    }

    // Sort by date
    const sortedAttempts = [...filteredAttempts].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    const dates = sortedAttempts.map((attempt) =>
      new Date(attempt.timestamp).toISOString().split('T')[0]
    );
    const scores = sortedAttempts.map((attempt) => attempt.accuracyScore);
    const averageScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;

    return {
      dates,
      scores,
      averageScore: Math.round(averageScore * 100) / 100
    };
  }

  /**
   * Get cutoff date based on time range
   */
  private getCutoffDate(timeRange: TimeRange): Date {
    const now = new Date();
    switch (timeRange) {
      case '7d':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case '30d':
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      case '90d':
        return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      case 'all':
        return new Date(0); // Beginning of time
    }
  }

  /**
   * Aggregate category statistics
   */
  aggregateCategoryStats(progress: UserProgress): {
    category: ExerciseCategory;
    categoryName: string;
    count: number;
    percentage: number;
  }[] {
    const categoryMap = new Map<ExerciseCategory, number>();

    // Count exercises by category (using exerciseId to avoid counting duplicates)
    const uniqueExercises = new Map<string, ExerciseCategory>();
    const allAttempts = UserProgressHelper.getAllAttempts(progress) as EnrichedAttempt[];
    
    allAttempts.forEach((attempt) => {
      let category: ExerciseCategory | undefined;
      
      // Try enriched category first (from metadata cache)
      if (attempt.enrichedCategory) {
        category = attempt.enrichedCategory;
      }
      // Then try category from attempt data
      else if (attempt.category) {
        category = attempt.category as ExerciseCategory;
      }
      
      if (category) {
        uniqueExercises.set(attempt.exerciseId, category);
      }
    });

    uniqueExercises.forEach((category) => {
      categoryMap.set(category, (categoryMap.get(category) || 0) + 1);
    });

    const total = uniqueExercises.size;
    if (total === 0) {
      return [];
    }

    const stats = Array.from(categoryMap.entries()).map(([category, count]) => ({
      category,
      categoryName: CATEGORY_NAMES[category] || category,
      count,
      percentage: Math.round((count / total) * 100 * 100) / 100
    }));

    // Sort by count descending
    return stats.sort((a, b) => b.count - a.count);
  }

  /**
   * Get category from exercise ID slug
   */
  private getCategoryFromSlug(slug: string): ExerciseCategory | null {
    const categoryMap: { [key: string]: ExerciseCategory } = {
      'daily-life': ExerciseCategory.DAILY_LIFE,
      'travel-transportation': ExerciseCategory.TRAVEL_TRANSPORTATION,
      'education-work': ExerciseCategory.EDUCATION_WORK,
      'health-wellness': ExerciseCategory.HEALTH_WELLNESS,
      'society-services': ExerciseCategory.SOCIETY_SERVICES,
      'culture-arts': ExerciseCategory.CULTURE_ARTS,
      'science-environment': ExerciseCategory.SCIENCE_ENVIRONMENT,
      'philosophy-beliefs': ExerciseCategory.PHILOSOPHY_BELIEFS
    };
    return categoryMap[slug] || null;
  }

  /**
   * Get difficulty level from exercise ID code
   */
  private getLevelFromCode(code: string): DifficultyLevel | null {
    const levelMap: { [key: string]: DifficultyLevel } = {
      'b': DifficultyLevel.BEGINNER,
      'i': DifficultyLevel.INTERMEDIATE,
      'a': DifficultyLevel.ADVANCED
    };
    return levelMap[code] || null;
  }

  /**
   * Analyze difficulty distribution
   */
  analyzeDifficultyDistribution(progress: UserProgress): {
    level: DifficultyLevel;
    levelName: string;
    count: number;
    percentage: number;
  }[] {
    const difficultyMap = new Map<DifficultyLevel, number>();

    // Count unique exercises by difficulty
    const uniqueExercises = new Map<string, DifficultyLevel>();
    const allAttempts = UserProgressHelper.getAllAttempts(progress) as EnrichedAttempt[];
    
    allAttempts.forEach((attempt) => {
      let level: DifficultyLevel | undefined;
      
      // Try enriched level first (from metadata cache)
      if (attempt.enrichedLevel) {
        level = attempt.enrichedLevel;
      }
      // Then try level from attempt data
      else if (attempt.level) {
        level = attempt.level as DifficultyLevel;
      }
      
      if (level) {
        uniqueExercises.set(attempt.exerciseId, level);
      }
    });

    uniqueExercises.forEach((level) => {
      difficultyMap.set(level, (difficultyMap.get(level) || 0) + 1);
    });

    const total = uniqueExercises.size;
    if (total === 0) {
      return [];
    }

    const stats = Array.from(difficultyMap.entries()).map(([level, count]) => ({
      level,
      levelName: DIFFICULTY_NAMES[level] || level,
      count,
      percentage: Math.round((count / total) * 100 * 100) / 100
    }));

    // Sort by difficulty level order
    const levelOrder = [DifficultyLevel.BEGINNER, DifficultyLevel.INTERMEDIATE, DifficultyLevel.ADVANCED];
    return stats.sort((a, b) => levelOrder.indexOf(a.level) - levelOrder.indexOf(b.level));
  }

  /**
   * Get exercises that need review (score < 75%)
   */
  getExercisesNeedingReview(progress: UserProgress): {
    exerciseId: string;
    score: number;
    attemptCount: number;
    lastAttempt: Date;
  }[] {
    const allAttempts = UserProgressHelper.getAllAttempts(progress);
    
    // Filter exercises with score < 80% and sort by score ascending
    const needsReview = allAttempts
      .filter(attempt => attempt.accuracyScore < 80)
      .map(attempt => ({
        exerciseId: attempt.exerciseId,
        score: Math.round(attempt.accuracyScore),
        attemptCount: attempt.attemptNumber,
        lastAttempt: new Date(attempt.timestamp)
      }))
      .sort((a, b) => a.score - b.score)
      .slice(0, 5); // Top 5 lowest scores

    return needsReview;
  }

  /**
   * Extract top errors from feedback
   */
  extractTopErrors(progress: UserProgress): {
    type: string;
    description: string;
    count: number;
    percentage: number;
  }[] {
    const errorMap = new Map<string, number>();
    let totalErrors = 0;
    const allAttempts = UserProgressHelper.getAllAttempts(progress);

    allAttempts.forEach((attempt) => {
      if (attempt.feedback && Array.isArray(attempt.feedback)) {
        attempt.feedback.forEach((item: FeedbackItem) => {
          errorMap.set(item.type, (errorMap.get(item.type) || 0) + 1);
          totalErrors++;
        });
      }
    });

    if (totalErrors === 0) {
      return [];
    }

    const errors = Array.from(errorMap.entries())
      .map(([type, count]) => ({
        type,
        description: ERROR_DESCRIPTIONS[type] || type,
        count,
        percentage: Math.round((count / totalErrors) * 100 * 100) / 100
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5); // Top 5 errors

    return errors;
  }

  /**
   * Calculate category accuracy
   */
  calculateCategoryAccuracy(progress: UserProgress): {
    category: ExerciseCategory;
    categoryName: string;
    exerciseCount: number;
    avgScore: number;
    totalAttempts: number;
  }[] {
    const categoryData = new Map<
      ExerciseCategory,
      { scores: number[]; exerciseIds: Set<string> }
    >();
    const allAttempts = UserProgressHelper.getAllAttempts(progress) as EnrichedAttempt[];

    allAttempts.forEach((attempt) => {
      let category: ExerciseCategory | undefined;
      
      // Try enriched category first
      if (attempt.enrichedCategory) {
        category = attempt.enrichedCategory;
      }
      // Then try category from attempt data
      else if (attempt.category) {
        category = attempt.category as ExerciseCategory;
      }
      
      if (category) {
        if (!categoryData.has(category)) {
          categoryData.set(category, { scores: [], exerciseIds: new Set() });
        }
        
        const data = categoryData.get(category)!;
        data.scores.push(attempt.accuracyScore);
        data.exerciseIds.add(attempt.exerciseId);
      }
    });

    const accuracy = Array.from(categoryData.entries()).map(([category, data]) => {
      const avgScore = data.scores.reduce((sum, score) => sum + score, 0) / data.scores.length;
      return {
        category,
        categoryName: CATEGORY_NAMES[category] || category,
        exerciseCount: data.exerciseIds.size,
        avgScore: Math.round(avgScore * 100) / 100,
        totalAttempts: data.scores.length
      };
    });

    // Sort by avgScore descending
    return accuracy.sort((a, b) => b.avgScore - a.avgScore);
  }

  /**
   * Compute difficulty comparison with advancement logic
   */
  computeDifficultyComparison(progress: UserProgress): {
    level: DifficultyLevel;
    levelName: string;
    avgScore: number;
    exerciseCount: number;
    completionRate: number;
    readyToAdvance: boolean;
    isCurrentLevel: boolean;
    advancementProgress: number;
  }[] {
    const difficultyData = new Map<
      DifficultyLevel,
      { scores: number[]; exerciseIds: Set<string> }
    >();
    const allAttempts = UserProgressHelper.getAllAttempts(progress) as EnrichedAttempt[];

    allAttempts.forEach((attempt) => {
      let level: DifficultyLevel | undefined;
      
      // Try enriched level first
      if (attempt.enrichedLevel) {
        level = attempt.enrichedLevel;
      }
      // Then try level from attempt data
      else if (attempt.level) {
        level = attempt.level as DifficultyLevel;
      }
      
      if (level) {
        if (!difficultyData.has(level)) {
          difficultyData.set(level, { scores: [], exerciseIds: new Set() });
        }
        
        const data = difficultyData.get(level)!;
        data.scores.push(attempt.accuracyScore);
        data.exerciseIds.add(attempt.exerciseId);
      }
    });

    // Determine current level (most recent activity)
    const recentAttempts = [...allAttempts]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 10);
    
    const recentLevels = recentAttempts
      .map((attempt) => (attempt.enrichedLevel || attempt.level) as DifficultyLevel)
      .filter(Boolean);
    
    const currentLevel = recentLevels[0] || DifficultyLevel.BEGINNER;

    const comparison = Array.from(difficultyData.entries()).map(([level, data]) => {
      const avgScore = data.scores.reduce((sum, score) => sum + score, 0) / data.scores.length;
      const exerciseCount = data.exerciseIds.size;
      const completionRate = Math.round((data.scores.filter(s => s >= 70).length / data.scores.length) * 100);
      
      // Ready to advance: avg score >= 85% and at least 10 exercises
      const readyToAdvance = avgScore >= 85 && exerciseCount >= 10;
      
      // Calculate advancement progress (0-100%)
      const scoreProgress = Math.min((avgScore / 85) * 50, 50);
      const countProgress = Math.min((exerciseCount / 10) * 50, 50);
      const advancementProgress = Math.round(scoreProgress + countProgress);

      return {
        level,
        levelName: DIFFICULTY_NAMES[level] || level,
        avgScore: Math.round(avgScore * 100) / 100,
        exerciseCount,
        completionRate,
        readyToAdvance,
        isCurrentLevel: level === currentLevel,
        advancementProgress
      };
    });

    // Sort by difficulty level order
    const levelOrder = [DifficultyLevel.BEGINNER, DifficultyLevel.INTERMEDIATE, DifficultyLevel.ADVANCED];
    return comparison.sort((a, b) => levelOrder.indexOf(a.level) - levelOrder.indexOf(b.level));
  }

  /**
   * Generate activity heatmap with streak calculation
   */
  generateActivityHeatmap(progress: UserProgress): {
    heatmapData: HeatmapWeek[];
    currentStreak: number;
    longestStreak: number;
  } {
    const today = new Date();
    const startDate = new Date(today.getTime() - 90 * 24 * 60 * 60 * 1000); // 90 days ago

    // Group attempts by date
    const dateMap = new Map<string, string[]>();
    const allAttempts = UserProgressHelper.getAllAttempts(progress);
    allAttempts.forEach((attempt) => {
      try {
        const timestamp = attempt.timestamp instanceof Date ? attempt.timestamp : new Date(attempt.timestamp);
        if (!isNaN(timestamp.getTime())) {
          const dateStr = timestamp.toISOString().split('T')[0];
          if (!dateMap.has(dateStr)) {
            dateMap.set(dateStr, []);
          }
          dateMap.get(dateStr)!.push(attempt.exerciseId);
        }
      } catch (error) {
        console.warn('Invalid timestamp in attempt:', attempt);
      }
    });

    // Add streak dates to dateMap if they're missing
    // This ensures heatmap shows all days in the current streak
    if (progress.currentStreak > 0 && progress.lastStreakDate) {
      const lastStreakDate = new Date(progress.lastStreakDate);
      for (let i = 0; i < progress.currentStreak; i++) {
        const streakDate = new Date(lastStreakDate.getTime() - i * 24 * 60 * 60 * 1000);
        const dateStr = streakDate.toISOString().split('T')[0];
        if (!dateMap.has(dateStr)) {
          // Add placeholder to show activity even if no attempt in exerciseHistory
          dateMap.set(dateStr, ['streak-placeholder']);
        }
      }
    }

    // Calculate max count for intensity calculation
    const maxCount = Math.max(...Array.from(dateMap.values()).map((ids) => ids.length), 1);

    // Generate 90 days of data
    const heatmapData: HeatmapWeek[] = [];
    let currentWeek: HeatmapWeek = { weekNumber: 0, days: [] };
    let weekNumber = 0;

    for (let i = 0; i < 90; i++) {
      const date = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().split('T')[0];
      const exercises = dateMap.get(dateStr) || [];
      const count = exercises.length;
      const intensity = this.calculateIntensity(count, maxCount);

      currentWeek.days.push({
        date: dateStr,
        count,
        intensity,
        exercises
      });

      // Start new week on Sunday (day 0) or after 7 days
      if (date.getDay() === 0 || currentWeek.days.length === 7) {
        currentWeek.weekNumber = weekNumber++;
        heatmapData.push(currentWeek);
        currentWeek = { weekNumber: weekNumber, days: [] };
      }
    }

    // Add remaining days
    if (currentWeek.days.length > 0) {
      currentWeek.weekNumber = weekNumber;
      heatmapData.push(currentWeek);
    }

    // Use streak from progress data (already calculated by ProgressService)
    const currentStreak = progress.currentStreak;
    
    // Calculate longest streak from date map
    const calculatedLongestStreak = this.calculateLongestStreak(dateMap);
    
    // Longest streak must be at least as long as current streak
    const longestStreak = Math.max(calculatedLongestStreak, currentStreak);

    return {
      heatmapData,
      currentStreak,
      longestStreak
    };
  }

  /**
   * Calculate intensity level (0-4) based on exercise count
   */
  private calculateIntensity(count: number, maxCount: number): 0 | 1 | 2 | 3 | 4 {
    if (count === 0) return 0;
    const percentage = (count / maxCount) * 100;
    if (percentage <= 25) return 1;
    if (percentage <= 50) return 2;
    if (percentage <= 75) return 3;
    return 4;
  }

  /**
   * Calculate longest streak from date map
   */
  private calculateLongestStreak(dateMap: Map<string, string[]>): number {
    const sortedDates = Array.from(dateMap.keys()).sort();
    if (sortedDates.length === 0) {
      return 0;
    }

    let longestStreak = 0;
    let tempStreak = 1;
    
    for (let i = 1; i < sortedDates.length; i++) {
      const prevDate = new Date(sortedDates[i - 1]);
      const currDate = new Date(sortedDates[i]);
      const dayDiff = Math.floor(
        (currDate.getTime() - prevDate.getTime()) / (24 * 60 * 60 * 1000)
      );
      
      if (dayDiff === 1) {
        tempStreak++;
      } else {
        longestStreak = Math.max(longestStreak, tempStreak);
        tempStreak = 1;
      }
    }
    longestStreak = Math.max(longestStreak, tempStreak);

    return longestStreak;
  }

  /**
   * Extract vocabulary statistics from sentence attempts
   */
  extractVocabularyStats(progress: UserProgress): {
    totalWords: number;
    wordsToReview: number;
    wordCloud: { text: string; frequency: number; size: number }[];
    reviewWords: { text: string; errorCount: number; lastSeen: Date }[];
  } {
    const vocabularyMap = new Map<string, { frequency: number; errors: number; lastSeen: Date }>();
    const allAttempts = UserProgressHelper.getAllAttempts(progress);

    allAttempts.forEach((attempt) => {
      // Extract from sentence attempts (new format from Supabase)
      if (attempt.sentenceAttempts && Array.isArray(attempt.sentenceAttempts)) {
        attempt.sentenceAttempts.forEach((sentence) => {
          // Extract words from user translation
          if (sentence.userInput) {
            const inputWords = this.extractWords(sentence.userInput);
            inputWords.forEach((word) => {
              const existing = vocabularyMap.get(word) || {
                frequency: 0,
                errors: 0,
                lastSeen: new Date(attempt.timestamp)
              };
              
              // Count as error if accuracy is low
              const hasError = sentence.accuracyScore < 80;
              
              vocabularyMap.set(word, {
                frequency: existing.frequency + 1,
                errors: existing.errors + (hasError ? 1 : 0),
                lastSeen: new Date(attempt.timestamp)
              });
            });
          }
        });
      }
      
      // Also extract from old format (feedback + userInput) for backward compatibility
      if (attempt.feedback && Array.isArray(attempt.feedback)) {
        attempt.feedback.forEach((item: FeedbackItem) => {
          if (item.type === 'vocabulary') {
            const words = this.extractWords(item.suggestion);
            words.forEach((word) => {
              const existing = vocabularyMap.get(word) || {
                frequency: 0,
                errors: 0,
                lastSeen: new Date(attempt.timestamp)
              };
              
              vocabularyMap.set(word, {
                frequency: existing.frequency + 1,
                errors: existing.errors + 1,
                lastSeen: new Date(attempt.timestamp)
              });
            });
          }
        });
      }
      
      // Extract from userInput (old format)
      if (attempt.userInput) {
        const inputWords = this.extractWords(attempt.userInput);
        inputWords.forEach((word) => {
          if (!vocabularyMap.has(word)) {
            vocabularyMap.set(word, {
              frequency: 1,
              errors: 0,
              lastSeen: new Date(attempt.timestamp)
            });
          } else {
            const existing = vocabularyMap.get(word)!;
            vocabularyMap.set(word, {
              ...existing,
              frequency: existing.frequency + 1,
              lastSeen: new Date(attempt.timestamp)
            });
          }
        });
      }
    });

    const totalWords = vocabularyMap.size;
    
    // Words to review: words with errors
    const reviewWords = Array.from(vocabularyMap.entries())
      .filter(([_, data]) => data.errors > 0)
      .map(([text, data]) => ({
        text,
        errorCount: data.errors,
        lastSeen: data.lastSeen
      }))
      .sort((a, b) => b.errorCount - a.errorCount)
      .slice(0, 20); // Top 20 words needing review

    const wordsToReview = reviewWords.length;

    // Word cloud: top 50 most frequent words
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
   * Extract words from text (simple word extraction)
   */
  private extractWords(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter((word) => word.length > 3) // Only words longer than 3 characters
      .filter((word) => !this.isCommonWord(word));
  }

  /**
   * Check if word is a common word (to filter out)
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

  /**
   * Export progress data with analytics
   */
  exportProgressData(progress: UserProgress, analytics: AnalyticsData): ExportData {
    const attempts = UserProgressHelper.getAllAttempts(progress);
    const firstAttempt = attempts.length > 0 ? attempts[0].timestamp : new Date();
    const lastAttempt = attempts.length > 0 ? attempts[attempts.length - 1].timestamp : new Date();

    return {
      metadata: {
        exportDate: new Date().toISOString(),
        appVersion: '1.0.0',
        totalExercises: attempts.length,
        dateRange: {
          from: new Date(firstAttempt).toISOString(),
          to: new Date(lastAttempt).toISOString()
        }
      },
      analytics,
      rawProgress: progress
    };
  }
}
