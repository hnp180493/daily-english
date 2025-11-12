import { Exercise, ExerciseAttempt, FeedbackItem, SentenceAttempt } from './exercise.model';

// Enums
export enum UrgencyLevel {
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low'
}

export enum ReviewStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in-progress',
  COMPLETED = 'completed',
  SKIPPED = 'skipped'
}

// Core Review Data Model
// Note: exerciseId, userId, createdAt, updatedAt are stored as table columns, not in JSON
export interface ReviewData {
  // Spaced Repetition Data
  easinessFactor: number; // SM-2 EF (default: 2.5)
  interval: number; // days until next review
  nextReviewDate: Date;
  repetitionCount: number;

  // Performance Tracking
  lastReviewDate: Date;
  lastScore: number;

  // Quick Review Data
  incorrectSentenceIndices: number[];
}

// Extended Review Data (includes table columns for internal use)
export interface ReviewDataWithMetadata extends ReviewData {
  exerciseId: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}

// Review Queue Item
export interface ReviewQueueItem {
  exerciseId: string;
  exercise: Exercise;
  urgency: UrgencyLevel;
  nextReviewDate: Date;
  lastScore: number;
  estimatedTime: number; // minutes
  incorrectQuestionCount: number;
  reviewData: ReviewData;
}

// Review Statistics
export interface ReviewStats {
  reviewsThisWeek: number;
  weakPointsImproved: number;
  currentStreak: number;
  totalReviewsCompleted: number;
}

// Error Pattern Analysis
export interface ErrorPattern {
  id: string;
  type: 'grammar' | 'vocabulary' | 'structure' | 'spelling';
  description: string;
  frequency: number;
  affectedExercises: string[];
  examples: FeedbackItem[];
  grammarRule?: string;
  vocabularyWords?: string[];
}

export interface WeakPoint {
  id: string;
  category: string;
  description: string;
  errorCount: number;
  lastOccurrence: Date;
  improvementRate: number; // percentage
  relatedPatterns: string[];
}

// Grammar Lesson
export interface GrammarLesson {
  id: string;
  title: string;
  description: string;
  rule: string;
  examples: string[];
  relatedErrorPattern: string;
}

// Vocabulary Drill
export interface VocabularyDrill {
  id: string;
  words: string[];
  exercises: Exercise[];
  targetWeakPoint: string;
}

// Spaced Repetition Algorithm Types
export interface ReviewSchedule {
  nextReviewDate: Date;
  interval: number; // in days
  easinessFactor: number;
}
