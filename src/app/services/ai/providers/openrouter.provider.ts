import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { BaseAIProvider, AIRequest, AIMessage } from '../base-ai-provider';
import { AIResponse, AIStreamChunk, ExerciseContext } from '../../../models/ai.model';
import { PromptService } from '../prompt.service';

@Injectable({
  providedIn: 'root'
})
export class OpenRouterProvider extends BaseAIProvider {
  private promptService = inject(PromptService);

  get name(): string {
    return 'openrouter';
  }

  isConfigured(config: any): boolean {
    return !!(config?.openrouter?.apiKey && config?.openrouter?.modelName);
  }

  generateText(request: AIRequest, config: any): Observable<string> {
    return new Observable(observer => {
      const url = 'https://openrouter.ai/api/v1/chat/completions';
      
      const body = {
        model: config.openrouter.modelName,
        messages: request.messages,
        temperature: request.temperature ?? 0.7,
        stream: false
      };

      const headers: Record<string, string> = {
        'Authorization': `Bearer ${config.openrouter.apiKey}`,
        'Content-Type': 'application/json'
      };

      // Add optional headers for usage tracking
      if (config.openrouter.siteUrl) {
        headers['HTTP-Referer'] = config.openrouter.siteUrl;
      }
      if (config.openrouter.siteName) {
        headers['X-Title'] = config.openrouter.siteName;
      }

      fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body)
      })
        .then(async response => {
          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            const error: any = new Error(errorData.error?.message || `HTTP error! status: ${response.status}`);
            error.status = response.status;
            error.statusText = response.statusText;
            throw error;
          }
          return response.json();
        })
        .then(data => {
          const content = data.choices?.[0]?.message?.content || '';
          observer.next(content);
          observer.complete();
        })
        .catch(error => {
          const errorMessage = this.handleError(error);
          console.error('[OpenRouter] Error:', error);
          observer.error(new Error(errorMessage));
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
      const prompt = this.promptService.buildAnalysisPrompt(
        userInput,
        sourceText,
        context,
        context.fullContext,
        context.translatedContext
      );
      
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
      const prompt = this.promptService.buildAnalysisPrompt(
        userInput,
        sourceText,
        context,
        context.fullContext,
        context.translatedContext
      );
      
      const url = 'https://openrouter.ai/api/v1/chat/completions';
      
      const body = {
        model: config.openrouter.modelName,
        messages: [
          { role: 'system', content: this.promptService.buildSystemPrompt() },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        stream: true
      };

      const headers: Record<string, string> = {
        'Authorization': `Bearer ${config.openrouter.apiKey}`,
        'Content-Type': 'application/json'
      };

      if (config.openrouter.siteUrl) {
        headers['HTTP-Referer'] = config.openrouter.siteUrl;
      }
      if (config.openrouter.siteName) {
        headers['X-Title'] = config.openrouter.siteName;
      }

      // Initialize state for tracking emitted chunks
      const state = {
        lastScore: -1,
        emittedFeedbackCount: 0
      };
      let buffer = '';

      fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body)
      })
        .then(async response => {
          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            const error: any = new Error(errorData.error?.message || `HTTP error! status: ${response.status}`);
            error.status = response.status;
            error.statusText = response.statusText;
            throw error;
          }
          return response;
        })
        .then(response => {
          const reader = response.body?.getReader();
          if (!reader) {
            throw new Error('No response body reader available');
          }

          const decoder = new TextDecoder();

          const processStream = async (): Promise<void> => {
            try {
              let textBuffer = '';
              
              while (true) {
                const { done, value } = await reader.read();
                
                if (done) {
                  // Emit complete chunk with full parsed response
                  const fullResponse = this.parseResponse(buffer);
                  observer.next({ type: 'complete', data: fullResponse });
                  observer.complete();
                  break;
                }

                const chunk = decoder.decode(value, { stream: true });
                textBuffer += chunk;
                
                // Split by both newlines and 'data:' prefix to handle concatenated chunks
                const lines = textBuffer.split(/\n|(?=data:)/);
                
                // Keep the last incomplete line in the buffer
                textBuffer = lines.pop() || '';

                for (const line of lines) {
                  const trimmedLine = line.trim();
                  if (trimmedLine.startsWith('data: ')) {
                    const data = trimmedLine.slice(6);
                    
                    if (data === '[DONE]') {
                      continue;
                    }

                    try {
                      const parsed = JSON.parse(data);
                      const content = parsed.choices?.[0]?.delta?.content || '';
                      
                      if (content) {
                        buffer += content;
                        // Emit partial responses as content accumulates
                        this.emitPartialResponse(buffer, observer, state);
                      }
                    } catch (e) {
                      // Skip invalid JSON chunks
                      continue;
                    }
                  }
                }
              }
            } catch (error) {
              const errorMessage = this.handleError(error);
              console.error('[OpenRouter] Streaming error:', error);
              observer.error(new Error(errorMessage));
            }
          };

          processStream();
        })
        .catch(error => {
          const errorMessage = this.handleError(error);
          console.error('[OpenRouter] Error:', error);
          observer.error(new Error(errorMessage));
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
      const prompt = this.promptService.buildHintPrompt(
        sourceText,
        userInput,
        previousHints,
        context,
        context.fullContext
      );
      
      const messages: AIMessage[] = [
        { 
          role: 'system', 
          content: 'You are a helpful English language teacher providing hints to students. Give ONE specific, actionable hint.' 
        },
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
      // Strip markdown code blocks
      let cleanText = content.trim();
      if (cleanText.startsWith('```json')) {
        cleanText = cleanText.replace(/^```json\n/, '').replace(/\n```$/, '');
      } else if (cleanText.startsWith('```')) {
        cleanText = cleanText.replace(/^```\n/, '').replace(/\n```$/, '');
      }

      // Extract JSON object using regex
      const jsonMatch = cleanText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          accuracyScore: parsed.accuracyScore || 0,
          feedback: parsed.feedback || [],
          overallComment: parsed.overallComment || ''
        };
      }
      throw new Error('Invalid response format - no JSON object found');
    } catch (error) {
      console.error('[OpenRouter] Failed to parse AI response:', error);
      // Return default response with score 50
      return {
        accuracyScore: 50,
        feedback: [],
        overallComment: ''
      };
    }
  }

  private emitPartialResponse(buffer: string, observer: any, state: { lastScore: number; emittedFeedbackCount: number }): void {
    // Extract and emit accuracy score if found and not already emitted
    const scoreMatch = buffer.match(/"accuracyScore"\s*:\s*(\d+)/);
    if (scoreMatch) {
      const score = parseInt(scoreMatch[1], 10);
      if (score !== state.lastScore) {
        state.lastScore = score;
        observer.next({
          type: 'score',
          data: { accuracyScore: score, feedback: [], overallComment: '' }
        });
      }
    }

    // Extract feedback array section from buffer
    const feedbackMatch = buffer.match(/"feedback"\s*:\s*\[([\s\S]*?)(?:\]|$)/);
    if (feedbackMatch) {
      const feedbackSection = feedbackMatch[1];
      
      // Parse individual complete feedback objects
      const feedbackObjectRegex = /\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g;
      const feedbackObjects = feedbackSection.match(feedbackObjectRegex) || [];
      
      // Emit only new feedback items
      for (let i = state.emittedFeedbackCount; i < feedbackObjects.length; i++) {
        try {
          const feedbackItem = JSON.parse(feedbackObjects[i]);
          observer.next({
            type: 'feedback',
            feedbackItem
          });
          state.emittedFeedbackCount++;
        } catch (e) {
          // Skip invalid feedback items
          continue;
        }
      }
    }
  }

  private handleError(error: any): string {
    // Log all errors to console with full details for debugging
    console.error('[OpenRouter] Error details:', error);

    // Check for HTTP status errors
    if (error.status) {
      switch (error.status) {
        case 401:
          return 'Invalid API key. Please check your OpenRouter configuration.';
        case 429:
          return 'Rate limit exceeded. Please try again in a moment.';
        case 500:
        case 502:
        case 503:
          return 'Service temporarily unavailable. Please try again later.';
        default:
          return `API error: ${error.statusText || 'Unknown error'}`;
      }
    }

    // Check for network errors
    if (error instanceof TypeError && error.message.includes('fetch')) {
      return 'Network error, please check your connection.';
    }

    // Generic error
    return 'An unexpected error occurred. Please try again.';
  }
}
