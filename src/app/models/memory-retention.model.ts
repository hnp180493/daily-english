/**
 * Memory Retention System Models
 *
 * Interfaces for the Memory Retention System that helps users memorize
 * exercise content through Comprehension Quiz, Content Summary, and Flashcard System.
 *
 * Requirements: 1.3, 2.2, 2.3, 3.2, 7.4
 */

// ============================================================================
// Quiz Models
// ============================================================================

/**
 * Represents a single quiz question with multiple choice options.
 * Requirements: 1.3 - Question must include text, 4 options, correct index, and explanation
 */
export interface QuizQuestion {
  /** Unique identifier for the question */
  id: string;
  /** The question text */
  questionText: string;
  /** Array of exactly 4 answer options */
  options: string[];
  /** Index of the correct answer (0-3) */
  correctIndex: number;
  /** Explanation for the correct answer */
  explanation: string;
}

/**
 * Represents a user's answer to a quiz question.
 */
export interface QuizAnswer {
  /** ID of the question being answered */
  questionId: string;
  /** Index of the selected answer option */
  selectedIndex: number;
  /** Whether the answer was correct */
  isCorrect: boolean;
}

/**
 * Represents the result of a completed quiz.
 * Requirements: 1.7 - Summary showing total correct answers and performance
 */
export interface QuizResult {
  /** ID of the exercise this quiz is for */
  exerciseId: string;
  /** All questions in the quiz */
  questions: QuizQuestion[];
  /** User's answers to each question */
  answers: QuizAnswer[];
  /** Score as a percentage (0-100) */
  score: number;
  /** When the quiz was completed */
  completedAt: Date;
}

// ============================================================================
// Summary Models
// ============================================================================

/**
 * Represents a key vocabulary word extracted from an exercise.
 * Requirements: 2.3 - Must include English word, Vietnamese meaning, and example sentence
 */
export interface KeyVocabulary {
  /** The English word */
  word: string;
  /** Vietnamese meaning/translation */
  meaning: string;
  /** Example sentence from the passage where the word appears */
  exampleSentence: string;
  /** Part of speech (noun, verb, adjective, etc.) */
  partOfSpeech?: string;
}

/**
 * Represents a main idea from the exercise content.
 * Requirements: 2.6 - Must be presented in both English and Vietnamese
 */
export interface MainIdea {
  /** Main idea in English */
  english: string;
  /** Main idea in Vietnamese */
  vietnamese: string;
}

/**
 * Represents the generated content summary for an exercise.
 * Requirements: 2.2 - Must contain 5-8 key vocabulary words
 */
export interface ContentSummaryData {
  /** ID of the exercise this summary is for */
  exerciseId: string;
  /** List of 2-3 main ideas */
  mainIdeas: MainIdea[];
  /** List of 5-8 key vocabulary words */
  vocabulary: KeyVocabulary[];
  /** When the summary was generated */
  generatedAt: Date;
}

// ============================================================================
// Flashcard Models
// ============================================================================

/**
 * Represents a flashcard for vocabulary/phrase memorization.
 * Requirements: 3.2 - Must include front, back, exerciseId, timestamp, and spaced repetition fields
 * Requirements: 7.4 - Must store ease factor, interval, and next review date
 */
export interface Flashcard {
  /** Unique identifier for the flashcard */
  id: string;
  /** Front of the card (English word/phrase) */
  front: string;
  /** Back of the card (Vietnamese meaning) */
  back: string;
  /** Example sentence in English */
  example?: string;
  /** ID of the source exercise */
  exerciseId: string;
  /** Category for filtering */
  category?: string;
  /** When the flashcard was created */
  createdAt: Date;

  // Spaced Repetition fields (Requirements: 7.4)
  /** Ease factor for spaced repetition (default 2.5) */
  easeFactor: number;
  /** Current interval in days */
  interval: number;
  /** Next scheduled review date */
  nextReviewDate: Date;
  /** Number of times this card has been reviewed */
  reviewCount: number;
  /** Date of the last review */
  lastReviewDate?: Date;
}

/**
 * Filter options for flashcard queries.
 * Requirements: 5.6 - Allow filtering by exercise, category, or mastery level
 */
export interface FlashcardFilter {
  /** Filter by specific exercise ID */
  exercise: string | null;
  /** Filter by category */
  category: string | null;
  /** Filter by mastery level */
  mastery: FlashcardMasteryLevel | null;
}

/**
 * Mastery levels for flashcard filtering.
 */
