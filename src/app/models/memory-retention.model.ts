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

  // FSRS state (optional — populated on first FSRS rating; migrated on load if missing)
  /** FSRS card state */
  state?: FsrsCardState;
  /** FSRS stability (days the memory will last) */
  stability?: number;
  /** FSRS difficulty 1-10 */
  difficulty?: number;
  /** Number of times user has lapsed (rated Again in review state) */
  lapses?: number;
  /** Last user rating (1=Again, 2=Hard, 3=Good, 4=Easy) */
  lastRating?: ReviewRating;
  /** Days that elapsed since last review when this state was computed */
  elapsedDays?: number;
  /** Days scheduled until next review (from FSRS) */
  scheduledDays?: number;
  /** Number of times this card has been answered incorrectly in current learning step */
  learningStep?: number;

  // Extended fields
  /** User-added tags for grouping/filtering. */
  tags?: string[];
  /** True if the user created this manually (vs auto-generated from an exercise). */
  customCreated?: boolean;
  /** True if user (or auto-leech detector) suspended this card from due queue. */
  suspended?: boolean;
}

/**
 * FSRS card state machine.
 *  new       — never reviewed
 *  learning  — in initial learning phase, short steps
 *  review    — in main spaced repetition phase
 *  relearning— failed in review, going back through short steps
 */
export type FsrsCardState = 'new' | 'learning' | 'review' | 'relearning';

/**
 * 4-button rating (Anki/FSRS standard).
 *  1 Again — total miss; restart learning
 *  2 Hard  — got it but with difficulty
 *  3 Good  — recalled correctly with normal effort
 *  4 Easy  — recalled with no hesitation
 */
export type ReviewRating = 1 | 2 | 3 | 4;

/**
 * Review mode for the study session. Different modes test the same card in
 * different ways to avoid "recognizing the card layout" rather than the content.
 */
export type CardType =
  | 'flip' // classic: see front, flip to back
  | 'cloze' // example sentence with the word blanked out
  | 'multiple-choice' // 4 options, pick the meaning
  | 'type-answer' // type the target word (fuzzy match)
  | 'audio-cue' // TTS reads the word, user picks meaning
  | 'reverse'; // see meaning first, recall word

/** Prompt payload produced by FlashcardModeService for the study UI. */
export interface CardPrompt {
  type: CardType;
  /** The flashcard being studied. */
  card: Flashcard;
  /** What to show before the answer is revealed. */
  questionText: string;
  /** What the correct answer is, in canonical form. */
  answerText: string;
  /** For multiple-choice: 4 options (one is correct). */
  options?: string[];
  /** For multiple-choice: index 0-3 of the correct option. */
  correctIndex?: number;
  /** For cloze: word that was blanked out. */
  clozeAnswer?: string;
  /** Whether to use TTS to read questionText aloud. */
  speakQuestion?: boolean;
}

/**
 * A smart deck dynamically gathers cards based on a rule rather than a fixed list.
 * Used for "Due today", "Words you keep failing", "By category", etc.
 */
export type SmartDeckKind = 'due' | 'weak' | 'leech' | 'new' | 'category' | 'all';

export interface SmartDeckDefinition {
  id: string;
  kind: SmartDeckKind;
  label: string;
  description: string;
  icon: string;
  /** Optional kind-specific argument (e.g. category name). */
  argument?: string;
  /** Live count, computed at render time. */
  cardCount?: number;
}

/**
 * User-defined deck — a fixed list of card IDs the user picked manually.
 * Stored in localStorage alongside flashcards.
 */
export interface CustomDeck {
  id: string;
  name: string;
  description?: string;
  cardIds: string[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Constants for FSRS-4.5 algorithm (simplified, FE-only — no model weights pulled
 * from server). The defaults below match the FSRS-4.5 paper's published values.
 * https://github.com/open-spaced-repetition/fsrs4anki
 */
export const FSRS_CONSTANTS = {
  /** Initial stability per rating (Again is unused — failure restarts). */
  INITIAL_STABILITY: { 1: 0.4, 2: 1.2, 3: 2.5, 4: 6.0 } as const,
  /** Initial difficulty per first rating. */
  INITIAL_DIFFICULTY: { 1: 8.0, 2: 6.0, 3: 5.0, 4: 4.0 } as const,
  /** Target retention probability (90%). Lower → longer intervals. */
  REQUEST_RETENTION: 0.9,
  /** Maximum scheduled interval in days. */
  MAX_INTERVAL: 365,
  /** Minimum scheduled interval in days. */
  MIN_INTERVAL: 1,
  /** Learning steps (in minutes — short-term repeats before entering review). */
  LEARNING_STEPS_MIN: [1, 10] as const,
  /** Relearning steps (after lapsing). */
  RELEARNING_STEPS_MIN: [10] as const,
  /** Number of lapses before a card is flagged as leech. */
  LEECH_THRESHOLD: 4,
  /** Difficulty change per rating step. */
  DIFFICULTY_DECAY: -0.5,
  /** Stability multiplier ceiling on Easy rating. */
  EASY_BONUS: 1.3,
  /** Stability multiplier penalty on Hard rating. */
  HARD_FACTOR: 1.2,
} as const;

export const CUSTOM_DECK_STORAGE_KEY = 'flashcard-custom-decks-v1';
export const FLASHCARD_STUDY_PREFS_KEY = 'flashcard-study-prefs-v1';

/** User study preferences for the flashcard study screen. */
export interface FlashcardStudyPrefs {
  /** Mode preference: 'auto' picks mode based on mastery, otherwise fixed. */
  modePreference: 'auto' | CardType;
  /** Whether to play TTS on every card automatically. */
  autoSpeak: boolean;
  /** Daily new card cap. */
  newPerDay: number;
  /** Daily review cap. */
  reviewsPerDay: number;
}

export const FLASHCARD_STUDY_DEFAULTS: FlashcardStudyPrefs = {
  modePreference: 'auto',
  autoSpeak: false,
  newPerDay: 15,
  reviewsPerDay: 100,
};

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
