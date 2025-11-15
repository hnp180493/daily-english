export interface DictationSentence {
  original: string;           // The translated text to dictate
  userInput: string;          // What user typed
  isCompleted: boolean;       // Whether sentence is completed
  accuracyScore: number;      // 0-100 accuracy score
  attempts: number;           // Number of attempts for this sentence
  feedback: DictationFeedback | null;
}

export interface DictationFeedback {
  differences: TextDifference[];
  characterAccuracy: number;  // Percentage of correct characters
  wordAccuracy: number;       // Percentage of correct words
  mistakes: MistakeCategory;
}

export interface TextDifference {
  type: 'match' | 'insert' | 'delete' | 'replace';
  originalText: string;
  userText: string;
  startIndex: number;
  endIndex: number;
}

export interface MistakeCategory {
  missingWords: string[];
  extraWords: string[];
  misspelledWords: Array<{ original: string; typed: string }>;
}

export interface DictationPracticeAttempt {
  exerciseId: string;
  translatedText: string;     // The full translated text used
  attemptNumber: number;
  sentenceAttempts: DictationSentence[];
  overallAccuracy: number;
  timeSpent: number;          // Seconds
  timestamp: Date;
  playbackSpeed: number;
}

export interface DictationProgress {
  [exerciseId: string]: DictationPracticeAttempt;
}
