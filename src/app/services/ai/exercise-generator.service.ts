import { Injectable, inject } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { ConfigService } from '../config.service';
import { AIProviderFactory } from './ai-provider.factory';
import { AIRequest } from './base-ai-provider';
import {
  ExerciseGenerationRequest,
  ExerciseGenerationResponse,
  DifficultyLevel
} from '../../models/exercise.model';

@Injectable({
  providedIn: 'root'
})
export class ExerciseGeneratorService {
  private configService = inject(ConfigService);
  private providerFactory = inject(AIProviderFactory);

  generateExercise(request: ExerciseGenerationRequest): Observable<ExerciseGenerationResponse> {
    const config = this.configService.getConfig();
    const provider = this.providerFactory.getConfiguredProvider(config);
    
    if (!provider) {
      return throwError(() => new Error('No AI provider configured. Please configure OpenAI, Azure, or Gemini in settings.'));
    }

    const prompt = this.buildGenerationPrompt(request);
    const aiRequest: AIRequest = {
      messages: [
        { role: 'system', content: 'You are a helpful English language teacher.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
      maxTokens: 800
    };
    
    return provider.generateText(aiRequest, config).pipe(
      map(response => this.parseGenerationResponse(response)),
      catchError(error => {
        console.error('[ExerciseGenerator] Generation failed:', error);
        return throwError(() => this.handleGenerationError(error));
      })
    );
  }

  private buildGenerationPrompt(request: ExerciseGenerationRequest): string {
    const difficultyDescription = this.getDifficultyDescription(request.difficulty);
    const sourceLanguage = request.sourceLanguage || 'Chinese';
    const targetLanguage = request.targetLanguage || 'English';

    return `You are an English language teacher creating practice exercises for students.

Generate a translation exercise based on this prompt: "${request.prompt}"

Requirements:
- Difficulty level: ${request.difficulty} (${difficultyDescription})
- Source language: ${sourceLanguage}
- Target language: ${targetLanguage}
- Create a substantial paragraph (6-10 sentences) in the source language that tells a complete story or describes a detailed scenario
- The content should be rich, engaging, and provide good context for translation practice
- Include varied sentence structures, descriptive language, and natural conversation or narrative flow
- Identify 4-6 key sentences that would be good for translation practice (mix of simple and complex sentences)
- Provide a descriptive title for the exercise
- Suggest a category if applicable

Content Guidelines:
- Make the text realistic and relatable to daily life situations
- Include specific details, emotions, and vivid descriptions
- Use natural language that native speakers would actually use
- Ensure the story has a clear beginning, middle, and conclusion
- Include dialogue, actions, and descriptive elements to make it engaging

Format your response as JSON:
{
  "title": "Exercise title",
  "sourceText": "Full detailed paragraph in source language (6-10 sentences)",
  "suggestedSentences": ["sentence 1", "sentence 2", "sentence 3", "sentence 4"],
  "category": "suggested category (optional)"
}

Important: Return ONLY the JSON object, no additional text or explanation.`;
  }

  private getDifficultyDescription(level: DifficultyLevel): string {
    switch (level) {
      case DifficultyLevel.BEGINNER:
        return 'Simple vocabulary and basic sentence structures';
      case DifficultyLevel.INTERMEDIATE:
        return 'Moderate vocabulary with some complex structures';
      case DifficultyLevel.ADVANCED:
        return 'Advanced vocabulary and complex sentence structures';
      default:
        return 'Appropriate difficulty';
    }
  }



  private parseGenerationResponse(response: string): ExerciseGenerationResponse {
    try {
      // Clean markdown code blocks if present
      let cleanText = response.trim();
      if (cleanText.startsWith('```json')) {
        cleanText = cleanText.replace(/^```json\n/, '').replace(/\n```$/, '');
      } else if (cleanText.startsWith('```')) {
        cleanText = cleanText.replace(/^```\n/, '').replace(/\n```$/, '');
      }

      const parsed = JSON.parse(cleanText);

      // Validate required fields
      if (!parsed.title || !parsed.sourceText || !parsed.suggestedSentences) {
        throw new Error('Invalid response format: missing required fields');
      }

      if (!Array.isArray(parsed.suggestedSentences) || parsed.suggestedSentences.length === 0) {
        throw new Error('Invalid response format: suggestedSentences must be a non-empty array');
      }

      return {
        title: parsed.title,
        sourceText: parsed.sourceText,
        suggestedSentences: parsed.suggestedSentences,
        category: parsed.category
      };
    } catch (error) {
      console.error('[ExerciseGenerator] Failed to parse response:', error);
      console.error('[ExerciseGenerator] Raw response:', response);
      throw new Error('Failed to parse AI response. Please try again.');
    }
  }

  private handleGenerationError(error: any): Error {
    const message = error?.message || error?.toString() || 'Unknown error';

    // Check for specific error types
    if (message.includes('API key')) {
      return new Error('AI generation is not configured. Please enter content manually.');
    }

    if (message.includes('rate limit') || message.includes('quota')) {
      return new Error('AI service rate limit reached. Please try again in a few minutes.');
    }

    if (message.includes('network') || message.includes('fetch')) {
      return new Error('Failed to connect to AI service. Please check your connection and try again.');
    }

    if (message.includes('parse') || message.includes('JSON')) {
      return new Error('AI generated invalid content. Please try again or enter manually.');
    }

    if (message.includes('policy') || message.includes('content')) {
      return new Error('Content violates AI service policies. Please modify your prompt.');
    }

    return new Error(`AI generation failed: ${message}`);
  }
}