export type FlashcardMasteryLevel = 'new' | 'learning' | 'mastered';

/**
 * Statistics about the flashcard collection.
 * Requirements: 3.8 - Show total cards, cards due for review, and mastery percentage
 */
export interface FlashcardStats {
  /** Total number of flashcards */
  total: number;
  /** Number of cards due for review */
  due: number;
  /** Mastery percentage (0-100) */
  mastery: number;
}

/**
 * Statistics for a single review session.
 * Requirements: 5.4, 5.5 - Track session statistics including cards reviewed, accuracy, and time
 */
export interface ReviewSessionStats {
  /** Number of cards reviewed in this session */
  cardsReviewed: number;
  /** Number of cards marked as "Know" */
  correctCount: number;
  /** Accuracy percentage (0-100) */
  accuracy: number;
  /** Time spent in seconds */
  timeSpent: number;
  /** When the session started */
  startedAt: Date;
  /** When the session ended */
  endedAt: Date;
}

// ============================================================================
// Combined Memory Data Models
// ============================================================================

/**
 * Combined memory data for an exercise.
 * Contains quiz, summary, and flashcard data generated for a specific exercise.
 */
export interface MemoryData {
  /** ID of the exercise this data is for */
  exerciseId: string;
  /** Quiz data including questions and optional result */
  quiz?: {
    questions: QuizQuestion[];
    result?: QuizResult;
  };
  /** Generated content summary */
  summary?: ContentSummaryData;
  /** Generated flashcards from the exercise */
  flashcards?: Flashcard[];
  /** When this memory data was generated */
  generatedAt: Date;
}

// ============================================================================
// Storage Models
// ============================================================================

/**
 * Storage structure for memory retention data.
 * Used for persisting data to localStorage or Supabase.
 */
export interface MemoryRetentionStorage {
  /** Memory data indexed by exercise ID */
  memoryData: { [exerciseId: string]: MemoryData };
  /** All user's flashcards */
  flashcards: Flashcard[];
  /** Quiz results indexed by exercise ID */
  quizResults: { [exerciseId: string]: QuizResult };
}

// ============================================================================
// Helper Types
// ============================================================================

/**
 * Default values for creating new flashcards.
 */
export const FLASHCARD_DEFAULTS = {
  easeFactor: 2.5,
  interval: 0,
  reviewCount: 0,
} as const;

/**
 * Spaced repetition algorithm constants.
 * Requirements: 7.2, 7.3 - Interval bounds for spaced repetition
 */
export const SPACED_REPETITION_CONSTANTS = {
  /** Minimum interval in days */
  MIN_INTERVAL: 1,
  /** Maximum interval in days */
  MAX_INTERVAL: 180,
  /** Multiplier when card is marked as "Know" */
  KNOW_MULTIPLIER: 2.5,
  /** Interval when card is marked as "Don't Know" */
  DONT_KNOW_INTERVAL: 1,
  /** Minimum ease factor */
  MIN_EASE_FACTOR: 1.3,
  /** Maximum ease factor */
  MAX_EASE_FACTOR: 3.0,
  /** Ease factor increase on correct answer */
  EASE_INCREASE: 0.1,
  /** Ease factor decrease on incorrect answer */
  EASE_DECREASE: 0.2,
} as const;

/**
 * Quiz configuration constants.
 * Requirements: 1.1 - Generate 4-5 questions
 */
export const QUIZ_CONSTANTS = {
  /** Minimum number of quiz questions */
  MIN_QUESTIONS: 3,
  /** Maximum number of quiz questions */
  MAX_QUESTIONS: 5,
  /** Number of options per question */
  OPTIONS_COUNT: 4,
  /** Minimum score to trigger quiz generation */
  MIN_SCORE_FOR_QUIZ: 75,
  /** Minimum quiz score for bonus points */
  MIN_SCORE_FOR_BONUS: 80,
  /** Bonus points awarded for good quiz performance */
  BONUS_POINTS: 5,
} as const;

/**
 * Vocabulary extraction constants.
 * Requirements: 2.2 - Extract 5-8 key vocabulary words
 */
export const VOCABULARY_CONSTANTS = {
  /** Minimum number of vocabulary words to extract */
  MIN_VOCABULARY: 5,
  /** Maximum number of vocabulary words to extract */
  MAX_VOCABULARY: 8,
  /** Minimum number of main ideas */
  MIN_MAIN_IDEAS: 2,
  /** Maximum number of main ideas */
  MAX_MAIN_IDEAS: 3,
} as const;
