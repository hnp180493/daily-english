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

  // Extended fields (optional — populated by static JSON content in public/data/grammar-lessons/).
  // Existing code that constructs GrammarLesson with the 6 required fields keeps working.
  slug?: string;
  level?: 'beginner' | 'intermediate' | 'advanced';
  category?: string;
  estimatedMinutes?: number;
  errorPatternKeys?: string[]; // matches against ErrorPattern.id / WeakPoint.category tokens
  sections?: GrammarLessonSection[];
  vietnameseTips?: string[];
  commonMistakes?: GrammarLessonMistake[];
  practice?: GrammarPracticeItem[];

  // Lively / practical fields (2026-05-14 redesign).
  /** One-line memorable rule + one example shown as the hero of the lesson. */
  tldr?: GrammarTldr;
  /** Real-world contexts where this grammar shows up. */
  scenarios?: GrammarScenario[];
  /** Inline MCQ checks placed between sections — keep the learner active. */
  quickChecks?: GrammarQuickCheck[];
}

export interface GrammarTldr {
  /** Short memorable rule, 1 sentence, ≤ 18 words. */
  rule: string;
  /** Concrete example showing the rule. */
  example: string;
  /** Optional Vietnamese gloss of the example, displayed under it. */
  exampleVietnamese?: string;
}

export interface GrammarScenario {
  /** Emoji + short label, e.g. "☕ Ordering coffee". */
  context: string;
  /** Why this grammar matters here, ≤ 1 sentence. */
  why: string;
  /** A representative English sentence for this scenario. */
  english: string;
  /** Vietnamese gloss for the example. */
  vietnamese?: string;
}

export interface GrammarQuickCheck {
  question: string;
  options: string[];
  correctIndex: number;
  /** ≤ 18 words explanation revealed after answering. */
  explanation: string;
}

export interface GrammarLessonSection {
  heading: string;
  body: string;
  bullets?: string[];
  examples?: GrammarLessonExample[];
}

export interface GrammarLessonExample {
  english: string;
  vietnamese?: string;
  note?: string;
}

export interface GrammarLessonMistake {
  wrong: string;
  right: string;
  explanation: string;
}

export interface GrammarPracticeItem {
  vietnamese: string;
  english: string;
  hint?: string;
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
