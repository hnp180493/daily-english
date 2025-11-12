import { ExerciseCategory, DifficultyLevel, UserProgress } from './exercise.model';

/**
 * Main analytics data structure containing all computed statistics
 */
export interface AnalyticsData {
  // Score Trends
  scoreTrends: {
    dates: string[];
    scores: number[];
    averageScore: number;
  };

  // Category Stats
  categoryDistribution: {
    category: ExerciseCategory;
    categoryName: string;
    count: number;
    percentage: number;
  }[];

  // Difficulty Breakdown
  difficultyBreakdown: {
    level: DifficultyLevel;
    levelName: string;
    count: number;
    percentage: number;
  }[];

  // Performance Analysis
  topErrors: {
    type: string;
    description: string;
    count: number;
    percentage: number;
  }[];

  exercisesNeedingReview: {
    exerciseId: string;
    score: number;
    attemptCount: number;
    lastAttempt: Date;
  }[];

  categoryAccuracy: {
    category: ExerciseCategory;
    categoryName: string;
    exerciseCount: number;
    avgScore: number;
    totalAttempts: number;
  }[];

  difficultyComparison: {
    level: DifficultyLevel;
    levelName: string;
    avgScore: number;
    exerciseCount: number;
    completionRate: number;
    readyToAdvance: boolean;
    isCurrentLevel: boolean;
    advancementProgress: number;
  }[];

  // Activity Heatmap
  heatmapData: {
    weekNumber: number;
    days: {
      date: string;
      count: number;
      intensity: 0 | 1 | 2 | 3 | 4;
      exercises: string[]; // Exercise IDs
    }[];
  }[];
  currentStreak: number;
  longestStreak: number;

  // Vocabulary Stats
  vocabularyStats: {
    totalWords: number;
    wordsToReview: number;
    wordCloud: {
      text: string;
      frequency: number;
      size: number; // Font size in px
    }[];
    reviewWords: {
      text: string;
      errorCount: number;
      lastSeen: Date;
    }[];
  };

  // Export Data
  exportTimestamp: Date;
  totalExercises: number;
}

/**
 * Data structure for exporting user progress and analytics
 */
export interface ExportData {
  metadata: {
    exportDate: string;
    appVersion: string;
    totalExercises: number;
    dateRange: {
      from: string;
      to: string;
    };
  };
  analytics: AnalyticsData;
  rawProgress: UserProgress;
}

/**
 * Time range options for filtering analytics data
 */
export type TimeRange = '7d' | '30d' | '90d' | 'all';

/**
 * Heatmap day data structure
 */
export interface HeatmapDay {
  date: string; // YYYY-MM-DD
  count: number; // Exercise count
  intensity: 0 | 1 | 2 | 3 | 4; // Color intensity level
  exercises: string[]; // Exercise IDs
}

/**
 * Heatmap week data structure
 */
export interface HeatmapWeek {
  weekNumber: number;
  days: HeatmapDay[];
}

/**
 * Category name mapping for display purposes
 */
export const CATEGORY_NAMES: Record<ExerciseCategory, string> = {
  [ExerciseCategory.DAILY_LIFE]: 'Daily Life',
  [ExerciseCategory.TRAVEL_TRANSPORTATION]: 'Travel & Transportation',
  [ExerciseCategory.EDUCATION_WORK]: 'Education & Work',
  [ExerciseCategory.HEALTH_WELLNESS]: 'Health & Wellness',
  [ExerciseCategory.SOCIETY_SERVICES]: 'Society & Services',
  [ExerciseCategory.CULTURE_ARTS]: 'Culture & Arts',
  [ExerciseCategory.SCIENCE_ENVIRONMENT]: 'Science & Environment',
  [ExerciseCategory.PHILOSOPHY_BELIEFS]: 'Philosophy & Beliefs'
};

/**
 * Difficulty level name mapping for display purposes
 */
export const DIFFICULTY_NAMES: Record<DifficultyLevel, string> = {
  [DifficultyLevel.BEGINNER]: 'Beginner',
  [DifficultyLevel.INTERMEDIATE]: 'Intermediate',
  [DifficultyLevel.ADVANCED]: 'Advanced'
};

/**
 * Error type descriptions for common grammar errors
 */
export const ERROR_DESCRIPTIONS: Record<string, string> = {
  grammar: 'Grammar and syntax issues',
  vocabulary: 'Word choice and usage',
  structure: 'Sentence structure and organization',
  spelling: 'Spelling and typos',
  suggestion: 'General improvements'
};
