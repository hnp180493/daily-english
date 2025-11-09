import { Observable } from 'rxjs';
import { DifficultyLevel, ExerciseCategory, FeedbackItem } from './exercise.model';

export interface AIProvider {
  analyzeText(
    userInput: string,
    sourceText: string,
    context: ExerciseContext
  ): Observable<AIResponse>;
  analyzeTextStream(
    userInput: string,
    sourceText: string,
    context: ExerciseContext
  ): Observable<AIStreamChunk>;
  generateHint(
    sourceText: string,
    userInput: string,
    previousHints: string[],
    context: ExerciseContext
  ): Observable<string>;
  validateCredentials(): Observable<boolean>;
}

export interface AIStreamChunk {
  type: 'score' | 'feedback' | 'comment' | 'complete' | 'error';
  data?: Partial<AIResponse>;
  feedbackItem?: FeedbackItem;
  error?: string;
}

export interface ExerciseContext {
  level: DifficultyLevel;
  category: ExerciseCategory;
  hints: string[];
  fullContext?: string; // Full paragraph for context when analyzing individual sentences
}

export interface AIResponse {
  accuracyScore: number;
  feedback: FeedbackItem[];
  overallComment: string;
}

export interface AIConfig {
  provider: 'azure' | 'gemini' | 'openai';
  azure?: {
    endpoint: string;
    apiKey: string;
    deploymentName: string;
  };
  gemini?: {
    apiKey: string;
    modelName: string;
  };
  openai?: {
    apiKey: string;
    modelName: string;
  };
}
