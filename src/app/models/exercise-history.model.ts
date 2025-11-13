/**
 * Sentence-level attempt data stored in history
 */
export interface HistorySentenceAttempt {
  sentenceIndex: number;
  originalText: string;
  userTranslation: string;
  accuracyScore: number;
  retryCount: number;
  aiFeedback?: string;
}

/**
 * Penalty metrics for the exercise attempt
 */
export interface HistoryPenaltyMetrics {
  baseScore: number;
  totalIncorrectAttempts: number;
  totalRetries: number;
  totalPenalty: number;
  finalScore: number;
}

/**
 * Complete exercise history record
 */
export interface ExerciseHistoryRecord {
  id: string;
  userId: string;
  exerciseId: string;
  completedAt: Date;
  finalScore: number;
  timeSpentSeconds: number;
  hintsUsed: number;
  sentenceAttempts: HistorySentenceAttempt[];
  penaltyMetrics: HistoryPenaltyMetrics;
  createdAt: Date;
}

/**
 * Statistics calculated from history
 */
export interface ExerciseHistoryStats {
  totalExercisesCompleted: number;
  averageAccuracy: number;
  totalTimeSpentMinutes: number;
  averageTimePerExercise: number;
  bestPerformances: Array<{
    exerciseId: string;
    exerciseTitle: string;
    score: number;
    completedAt: Date;
  }>;
  mostPracticed: Array<{
    exerciseId: string;
    exerciseTitle: string;
    attemptCount: number;
  }>;
}

/**
 * Activity timeline data point
 */
export interface ActivityTimelineData {
  date: string; // YYYY-MM-DD format
  completionCount: number;
}
