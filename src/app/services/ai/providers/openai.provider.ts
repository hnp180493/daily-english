import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { BaseAIProvider, AIRequest, AIMessage } from '../base-ai-provider';
import { AIResponse, AIStreamChunk, ExerciseContext } from '../../../models/ai.model';
import { PromptService } from '../prompt.service';
import { SettingsService } from '../../settings.service';

@Injectable({
  providedIn: 'root'
})
export class OpenAIProvider extends BaseAIProvider {
  private promptService = inject(PromptService);
  private settingsService = inject(SettingsService);

  get name(): string {
    return 'openai';
  }

  isConfigured(config: any): boolean {
    return !!(config?.openai?.apiKey && config?.openai?.modelName);
  }

  private getTemperature(modelName: string, defaultTemp: number = 0.7): number | undefined {
    // O1 series models (GPT-5) only support temperature = 1
    if (modelName.includes('o1') || modelName.includes('gpt-5')) {
      return 1;
    }
    // For other models, use the specified temperature
    return defaultTemp;
  }

  generateText(request: AIRequest, config: any): Observable<string> {
    return new Observable(observer => {
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.openai.apiKey}`
      };

      const modelName = config.openai.modelName || 'gpt-4';
      const temperature = this.getTemperature(modelName, request.temperature ?? 0.7);

      const body = {
        model: modelName,
        messages: request.messages,
        temperature,
        seed: 12345, // Fixed seed for consistent responses
        // max_tokens: request.maxTokens ?? 800
      };

      fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers,
        body: JSON.stringify(body)
      })
        .then(async response => {
          const data = await response.json();
          
          // Check for error in response (works for both 200 and error status codes)
          if (data.error) {
            console.error('OpenAI API error response:', data.error);
            throw new Error(data.error.message || JSON.stringify(data.error));
          }
          
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          
          return data;
        })
        .then(data => {
          const content = data.choices?.[0]?.message?.content || '';
          observer.next(content);
          observer.complete();
        })
        .catch(error => {
          console.error('[OpenAI] Error:', error);
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
      const translateToVietnamese = this.settingsService.getSettings().translateFeedbackToVietnamese;
      const prompt = this.promptService.buildAnalysisPrompt(userInput, sourceText, context, context.fullContext, context.translatedContext, translateToVietnamese);
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
      const state = this.createStreamingState();
      const translateToVietnamese = this.settingsService.getSettings().translateFeedbackToVietnamese;
      const prompt = this.promptService.buildAnalysisPrompt(userInput, sourceText, context, context.fullContext, context.translatedContext, translateToVietnamese);
      const modelName = config.openai.modelName || 'gpt-4';
      const temperature = this.getTemperature(modelName, 0.7);

      const body = JSON.stringify({
        model: modelName,
        messages: [
          { role: 'system', content: this.promptService.buildSystemPrompt() },
          { role: 'user', content: prompt }
        ],
        temperature,
        seed: 12345,
        stream: true
      });

      fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.openai.apiKey}`
        },
        body
      }).then(async response => {
        if (!response.ok) {
          let errorMessage = `HTTP error! status: ${response.status}`;
          try {
            const errorData = await response.json();
            if (errorData.error) {
              console.error('OpenAI API error response:', errorData.error);
              errorMessage = errorData.error.message || JSON.stringify(errorData.error);
            }
          } catch (e) {
            // If can't parse error, use status
          }
          throw new Error(errorMessage);
        }

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader!.read();
          
          if (done) {
            if (buffer) {
              const parsed = this.parseResponse(buffer);
              observer.next({ type: 'complete', data: parsed });
            }
            observer.complete();
            break;
          }

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              
              if (data === '[DONE]') continue;

              try {
                const parsed = JSON.parse(data);
                const content = parsed.choices?.[0]?.delta?.content || '';
                
                if (content) {
                  buffer += content;
                  this.emitPartialResponse(buffer, observer, state);
                }
              } catch (e) {
                // Ignore JSON parse errors for incomplete chunks
              }
            }
          }
        }
      }).catch(error => {
        console.error('OpenAI streaming error:', error);
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
      const translateToVietnamese = this.settingsService.getSettings().translateFeedbackToVietnamese;
      const prompt = this.promptService.buildHintPrompt(sourceText, userInput, previousHints, context, context.fullContext, translateToVietnamese);
      const messages: AIMessage[] = [
        { role: 'system', content: 'You are a helpful English language teacher providing hints to students. Give ONE specific, actionable hint.' },
        { role: 'user', content: prompt }
      ];

      this.generateText({ messages, temperature: 0.7 }, config).subscribe({
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
      console.error('[OpenAI] Failed to parse AI response:', error);
      return { accuracyScore: 50, feedback: [], overallComment: '' };
    }
  }
}
