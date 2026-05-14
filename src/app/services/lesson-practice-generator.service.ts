import { Injectable, inject } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { ConfigService } from './config.service';
import { AIProviderFactory } from './ai/ai-provider.factory';
import { PromptService } from './ai/prompt.service';
import { AIRequest } from './ai/base-ai-provider';
import { GrammarLesson, GrammarPracticeItem } from '../models/review.model';

/**
 * Generates fresh VN→EN practice items for a specific grammar lesson via
 * the user's configured AI provider. Reuses the existing provider factory +
 * config pattern (same as ExerciseGeneratorService and WritingService).
 *
 * Why a separate service: keeps the generation prompt + JSON parsing in one
 * place so the UI components stay thin. Mirrors `exercise-generator.service.ts`.
 */
@Injectable({ providedIn: 'root' })
export class LessonPracticeGeneratorService {
  private configService = inject(ConfigService);
  private providerFactory = inject(AIProviderFactory);
  private promptService = inject(PromptService);

  /**
   * Generate `count` new practice items for the given lesson.
   * `exclude` is a list of Vietnamese strings already shown to the user so the
   * AI doesn't repeat them (pass empty array for first call).
   */
  generate(lesson: GrammarLesson, count: number, exclude: string[] = []): Observable<GrammarPracticeItem[]> {
    const config = this.configService.getConfig();
    const provider = this.providerFactory.getConfiguredProvider(config);

    if (!provider) {
      return throwError(
        () => new Error('No AI provider configured. Set up OpenAI, Gemini, Claude, Azure, or OpenRouter in Profile.')
      );
    }

    const prompt = this.promptService.buildLessonPracticePrompt(lesson, count, exclude);
    const request: AIRequest = {
      messages: [
        { role: 'system', content: 'You are an English teacher creating fresh practice exercises. Return only valid JSON.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.85, // Higher so we actually get varied sentences
      maxTokens: 1100,
    };

    return provider.generateText(request, config).pipe(
      map((text) => this.parseResponse(text, count)),
      catchError((err) => {
        console.error('[LessonPracticeGenerator] Error:', err);
        const message = err?.message || 'Failed to generate practice. Try again.';
        return throwError(() => new Error(message));
      })
    );
  }

  private parseResponse(content: string, expectedCount: number): GrammarPracticeItem[] {
    let cleaned = content.trim();
    // Strip markdown fences if the model added them despite instructions.
    cleaned = cleaned.replace(/^```json\s*/i, '').replace(/^```\s*/, '');
    cleaned = cleaned.replace(/\s*```\s*$/, '');

    const objStart = cleaned.indexOf('{');
    if (objStart < 0) throw new Error('Generated response is not valid JSON');
    const candidate = cleaned.slice(objStart);

    let parsed: any;
    try {
      parsed = JSON.parse(candidate);
    } catch (err) {
      throw new Error('Could not parse the AI response as JSON');
    }

    const raw = Array.isArray(parsed.items) ? parsed.items : [];
    const items = raw
      .filter((item: any) => item && typeof item === 'object')
      .map((item: any) => ({
        vietnamese: typeof item.vietnamese === 'string' ? item.vietnamese.trim() : '',
        english: typeof item.english === 'string' ? item.english.trim() : '',
        hint: typeof item.hint === 'string' && item.hint.trim() ? item.hint.trim() : undefined,
      }))
      .filter((item: GrammarPracticeItem) => item.vietnamese && item.english);

    if (items.length === 0) {
      throw new Error('AI returned no usable practice items');
    }

    // Trim to expected count so we don't accidentally pile up extras
    return items.slice(0, expectedCount);
  }
}
