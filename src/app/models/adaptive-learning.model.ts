export interface AdaptiveRecommendation {
  exerciseId: string;
  confidence: number; // 0-1 score
  reason: RecommendationReason;
  priority: 'high' | 'medium' | 'low';
}

export enum RecommendationReason {
  WEAK_CATEGORY = 'weak-category',
  SEQUENTIAL_PROGRESSION = 'sequential',
  DIFFICULTY_INCREASE = 'difficulty-increase',
  REVIEW_NEEDED = 'review',
  DAILY_CHALLENGE = 'daily-challenge',
}

export interface PerformanceAnalysis {
  userId: string;
  categoryScores: { [category: string]: number };
  weakCategories: string[];
  strongCategories: string[];
  averageScore: number;
  recentTrend: 'improving' | 'stable' | 'declining';
  translationDependency: number; // 0-100 score
}
