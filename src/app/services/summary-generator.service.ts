import { Injectable, inject } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import {
  ContentSummaryData,
  KeyVocabulary,
  MainIdea,
  VOCABULARY_CONSTANTS
} from '../models/memory-retention.model';
import { Exercise } from '../models/exercise.model';
import { AIProviderFactory } from './ai/ai-provider.factory';
import { ConfigService } from './config.service';
import { environment } from '../../environments/environment';

/**
 * SummaryGeneratorService generates content summaries and extracts key vocabulary using AI.
 * Requirements: 2.1, 2.2, 2.5
 */
@Injectable({
  providedIn: 'root'
})
export class SummaryGeneratorService {
  private aiFactory = inject(AIProviderFactory);
  private configService = inject(ConfigService);

  /**
   * Generate a content summary for an exercise.
   * Requirements: 2.1 - Generate concise summary of 2-3 main ideas
   * Requirements: 2.2 - Extract 5-8 key vocabulary words
   */
  generateSummary(exercise: Exercise, userTranslation: string): Observable<ContentSummaryData> {
    const prompt = this.buildSummaryPrompt(exercise, userTranslation);

    return this.callAI(prompt).pipe(
      map(response => this.parseSummaryResponse(response, exercise.id)),
      catchError(error => {
        console.error('[SummaryGeneratorService] Summary generation failed:', error);
        // Requirements: 2.5 - Return fallback summary on failure
        return of(this.createFallbackSummary(exercise));
      })
    );
  }

  /**
   * Build the prompt for summary generation.
   */
  private buildSummaryPrompt(exercise: Exercise, userTranslation: string): string {
    return `Analyze the following passage and extract:
1. ${VOCABULARY_CONSTANTS.MIN_MAIN_IDEAS}-${VOCABULARY_CONSTANTS.MAX_MAIN_IDEAS} main ideas (in both English and Vietnamese)
2. ${VOCABULARY_CONSTANTS.MIN_VOCABULARY}-${VOCABULARY_CONSTANTS.MAX_VOCABULARY} key vocabulary words with meanings and example sentences

Vietnamese passage:
${exercise.sourceText}

English translation:
${userTranslation}

Return JSON format:
{
  "mainIdeas": [
    { "english": "The main idea in English", "vietnamese": "Ý chính bằng tiếng Việt" }
  ],
  "vocabulary": [
    { 
      "word": "example", 
      "meaning": "ví dụ", 
      "exampleSentence": "This is an example sentence from the passage.", 
      "partOfSpeech": "noun" 
    }
  ]
}

Rules:
- Extract exactly ${VOCABULARY_CONSTANTS.MIN_MAIN_IDEAS} to ${VOCABULARY_CONSTANTS.MAX_MAIN_IDEAS} main ideas
- Extract exactly ${VOCABULARY_CONSTANTS.MIN_VOCABULARY} to ${VOCABULARY_CONSTANTS.MAX_VOCABULARY} vocabulary words
- Each main idea must have both English and Vietnamese versions
- Each vocabulary word must have word, meaning (Vietnamese), and exampleSentence
- partOfSpeech is optional but recommended
- Example sentences should be from the passage or closely related
- Return ONLY the JSON object, no additional text`;
  }

