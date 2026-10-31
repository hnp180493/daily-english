import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { BaseAIProvider, AIRequest, AIMessage } from '../base-ai-provider';
import { AIResponse, AIStreamChunk, ExerciseContext } from '../../../models/ai.model';
import { PronunciationContext, PronunciationFeedback } from '../../../models/pronunciation.model';
import { PromptService } from '../prompt.service';
import { SettingsService } from '../../settings.service';
import { ConfigService } from '../../config.service';
import { AudioConverterService } from '../../pronunciation/audio-converter.service';

@Injectable({
  providedIn: 'root'
})
export class OpenRouterProvider extends BaseAIProvider {
  private promptService = inject(PromptService);
  private settingsService = inject(SettingsService);
  private configService = inject(ConfigService);
  private audioConverter = inject(AudioConverterService);

  get name(): string {
    return 'openrouter';
  }

  isConfigured(config: any): boolean {
    return !!(config?.openrouter?.apiKey && config?.openrouter?.modelName);
  }

  generateText(request: AIRequest, config: any): Observable<string> {
    return new Observable(observer => {
      const controller = new AbortController();
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
        body: JSON.stringify(body),
        signal: controller.signal
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
          if (this.isAbortError(error, controller.signal)) return;
          const errorMessage = this.handleError(error, config);
          console.error('[OpenRouter] Error:', error);
          observer.error(new Error(errorMessage));
        });

      // Unsubscribing cancels the request
      return () => controller.abort();
    });
  }

  override analyzeText(
    userInput: string,
    sourceText: string,
    context: ExerciseContext,
    config: any
  ): Observable<AIResponse> {
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

    // map() turns a parse failure into an error notification (no fake score)
    return this.generateText({ messages, temperature: 0.7, maxTokens: 1000 }, config).pipe(
      map(content => this.parseResponse(content))
    );
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
      const controller = new AbortController();
      let buffer = '';

      fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal: controller.signal
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
                  // Always end the stream: complete chunk, or an error for empty/unparseable output
                  this.finishAnalysisStream(buffer, observer, 'OpenRouter');
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
              if (this.isAbortError(error, controller.signal)) return;
              const errorMessage = this.handleError(error, config);
              console.error('[OpenRouter] Streaming error:', error);
              observer.error(new Error(errorMessage));
            }
          };

          processStream();
        })
        .catch(error => {
          if (this.isAbortError(error, controller.signal)) return;
          const errorMessage = this.handleError(error, config);
          console.error('[OpenRouter] Error:', error);
          observer.error(new Error(errorMessage));
        });

      // Unsubscribing cancels the request and the stream read
      return () => controller.abort();
    });
  }

  override generateHint(
    sourceText: string,
    userInput: string,
    previousHints: string[],
    context: ExerciseContext,
    config: any
  ): Observable<string> {
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

    return this.generateText({ messages, temperature: 0.7, maxTokens: 150 }, config).pipe(
      map(content => content.trim())
    );
  }

  /** Throws on unparseable output — callers show an error instead of saving a made-up score. */
  private parseResponse(content: string): AIResponse {
    return this.parseAnalysisResponse(content, 'OpenRouter');
  }

  override supportsAudioInput(): boolean {
    const modelName = (this.configService.getConfig()?.openrouter?.modelName || '').toLowerCase();
    // OpenRouter routes to many providers — we trust models tagged 'audio' or 'gemini' to support audio input.
    return modelName.includes('audio') || modelName.includes('gemini');
  }

  override analyzePronunciation(
    audioBlob: Blob,
    context: PronunciationContext,
    config: any
  ): Observable<PronunciationFeedback> {
    return new Observable<PronunciationFeedback>((observer) => {
      const controller = new AbortController();
      const apiKey = config?.openrouter?.apiKey;
      const modelName = config?.openrouter?.modelName || '';
      if (!apiKey || !modelName) {
        observer.error(new Error('OpenRouter chưa được cấu hình.'));
        return;
      }
      const audioCapable = modelName.toLowerCase().includes('audio') || modelName.toLowerCase().includes('gemini');
      if (!audioCapable) {
        observer.error(
          new Error(
            `Model "${modelName}" không hỗ trợ audio qua OpenRouter. Chọn model có "audio" (vd. openai/gpt-4o-audio-preview) hoặc gemini.`
          )
        );
        return;
      }

      const prompt = this.promptService.buildPronunciationPrompt(context);

      this.audioConverter
        .toWav(audioBlob)
        .then(({ blob }) => this.audioConverter.blobToBase64(blob))
        .then((base64) => {
          const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          };
          if (config.openrouter.siteUrl) headers['HTTP-Referer'] = config.openrouter.siteUrl;
          if (config.openrouter.siteName) headers['X-Title'] = config.openrouter.siteName;

          return fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers,
            body: JSON.stringify({
              model: modelName,
              modalities: ['text'],
              messages: [
                {
                  role: 'user',
                  content: [
                    { type: 'text', text: prompt },
                    { type: 'input_audio', input_audio: { data: base64, format: 'wav' } },
                  ],
                },
              ],
              temperature: 0.3,
            }),
            signal: controller.signal,
          });
        })
        .then(async (response) => {
          const data = await response.json();
          if (data.error) throw new Error(data.error.message || JSON.stringify(data.error));
          if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
          return data;
        })
        .then((data) => {
          const content = data.choices?.[0]?.message?.content || '';
          if (!content) throw new Error('OpenRouter trả về phản hồi rỗng cho audio.');
          const parsed = this.parsePronunciationResponse(content);
          const filtered = this.filterPronunciationFeedback(parsed, context.expectedText);
          observer.next(filtered);
          observer.complete();
        })
        .catch((error) => {
          if (this.isAbortError(error, controller.signal)) return;
          console.error('[OpenRouter] Pronunciation analysis error:', error);
          observer.error(error);
        });

      return () => controller.abort();
    });
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
