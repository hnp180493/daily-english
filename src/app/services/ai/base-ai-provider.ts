import { Observable } from 'rxjs';
import { AIResponse, AIStreamChunk, ExerciseContext } from '../../models/ai.model';

export interface AIProviderConfig {
  [key: string]: any;
}

export interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AIRequest {
  messages: AIMessage[];
  temperature?: number;
  maxTokens?: number;
}

/**
 * Base class for all AI providers
 * Supports both simple text generation and complex translation analysis
 */
export abstract class BaseAIProvider {
  abstract get name(): string;
  abstract isConfigured(config: any): boolean;
  
  // Core method: generate text from messages
  abstract generateText(request: AIRequest, config: any): Observable<string>;
  
  // Optional: Advanced methods for translation analysis
  // Providers can override these for custom implementations
  analyzeText(
    userInput: string,
    sourceText: string,
    context: ExerciseContext,
    config: any
  ): Observable<AIResponse> {
    // Default implementation using generateText
    throw new Error('analyzeText not implemented for this provider');
  }
  
  analyzeTextStream(
    userInput: string,
    sourceText: string,
    context: ExerciseContext,
    config: any
  ): Observable<AIStreamChunk> {
    // Default implementation using generateText
    throw new Error('analyzeTextStream not implemented for this provider');
  }
  
  generateHint(
    sourceText: string,
    userInput: string,
    previousHints: string[],
    context: ExerciseContext,
    config: any
  ): Observable<string> {
    // Default implementation using generateText
    throw new Error('generateHint not implemented for this provider');
  }
}