  /**
   * Parse the AI response into ContentSummaryData.
   */
  private parseSummaryResponse(response: string, exerciseId: string): ContentSummaryData {
    try {
      // Clean the response - remove markdown code blocks if present
      let cleanResponse = response.trim();
      if (cleanResponse.startsWith('```json')) {
        cleanResponse = cleanResponse.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (cleanResponse.startsWith('```')) {
        cleanResponse = cleanResponse.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }

      // Try to extract JSON object from response
      const jsonMatch = cleanResponse.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.error('[SummaryGeneratorService] No JSON object found in response');
        throw new Error('Invalid response format');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      // Validate and transform main ideas
      const mainIdeas = this.validateMainIdeas(parsed.mainIdeas || []);

      // Validate and transform vocabulary
      const vocabulary = this.validateVocabulary(parsed.vocabulary || []);

      return {
        exerciseId,
        mainIdeas,
        vocabulary,
        generatedAt: new Date()
      };
    } catch (error) {
      console.error('[SummaryGeneratorService] Failed to parse summary response:', error);
      throw error;
    }
  }

  /**
   * Validate and transform main ideas array.
   * Requirements: 2.6 - Main ideas must be in both English and Vietnamese
   */
  private validateMainIdeas(ideas: any[]): MainIdea[] {
    if (!Array.isArray(ideas)) return [];

    const validIdeas: MainIdea[] = [];
    for (const idea of ideas) {
      if (idea.english && idea.vietnamese) {
        validIdeas.push({
          english: String(idea.english).trim(),
          vietnamese: String(idea.vietnamese).trim()
        });
      }
    }

    // Ensure we have at least MIN_MAIN_IDEAS
    if (validIdeas.length < VOCABULARY_CONSTANTS.MIN_MAIN_IDEAS) {
      console.warn(
        `[SummaryGeneratorService] Only ${validIdeas.length} valid main ideas, expected at least ${VOCABULARY_CONSTANTS.MIN_MAIN_IDEAS}`
      );
    }

    // Limit to MAX_MAIN_IDEAS
    return validIdeas.slice(0, VOCABULARY_CONSTANTS.MAX_MAIN_IDEAS);
  }

  /**
   * Validate and transform vocabulary array.
   * Requirements: 2.3 - Each vocabulary must have word, meaning, and example sentence
   */
  private validateVocabulary(vocab: any[]): KeyVocabulary[] {
    if (!Array.isArray(vocab)) return [];

    const validVocab: KeyVocabulary[] = [];
    for (const item of vocab) {
      if (item.word && item.meaning && item.exampleSentence) {
        validVocab.push({
          word: String(item.word).trim(),
          meaning: String(item.meaning).trim(),
          exampleSentence: String(item.exampleSentence).trim(),
          partOfSpeech: item.partOfSpeech ? String(item.partOfSpeech).trim() : undefined
        });
      }
    }

    // Ensure we have at least MIN_VOCABULARY
    if (validVocab.length < VOCABULARY_CONSTANTS.MIN_VOCABULARY) {
      console.warn(
        `[SummaryGeneratorService] Only ${validVocab.length} valid vocabulary items, expected at least ${VOCABULARY_CONSTANTS.MIN_VOCABULARY}`
      );
    }

    // Limit to MAX_VOCABULARY
    return validVocab.slice(0, VOCABULARY_CONSTANTS.MAX_VOCABULARY);
  }

  /**
   * Create a fallback summary when AI generation fails.
   * Requirements: 2.5 - Display original passage text as fallback
   */
  createFallbackSummary(exercise: Exercise): ContentSummaryData {
    // Extract simple vocabulary from the exercise hints if available
    const fallbackVocab: KeyVocabulary[] = exercise.hints
      .slice(0, VOCABULARY_CONSTANTS.MAX_VOCABULARY)
      .map((hint, index) => ({
        word: `Hint ${index + 1}`,
        meaning: hint,
        exampleSentence: exercise.sourceText.substring(0, 100) + '...'
      }));

    return {
      exerciseId: exercise.id,
      mainIdeas: [
        {
          english: 'Summary generation failed. Please review the original passage.',
          vietnamese: 'Không thể tạo tóm tắt. Vui lòng xem lại đoạn văn gốc.'
        }
      ],
      vocabulary: fallbackVocab.length > 0 ? fallbackVocab : [],
      generatedAt: new Date()
    };
  }

  /**
   * Call the AI provider to generate text.
   */
  private callAI(prompt: string): Observable<string> {
    try {
      const config = this.configService.getConfig() || { provider: environment.aiProvider };
      const providerType = (config as any)?.provider || environment.aiProvider;
      const provider = this.aiFactory.getProvider(providerType);

      if (!provider) {
        return throwError(() => new Error(`AI provider ${providerType} not found`));
      }

      return provider.generateText(
        {
          messages: [
            {
              role: 'system',
              content:
                'You are a helpful assistant that analyzes text passages and extracts key information. Always respond with valid JSON.'
            },
            { role: 'user', content: prompt }
          ],
          temperature: 0.5,
          maxTokens: 2000
        },
        config
      );
    } catch (error) {
      return throwError(() => error);
    }
  }
}
