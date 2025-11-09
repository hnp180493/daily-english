import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { BaseAIProvider, AIRequest, AIMessage } from '../base-ai-provider';
import { AIResponse, AIStreamChunk, ExerciseContext } from '../../../models/ai.model';
import { PromptService } from '../prompt.service';

@Injectable({
  providedIn: 'root'
})
export class GeminiProvider extends BaseAIProvider {
  private promptService = inject(PromptService);

  get name(): string {
    return 'gemini';
  }

  isConfigured(config: any): boolean {
    return !!(config?.gemini?.apiKey && config?.gemini?.modelName);
  }

  generateText(request: AIRequest, config: any): Observable<string> {
    return new Observable(observer => {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${config.gemini.modelName || 'gemini-pro'}:generateContent?key=${config.gemini.apiKey}`;

      // Convert messages to Gemini format
      const prompt = request.messages
        .filter(m => m.role !== 'system')
        .map(m => m.content)
        .join('\n\n');

      const body = {
        contents: [
          {
            parts: [{ text: prompt }]
          }
        ],
        generationConfig: {
          temperature: request.temperature ?? 0.7,
          maxOutputTokens: request.maxTokens ?? 800
        }
      };

      fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
        .then(async response => {
          const data = await response.json();
          
          // Check for error in response (works for both 200 and error status codes)
          if (data.error) {
            console.error('Gemini API error response:', data.error);
            throw new Error(data.error.message || JSON.stringify(data.error));
          }
          
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          
          return data;
        })
        .then(data => {
          const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
          observer.next(content);
          observer.complete();
        })
        .catch(error => {
          console.error('[Gemini] Error:', error);
          observer.error(error);
        });
    });
  }

  override analyzeText(
    userInput: string,
    sourceText: string,
    context: ExerciseContext,
    config: any
  ): Observable<AIResponse> {
    return new Observable(observer => {
      const prompt = this.promptService.buildAnalysisPrompt(userInput, sourceText, context, context.fullContext, context.translatedContext);
      const messages: AIMessage[] = [
        { role: 'system', content: this.promptService.buildSystemPrompt() },
        { role: 'user', content: prompt }
      ];

      this.generateText({ messages, temperature: 0.7, maxTokens: 1000 }, config).subscribe({
        next: (content) => {
          const response = this.parseResponse(content);
          observer.next(response);
          observer.complete();
        },
        error: (error) => observer.error(error)
      });
    });
  }

  override analyzeTextStream(
    userInput: string,
    sourceText: string,
    context: ExerciseContext,
    config: any
  ): Observable<AIStreamChunk> {
    return new Observable(observer => {
      const prompt = this.promptService.buildAnalysisPrompt(userInput, sourceText, context, context.fullContext, context.translatedContext);
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${config.gemini.modelName}:generateContent?key=${config.gemini.apiKey}`;

      const body = JSON.stringify({
        contents: [
          {
            parts: [{ text: prompt }]
          }
        ],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1000
        }
      });

      fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body
      }).then(async response => {
        const data = await response.json();
        
        if (data.error) {
          console.error('Gemini API error response:', data.error);
          throw new Error(data.error.message || JSON.stringify(data.error));
        }
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        return data;
      }).then((data: any) => {
        const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        
        if (!content) {
          throw new Error('No content in Gemini response');
        }

        // Clean markdown code blocks
        let cleanText = content.trim();
        if (cleanText.startsWith('```json')) {
          cleanText = cleanText.replace(/^```json\n/, '').replace(/\n```$/, '');
        } else if (cleanText.startsWith('```')) {
          cleanText = cleanText.replace(/^```\n/, '').replace(/\n```$/, '');
        }

        // Simulate streaming by emitting partial responses with delays
        this.simulateStreaming(cleanText, observer);
        
      }).catch(error => {
        console.error('Gemini API error:', error);
        observer.error(error);
      });
    });
  }

  override generateHint(
    sourceText: string,
    userInput: string,
    previousHints: string[],
    context: ExerciseContext,
    config: any
  ): Observable<string> {
    return new Observable(observer => {
      const prompt = this.promptService.buildHintPrompt(sourceText, userInput, previousHints, context, context.fullContext);
      const messages: AIMessage[] = [
        { role: 'system', content: 'You are a helpful English language teacher providing hints to students. Give ONE specific, actionable hint.' },
        { role: 'user', content: prompt }
      ];

      this.generateText({ messages, temperature: 0.7, maxTokens: 150 }, config).subscribe({
        next: (content) => {
          observer.next(content.trim());
          observer.complete();
        },
        error: (error) => observer.error(error)
      });
    });
  }

  private parseResponse(content: string): AIResponse {
    try {
      let cleanText = content.trim();
      if (cleanText.startsWith('```json')) {
        cleanText = cleanText.replace(/^```json\n/, '').replace(/\n```$/, '');
      } else if (cleanText.startsWith('```')) {
        cleanText = cleanText.replace(/^```\n/, '').replace(/\n```$/, '');
      }

      const jsonMatch = cleanText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          accuracyScore: parsed.accuracyScore || 0,
          feedback: parsed.feedback || [],
          overallComment: ''
        };
      }
      throw new Error('Invalid response format');
    } catch (error) {
      console.error('Failed to parse AI response:', error);
      return {
        accuracyScore: 50,
        feedback: [],
        overallComment: ''
      };
    }
  }

  private simulateStreaming(fullText: string, observer: any): void {
    try {
      const fullResponse = this.parseResponse(fullText);
      
      if (fullResponse.accuracyScore) {
        observer.next({
          type: 'score',
          data: { accuracyScore: fullResponse.accuracyScore, feedback: [], overallComment: '' }
        });
      }

      if (fullResponse.feedback && fullResponse.feedback.length > 0) {
        fullResponse.feedback.forEach((item, index) => {
          setTimeout(() => {
            observer.next({ type: 'feedback', feedbackItem: item });
          }, index * 200);
        });
      }

      const completeDelay = (fullResponse.feedback?.length || 0) * 200 + 100;
      setTimeout(() => {
        observer.next({ type: 'complete', data: fullResponse });
        observer.complete();
      }, completeDelay);

    } catch (error) {
      console.error('Failed to simulate streaming:', error);
      observer.error(error);
    }
  }
}
