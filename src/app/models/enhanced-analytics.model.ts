/**
 * Enhanced Analytics Data Models
 * Comprehensive analytics computed from exercise history data
 */

/**
 * Main enhanced analytics data structure
 */
export interface EnhancedAnalyticsData {
  performanceTrends: PerformanceTrendData;
  weakAreas: WeakAreaData[];
  timeOfDayAnalysis: TimeOfDayData;
  learningVelocity: LearningVelocityData;
  hintsAnalysis: HintsAnalysisData;
  bestPerformances: BestPerformanceData[];
  mostPracticed: MostPracticedData[];
  activityHeatmap: EnhancedHeatmapData;
  practiceStats: PracticeStatsData;
}

/**
 * Performance trend analysis over time
 */
export interface PerformanceTrendData {
  dailyAverages: {
    date: string; // YYYY-MM-DD
    averageScore: number;
    exerciseCount: number;
  }[];
  trendDirection: 'improving' | 'stable' | 'declining';
  trendSlope: number; // Linear regression slope
  overallAverage: number;
}

/**
 * Weak area identification data
 */
export interface WeakAreaData {
  pattern: string; // e.g., "Passive voice", "Past perfect tense"
  averageAccuracy: number;
  averageRetryCount: number;
  occurrenceCount: number;
  recommendation: string;
  exampleSentences: {
    original: string;
    userTranslation: string;
    accuracyScore: number;
  }[];
}

/**
 * Time-of-day productivity analysis
 */
export interface TimeOfDayData {
  periods: {
    name: 'morning' | 'afternoon' | 'evening' | 'night';
    displayName: string;
    timeRange: string; // e.g., "6:00 AM - 12:00 PM"
    exerciseCount: number;
    averageAccuracy: number;
    isMostProductive: boolean;
  }[];
}

/**
 * Learning velocity metrics
 */
export interface LearningVelocityData {
  averageExercisesPerWeek: number;
  currentWeekCount: number;
  percentageDifference: number; // Current week vs. average
  weeklyBreakdown: {
    weekLabel: string; // e.g., "Week of Jan 1"
    exerciseCount: number;
  }[];
}

/**
 * Hints usage analysis
 */
export interface HintsAnalysisData {
  totalHintsUsed: number;
  averageHintsPerExercise: number;
  trend: 'increasing' | 'stable' | 'decreasing';
  recentAverage: number; // Last 10 exercises
  overallAverage: number;
  percentageChange: number;
}

/**
 * Best performance data
 */
export interface BestPerformanceData {
  exerciseId: string;
  score: number;
  completedAt: Date;
  timeSpentSeconds: number;
  rank: number; // 1-5
}

/**
 * Most practiced exercise data
 */
export interface MostPracticedData {
  exerciseId: string;
  attemptCount: number;
  averageScore: number;
  firstAttemptScore: number;
  recentAttemptScore: number;
  improvementPercentage: number;
}

/**
 * Enhanced heatmap data with detailed metrics
 */
export interface EnhancedHeatmapData {
  weeks: {
    weekNumber: number;
    days: {
      date: string; // YYYY-MM-DD
      exerciseCount: number;
      intensity: 0 | 1 | 2 | 3 | 4;
      averageScore: number;
      totalTimeSpentSeconds: number;
      totalHintsUsed: number;
      exercises: {
        id: string;
        score: number;
        timestamp: Date;
      }[];
    }[];
  }[];
  currentStreak: number;
  longestStreak: number;
}

/**
 * Practice statistics with trend analysis
 */
export interface PracticeStatsData {
  totalExercisesCompleted: number;
  averageAccuracy: number;
  totalTimeSpentMinutes: number;
  averageTimePerExercise: number;
  totalHintsUsed: number;
  trend: 'improving' | 'stable' | 'declining' | null;
  recentAverage: number; // Last 10 exercises
  overallAverage: number;
}
