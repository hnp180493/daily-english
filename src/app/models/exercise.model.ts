export enum DifficultyLevel {
  BEGINNER = 'beginner',
  INTERMEDIATE = 'intermediate',
  ADVANCED = 'advanced'
}

export enum ExerciseCategory {
  DAILY_LIFE = 'daily-life',
  TRAVEL_TRANSPORTATION = 'travel-transportation',
  EDUCATION_WORK = 'education-work',
  HEALTH_WELLNESS = 'health-wellness',
  SOCIETY_SERVICES = 'society-services',
  CULTURE_ARTS = 'culture-arts',
  SCIENCE_ENVIRONMENT = 'science-environment',
  PHILOSOPHY_BELIEFS = 'philosophy-beliefs'
}

export interface Exercise {
  id: string;
  title: string;
  level: DifficultyLevel;
  category: ExerciseCategory;
  description: string;
  sourceText: string;
  highlightedSentences: string[];
  hints: string[];
  expectedKeywords?: string[];
  fullContext?: string; // Full paragraph for context when analyzing individual sentences
}

export interface SentenceAttempt {
  sentenceIndex: number;
  userInput: string;
  accuracyScore: number;
  feedback: FeedbackItem[];
  overallComment?: string;
  incorrectAttempts?: number; // Number of failed attempts for this sentence
  retryCount?: number; // Number of times this sentence was retried
}

export interface ExerciseAttempt {
  exerciseId: string;
  category?: ExerciseCategory | string; // Added for achievement tracking
  level?: DifficultyLevel | string; // Added for analytics
  attemptNumber: number;
  userInput: string;
  accuracyScore: number; // This becomes the penalty-adjusted score
  pointsEarned: number;
  feedback: FeedbackItem[];
  timestamp: Date;
  hintsUsed: number;
  sentenceAttempts?: SentenceAttempt[];
  baseScore?: number; // Average accuracy before penalties
  totalIncorrectAttempts?: number; // Sum of all incorrect attempts
  totalRetries?: number; // Sum of all retries
  totalPenalty?: number; // Total points deducted
}

export interface FeedbackItem {
  type: 'grammar' | 'vocabulary' | 'structure' | 'spelling' | 'suggestion';
  originalText: string;
  suggestion: string;
  explanation: string;
  startIndex: number;
  endIndex: number;
}

export interface UserProgress {
  // Optimized: Store only the latest attempt per exercise
  exerciseHistory: { [exerciseId: string]: ExerciseAttempt };
  totalCredits: number;
  totalPoints: number;
  lastActivityDate: Date;
  currentStreak: number;
  longestStreak: number;
  lastStreakDate: string; // ISO date string (YYYY-MM-DD)
  achievements: string[];
}

// Helper class for UserProgress operations
export class UserProgressHelper {
  // Get all attempts as array (for backward compatibility with analytics)
  static getAllAttempts(progress: UserProgress): ExerciseAttempt[] {
    return Object.values(progress.exerciseHistory);
  }

  // Get attempts count
  static getAttemptsCount(progress: UserProgress): number {
    return Object.keys(progress.exerciseHistory).length;
  }

  // Check if exercise exists
  static hasExercise(progress: UserProgress, exerciseId: string): boolean {
    return exerciseId in progress.exerciseHistory;
  }
}

export interface ExerciseStatus {
  status: 'new' | 'attempted';
  attemptCount: number;
  bestScore?: number;
  perfectCompletions?: number; // Number of times completed with 100%
}

// Custom Exercise Types
export interface CustomExercise extends Exercise {
  isCustom: true;
  createdAt: Date;
  updatedAt: Date;
  userId: string;
  customCategories?: string[];
  tags?: string[];
  generatedByAI?: boolean;
  aiPrompt?: string;
}

// AI Exercise Generation Types
export interface ExerciseGenerationRequest {
  prompt: string;
  difficulty: DifficultyLevel;
  targetLanguage?: string;
  sourceLanguage?: string;
}

export interface ExerciseGenerationResponse {
  title: string;
  sourceText: string;
  suggestedSentences: string[];
  category?: string;
}

// Validation Result Type
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

export interface ValidationError {
  field: string;
  message: string;
}
