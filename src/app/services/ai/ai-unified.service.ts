import { Injectable, inject } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { AIProvider, AIResponse, AIStreamChunk, ExerciseContext } from '../../models/ai.model';
import { Exercise } from '../../models/exercise.model';
import { AIProviderFactory } from './ai-provider.factory';
import { ConfigService } from '../config.service';
import { AnalyticsService } from '../analytics.service';
import { environment } from '../../../environments/environment';

/**
 * Unified AI Service using the new provider factory pattern
 * This replaces the old ai.service.ts
 * 
 * Provides both low-level methods (analyzeText, generateHint) and
 * high-level convenience methods (analyzeTranslation, analyzeTranslationStream)
 */
@Injectable({
  providedIn: 'root'
})
export class AIUnifiedService implements AIProvider {
  private factory = inject(AIProviderFactory);
  private configService = inject(ConfigService);
  private analyticsService = inject(AnalyticsService);

  analyzeText(
    userInput: string,
    sourceText: string,
    context: ExerciseContext
  ): Observable<AIResponse> {
    const provider = this.getActiveProvider();
    const config = this.getConfig();
    const providerType = (config as any)?.provider || environment.aiProvider;
    const startTime = Date.now();

    // Track AI request
    this.analyticsService.trackAiRequest(providerType, 'default', 'analyze_text');

    return provider.analyzeText(userInput, sourceText, context, config).pipe(
      tap(response => {
        // Track AI response
        const responseTime = Date.now() - startTime;
        this.analyticsService.trackAiResponse(providerType, responseTime, 0);
      }),
      catchError(error => {
        console.error('AI Service Error:', error);
        
        // Track AI error
        this.analyticsService.trackAiError(providerType, error?.message || 'unknown_error');
        
        const errorMessage = error?.message || 'Failed to analyze text. Please try again.';
        return throwError(() => new Error(errorMessage));
      })
    );
  }

  analyzeTextStream(
    userInput: string,
    sourceText: string,
    context: ExerciseContext
  ): Observable<AIStreamChunk> {
    const provider = this.getActiveProvider();
    const config = this.getConfig();
    const providerType = (config as any)?.provider || environment.aiProvider;
    const startTime = Date.now();
    let firstChunkReceived = false;

    // Track AI request
    this.analyticsService.trackAiRequest(providerType, 'default', 'analyze_text_stream');

    return provider.analyzeTextStream(userInput, sourceText, context, config).pipe(
      tap(chunk => {
        // Track response time on first chunk
        if (!firstChunkReceived) {
          const responseTime = Date.now() - startTime;
          this.analyticsService.trackAiResponse(providerType, responseTime, 0);
          firstChunkReceived = true;
        }
      }),
      catchError(error => {
        console.error('AI Service Stream Error:', error);
        
        // Track AI error
        this.analyticsService.trackAiError(providerType, error?.message || 'unknown_error');
        
        const errorMessage = error?.message || 'Failed to analyze text. Please try again.';
        return throwError(() => new Error(errorMessage));
      })
    );
  }

  generateHint(
    sourceText: string,
    userInput: string,
    previousHints: string[],
    context: ExerciseContext
  ): Observable<string> {
    const provider = this.getActiveProvider();
    const config = this.getConfig();
    const providerType = (config as any)?.provider || environment.aiProvider;
    const startTime = Date.now();

    // Track AI request
    this.analyticsService.trackAiRequest(providerType, 'default', 'generate_hint');

    return provider.generateHint(sourceText, userInput, previousHints, context, config).pipe(
      tap(() => {
        // Track AI response
        const responseTime = Date.now() - startTime;
        this.analyticsService.trackAiResponse(providerType, responseTime, 0);
      }),
      catchError(error => {
        console.error('AI Hint Generation Error:', error);
        
        // Track AI error
        this.analyticsService.trackAiError(providerType, error?.message || 'unknown_error');
        
        const errorMessage = error?.message || 'Failed to generate hint. Please try again.';
        return throwError(() => new Error(errorMessage));
      })
    );
  }

  validateCredentials(): Observable<boolean> {
    const provider = this.getActiveProvider();
    const config = this.getConfig();
    return provider.isConfigured(config) ? new Observable(obs => { obs.next(true); obs.complete(); }) : new Observable(obs => { obs.next(false); obs.complete(); });
  }

  // ============================================
  // Convenience Methods (High-level API)
  // ============================================

  /**
   * Analyze translation with Exercise object (convenience method)
   * This is a wrapper around analyzeText() for easier usage
   */
  analyzeTranslation(userInput: string, exercise: Exercise & { translatedContext?: string }): Observable<AIResponse> {
    const context: ExerciseContext = {
      level: exercise.level,
      category: exercise.category,
      hints: exercise.hints,
      fullContext: exercise.fullContext || exercise.sourceText,
      translatedContext: exercise.translatedContext || '',
      englishText: exercise.englishText
    };

    return this.analyzeText(userInput, exercise.sourceText, context).pipe(
      catchError(error => {
        console.error('AI Service Error:', error);
        const errorMessage = error?.message || 'Failed to analyze text. Please try again.';
        return throwError(() => new Error(errorMessage));
      })
    );
  }

  /**
   * Analyze translation with streaming (convenience method)
   * This is a wrapper around analyzeTextStream() for easier usage
   */
  analyzeTranslationStream(userInput: string, exercise: Exercise & { translatedContext?: string }): Observable<AIStreamChunk> {
    const context: ExerciseContext = {
      level: exercise.level,
      category: exercise.category,
      hints: exercise.hints,
      fullContext: exercise.fullContext || exercise.sourceText,
      translatedContext: exercise.translatedContext || '',
      englishText: exercise.englishText
    };

    return this.analyzeTextStream(userInput, exercise.sourceText, context).pipe(
      catchError(error => {
        console.error('AI Service Stream Error:', error);
        const errorMessage = error?.message || 'Failed to analyze text. Please try again.';
        return throwError(() => new Error(errorMessage));
      })
    );
  }

  /**
   * Generate hint with Exercise object (convenience method)
   * This is a wrapper around generateHint() for easier usage
   */
  generateHintForExercise(
    sourceText: string,
    userInput: string,
    previousHints: string[],
    exercise: Exercise & { translatedContext?: string }
  ): Observable<string> {
    const context: ExerciseContext = {
      level: exercise.level,
      category: exercise.category,
      hints: exercise.hints,
      fullContext: exercise.fullContext || exercise.sourceText,
      translatedContext: exercise.translatedContext || '',
      englishText: exercise.englishText
    };

    return this.generateHint(sourceText, userInput, previousHints, context).pipe(
      catchError(error => {
        console.error('AI Hint Generation Error:', error);
        const errorMessage = error?.message || 'Failed to generate hint. Please try again.';
        return throwError(() => new Error(errorMessage));
      })
    );
  }

  /**
   * Get active provider - returns BaseAIProvider from factory
   * Note: This only provides generateText() method
   * For full AIProvider interface, use the service classes directly
   */
  private getActiveProvider() {
    const config = this.getConfig();
    const providerType = (config as any)?.provider || environment.aiProvider;
    const provider = this.factory.getProvider(providerType);
    
    if (!provider) {
      throw new Error(`Provider ${providerType} not found`);
    }

    return provider;
  }

  private getConfig() {
    const config = this.configService.getConfig();
    if (config) {
      return config;
    }
    // Return environment as fallback with proper structure
    return {
      provider: environment.aiProvider,
      // azure: environment.azure,
      // gemini: environment.gemini,
      // openai: environment.openai
    };
  }
}
