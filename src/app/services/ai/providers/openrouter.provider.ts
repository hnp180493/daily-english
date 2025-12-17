import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { BaseAIProvider, AIRequest, AIMessage } from '../base-ai-provider';
import { AIResponse, AIStreamChunk, ExerciseContext } from '../../../models/ai.model';
import { PromptService } from '../prompt.service';
import { SettingsService } from '../../settings.service';

@Injectable({
  providedIn: 'root'
})
export class OpenRouterProvider extends BaseAIProvider {
  private promptService = inject(PromptService);
  private settingsService = inject(SettingsService);

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
            let errorData: any = {};
            try {
              errorData = await response.json();
            } catch (e) {
              // If response is not JSON, try to get text
              try {
                const errorText = await response.text();
                errorData = { error: { message: errorText } };
              } catch (textError) {
                errorData = {};
              }
            }
            
            // Extract detailed error message
            const errorMsg = errorData.error?.message 
              || errorData.message 
              || errorData.error 
              || `HTTP ${response.status}: ${response.statusText}`;
            
            const error: any = new Error(errorMsg);
            error.status = response.status;
            error.statusText = response.statusText;
            error.details = errorData;
            
            console.error('[OpenRouter] API Error Response:', errorData);
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
          const errorMessage = this.handleError(error, config);
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
      const translateToVietnamese = this.settingsService.getSettings().translateFeedbackToVietnamese;
      const prompt = this.promptService.buildAnalysisPrompt(
        userInput,
        sourceText,
        context,
        context.fullContext,
        context.translatedContext,
        translateToVietnamese
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
      const translateToVietnamese = this.settingsService.getSettings().translateFeedbackToVietnamese;
      const prompt = this.promptService.buildAnalysisPrompt(
        userInput,
        sourceText,
        context,
        context.fullContext,
        context.translatedContext,
        translateToVietnamese
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

      const state = this.createStreamingState();
      let buffer = '';

      fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body)
      })
        .then(async response => {
          if (!response.ok) {
            let errorData: any = {};
            try {
              errorData = await response.json();
            } catch (e) {
              // If response is not JSON, try to get text
              try {
                const errorText = await response.text();
                errorData = { error: { message: errorText } };
              } catch (textError) {
                errorData = {};
              }
            }
            
            // Extract detailed error message
            const errorMsg = errorData.error?.message 
              || errorData.message 
              || errorData.error 
              || `HTTP ${response.status}: ${response.statusText}`;
            
            const error: any = new Error(errorMsg);
            error.status = response.status;
            error.statusText = response.statusText;
            error.details = errorData;
            
            console.error('[OpenRouter] API Error Response:', errorData);
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
              const errorMessage = this.handleError(error, config);
              console.error('[OpenRouter] Streaming error:', error);
              observer.error(new Error(errorMessage));
            }
          };

          processStream();
        })
        .catch(error => {
          const errorMessage = this.handleError(error, config);
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
      const translateToVietnamese = this.settingsService.getSettings().translateFeedbackToVietnamese;
      const prompt = this.promptService.buildHintPrompt(
        sourceText,
        userInput,
        previousHints,
        context,
        context.fullContext,
        translateToVietnamese
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
      return this.parseResponseContent(content);
    } catch (error) {
      console.error('[OpenRouter] Failed to parse AI response:', error);
      console.error('[OpenRouter] Content was:', content);
      return { accuracyScore: 50, feedback: [], overallComment: '' };
    }
  }

  private handleError(error: any, config?: any): string {
    // Log all errors to console with full details for debugging
    console.error('[OpenRouter] Error details:', error);
    console.error('[OpenRouter] Error message:', error.message);
    console.error('[OpenRouter] Error stack:', error.stack);

    // Extract the actual error message from the error object
    const errorMessage = error.message || '';
    const modelInfo = config?.openrouter?.modelName ? ` (Model: ${config.openrouter.modelName})` : '';

    // Check for HTTP status errors
    if (error.status) {
      switch (error.status) {
        case 400:
          return `Bad Request: ${errorMessage || 'Invalid request parameters'}${modelInfo}`;
        case 401:
          return `Authentication Failed: ${errorMessage || 'Invalid API key. Please check your OpenRouter configuration.'}${modelInfo}`;
        case 402:
          return `Payment Required: ${errorMessage || 'Insufficient credits. Please add credits to your OpenRouter account.'}${modelInfo}`;
        case 403:
          return `Forbidden: ${errorMessage || 'Access denied. Check your API key permissions.'}${modelInfo}`;
        case 404:
          return `Model Not Found: ${errorMessage || 'The specified model does not exist or is not available.'}${modelInfo}`;
        case 429:
          return `Rate Limit Exceeded: ${errorMessage || 'free-models-per-day. Add 10 credits to unlock 1000 free model requests per day'}${modelInfo}`;
        case 500:
        case 502:
        case 503:
          return `Service Error: ${errorMessage || 'OpenRouter service temporarily unavailable. Please try again later.'}${modelInfo}`;
        default:
          return `API Error (${error.status}): ${errorMessage || error.statusText || 'Unknown error'}${modelInfo}`;
      }
    }

    // Check for network errors
    if (error instanceof TypeError && error.message.includes('fetch')) {
      return `Network Error: ${errorMessage || 'Unable to connect. Please check your internet connection.'}${modelInfo}`;
    }

    // Return the actual error message if available
    if (errorMessage) {
      return `Error: ${errorMessage}${modelInfo}`;
    }

    // Generic error
    return `An unexpected error occurred. Please check the console for details.${modelInfo}`;
  }
}
