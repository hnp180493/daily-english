import { Injectable, inject } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { QuizQuestion, QUIZ_CONSTANTS } from '../models/memory-retention.model';
import { Exercise } from '../models/exercise.model';
import { AIProviderFactory } from './ai/ai-provider.factory';
import { ConfigService } from './config.service';
import { environment } from '../../environments/environment';

/**
 * QuizGeneratorService generates comprehension quiz questions using AI.
 * Requirements: 1.1, 1.2, 1.4
 */
@Injectable({
  providedIn: 'root'
})
export class QuizGeneratorService {
  private aiFactory = inject(AIProviderFactory);
  private configService = inject(ConfigService);

  /**
   * Generate quiz questions for an exercise.
   * Requirements: 1.1 - Generate 2-3 questions about passage content using AI
   * Requirements: 1.2 - Create questions that test understanding of main ideas
   */
  generateQuiz(exercise: Exercise, userTranslation: string): Observable<QuizQuestion[]> {
    const prompt = this.buildQuizPrompt(exercise, userTranslation);

    return this.callAI(prompt).pipe(
      map(response => this.parseQuizResponse(response, exercise.id)),
      catchError(error => {
        console.error('[QuizGeneratorService] Quiz generation failed:', error);
        // Requirements: 1.4 - Return empty array on failure (graceful fallback)
        return of([]);
      })
    );
  }

  /**
   * Build the prompt for quiz generation.
   * Requirements: 1.2 - Questions should test comprehension, not word-for-word recall
   */
  private buildQuizPrompt(exercise: Exercise, userTranslation: string): string {
    return `Based on the following passage, generate ${QUIZ_CONSTANTS.MIN_QUESTIONS}-${QUIZ_CONSTANTS.MAX_QUESTIONS} comprehension questions that test understanding of the main ideas.

Vietnamese passage:
${exercise.sourceText}

English translation:
${userTranslation}

Generate questions in JSON format as an array:
[
  {
    "questionText": "What is the main topic of this passage?",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctIndex": 0,
    "explanation": "The passage discusses..."
  }
]

Rules:
- Generate exactly ${QUIZ_CONSTANTS.MIN_QUESTIONS} to ${QUIZ_CONSTANTS.MAX_QUESTIONS} questions
- Questions should test comprehension and understanding, not word-for-word recall
- Each question must have exactly ${QUIZ_CONSTANTS.OPTIONS_COUNT} answer options
- correctIndex must be between 0 and 3
- Provide clear explanations for correct answers
- Questions can be in English or Vietnamese
- Return ONLY the JSON array, no additional text`;
  }

  /**
   * Parse the AI response into QuizQuestion array.
   * Requirements: 1.3 - Each question must have text, 4 options, correct index, and explanation
   */
  private parseQuizResponse(response: string, exerciseId: string): QuizQuestion[] {
    try {
      // Clean the response - remove markdown code blocks if present
      let cleanResponse = response.trim();
      if (cleanResponse.startsWith('```json')) {
        cleanResponse = cleanResponse.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (cleanResponse.startsWith('```')) {
        cleanResponse = cleanResponse.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }

      // Try to extract JSON array from response
      const jsonMatch = cleanResponse.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        console.error('[QuizGeneratorService] No JSON array found in response');
        return [];
      }

      const parsed = JSON.parse(jsonMatch[0]);

      if (!Array.isArray(parsed)) {
        console.error('[QuizGeneratorService] Response is not an array');
        return [];
      }

      // Validate and transform each question
      const questions: QuizQuestion[] = [];
      for (let i = 0; i < parsed.length; i++) {
        const q = parsed[i];
        const question = this.validateAndTransformQuestion(q, exerciseId, i);
        if (question) {
          questions.push(question);
        }
      }

      // Ensure we have at least MIN_QUESTIONS
      if (questions.length < QUIZ_CONSTANTS.MIN_QUESTIONS) {
        console.warn(
          `[QuizGeneratorService] Only ${questions.length} valid questions, expected at least ${QUIZ_CONSTANTS.MIN_QUESTIONS}`
        );
      }

      // Limit to MAX_QUESTIONS
      return questions.slice(0, QUIZ_CONSTANTS.MAX_QUESTIONS);
    } catch (error) {
      console.error('[QuizGeneratorService] Failed to parse quiz response:', error);
      return [];
    }
  }

  /**
   * Validate and transform a single question object.
   */
  private validateAndTransformQuestion(
    q: any,
    exerciseId: string,
    index: number
  ): QuizQuestion | null {
    // Validate required fields
    if (!q.questionText || typeof q.questionText !== 'string') {
      console.warn(`[QuizGeneratorService] Question ${index} missing questionText`);
      return null;
    }

    if (!Array.isArray(q.options) || q.options.length !== QUIZ_CONSTANTS.OPTIONS_COUNT) {
      console.warn(`[QuizGeneratorService] Question ${index} must have exactly 4 options`);
      return null;
    }

    const correctIndex = typeof q.correctIndex === 'number' ? q.correctIndex : parseInt(q.correctIndex, 10);
    if (isNaN(correctIndex) || correctIndex < 0 || correctIndex > 3) {
      console.warn(`[QuizGeneratorService] Question ${index} has invalid correctIndex`);
      return null;
    }

    if (!q.explanation || typeof q.explanation !== 'string') {
      console.warn(`[QuizGeneratorService] Question ${index} missing explanation`);
      return null;
    }

    return {
      id: `${exerciseId}_q${index}_${Date.now()}`,
      questionText: q.questionText.trim(),
      options: q.options.map((opt: any) => String(opt).trim()),
      correctIndex,
      explanation: q.explanation.trim()
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
                'You are a helpful assistant that generates comprehension quiz questions. Always respond with valid JSON.'
            },
            { role: 'user', content: prompt }
          ],
          temperature: 0.7,
          maxTokens: 1500
        },
        config
      );
    } catch (error) {
      return throwError(() => error);
    }
  }
}
