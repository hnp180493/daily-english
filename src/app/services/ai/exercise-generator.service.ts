import { Injectable, inject } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { map, catchError, switchMap } from 'rxjs/operators';
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

    // Step 1: Generate English content
    const englishPrompt = this.buildEnglishGenerationPrompt(request);
    const englishRequest: AIRequest = {
      messages: [
        { role: 'system', content: 'You are a helpful English language teacher creating practice exercises.' },
        { role: 'user', content: englishPrompt }
      ],
      temperature: 0.7,
      maxTokens: 800
    };
    
    return provider.generateText(englishRequest, config).pipe(
      map(response => this.parseEnglishGenerationResponse(response)),
      // Step 2: Translate English to Vietnamese
      switchMap(englishData => {
        const translationPrompt = this.buildVietnameseTranslationPrompt(englishData.englishText || '');
        const translationRequest: AIRequest = {
          messages: [
            { role: 'system', content: 'You are a professional Vietnamese translator. Your translations are accurate, natural, and sound like native Vietnamese content.' },
            { role: 'user', content: translationPrompt }
          ],
          temperature: 0.4, // Balanced temperature for accurate yet natural translation
          maxTokens: 800
        };
        
        return provider.generateText(translationRequest, config).pipe(
          map(vietnameseText => {
            const cleanedVietnamese = this.parseVietnameseTranslation(vietnameseText);
            return {
              ...englishData,
              sourceText: cleanedVietnamese
            } as ExerciseGenerationResponse;
          })
        );
      }),
      catchError(error => {
        console.error('[ExerciseGenerator] Generation failed:', error);
        return throwError(() => this.handleGenerationError(error));
      })
    );
  }

  private buildEnglishGenerationPrompt(request: ExerciseGenerationRequest): string {
    const difficultyDescription = this.getDifficultyDescription(request.difficulty);
    
    const vocabularyRequirement = request.vocabularyWords 
      ? `\n- IMPORTANT: Include and use these specific vocabulary words: ${request.vocabularyWords}\n- Make sure these words appear naturally in the context of the story`
      : '';

    return `You are an English language teacher creating practice exercises for Vietnamese students learning English.

Generate a translation exercise based on this prompt: "${request.prompt}"

Requirements:
- Difficulty level: ${request.difficulty} (${difficultyDescription})${vocabularyRequirement}
- Create a substantial English paragraph (6-10 sentences) that tells a complete story or describes a detailed scenario
- The content should be rich, engaging, and provide good context for translation practice
- Include varied sentence structures, descriptive language, and natural conversation or narrative flow
- Identify 4-6 key sentences that would be good for translation practice (mix of simple and complex sentences)
- Provide a descriptive title for the exercise
- Suggest a category if applicable

Content Guidelines:
- Make the text realistic and relatable to daily life situations
- Include specific details, emotions, and vivid descriptions
- Use natural language that native English speakers would actually use
- Ensure the story has a clear beginning, middle, and conclusion
- Include dialogue, actions, and descriptive elements to make it engaging

Format your response as JSON:
{
  "title": "Exercise title",
  "englishText": "Full detailed paragraph in English (6-10 sentences)",
  "suggestedSentences": ["sentence 1", "sentence 2", "sentence 3", "sentence 4"],
  "category": "suggested category (optional)"
}

Important: Return ONLY the JSON object, no additional text or explanation.`;
  }

  private buildVietnameseTranslationPrompt(englishText: string): string {
    return `You are a professional Vietnamese translator specializing in accurate, natural translations for language learning materials.

Translate the following English text to Vietnamese with these requirements:

ACCURACY (CRITICAL):
- Translate ALL details accurately - do NOT change, add, or omit any information
- Preserve all specific nouns (names, objects, foods, places) exactly
- Keep numbers, quantities, and measurements precise
- Maintain the exact meaning of every sentence
- If the English says "mango", translate as "xoài" (NOT "dưa hấu" or other fruits)
- If the English says "chicken", translate as "gà" (NOT "gà nướng" unless it says "grilled chicken")

NATURALNESS:
- Use natural Vietnamese sentence structures (not word-for-word translation)
- Use everyday Vietnamese expressions where appropriate
- Sound like a native Vietnamese speaker wrote it
- Maintain the tone, emotion, and style of the original
- Use appropriate Vietnamese grammar and word order

BALANCE:
- Prioritize accuracy first, then naturalness
- When in doubt, stay closer to the literal meaning
- Do NOT be creative with the content - translate what is actually written

English text to translate:
"""
${englishText}
"""

Return ONLY the Vietnamese translation, no explanations or additional text.`;
  }

  private parseEnglishGenerationResponse(response: string): Omit<ExerciseGenerationResponse, 'sourceText'> {
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
      if (!parsed.title || !parsed.englishText || !parsed.suggestedSentences) {
        throw new Error('Invalid response format: missing required fields');
      }

      if (!Array.isArray(parsed.suggestedSentences) || parsed.suggestedSentences.length === 0) {
        throw new Error('Invalid response format: suggestedSentences must be a non-empty array');
      }

      return {
        title: parsed.title,
        englishText: parsed.englishText,
        suggestedSentences: parsed.suggestedSentences,
        category: parsed.category
      };
    } catch (error) {
      console.error('[ExerciseGenerator] Failed to parse English generation response:', error);
      console.error('[ExerciseGenerator] Raw response:', response);
      throw new Error('Failed to parse AI response. Please try again.');
    }
  }

  private parseVietnameseTranslation(response: string): string {
    // Clean any markdown or extra formatting
    let cleanText = response.trim();
    
    // Remove markdown code blocks if present
    if (cleanText.startsWith('```')) {
      cleanText = cleanText.replace(/^```[a-z]*\n/, '').replace(/\n```$/, '');
    }
    
    // Remove quotes if the entire text is wrapped in quotes
    if ((cleanText.startsWith('"') && cleanText.endsWith('"')) ||
        (cleanText.startsWith("'") && cleanText.endsWith("'"))) {
      cleanText = cleanText.slice(1, -1);
    }
    
    return cleanText.trim();
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
