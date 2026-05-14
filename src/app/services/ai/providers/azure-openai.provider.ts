import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
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
export class AzureOpenAIProvider extends BaseAIProvider {
  private promptService = inject(PromptService);
  private settingsService = inject(SettingsService);
  private configService = inject(ConfigService);
  private audioConverter = inject(AudioConverterService);

  get name(): string {
    return 'azure';
  }

  isConfigured(config: any): boolean {
    return !!(
      config?.azure?.endpoint &&
      config?.azure?.apiKey &&
      config?.azure?.deploymentName
    );
  }

  generateText(request: AIRequest, config: any): Observable<string> {
    return new Observable(observer => {
      const headers = {
        'Content-Type': 'application/json',
        'api-key': config.azure.apiKey
      };

      const body = {
        messages: request.messages,
        temperature: request.temperature ?? 0.7,
        max_tokens: request.maxTokens ?? 800
      };

      const url = `${config.azure.endpoint}/openai/deployments/${config.azure.deploymentName}/chat/completions?api-version=2024-02-15-preview`;

      fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body)
      })
        .then(async response => {
          const data = await response.json();
          
          // Check for error in response (works for both 200 and error status codes)
          if (data.error) {
            console.error('Azure OpenAI API error response:', data.error);
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
          console.error('[AzureOpenAI] Error:', error);
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
      const url = `${config.azure.endpoint}/openai/deployments/${config.azure.deploymentName}/chat/completions?api-version=2024-02-15-preview`;

      const body = JSON.stringify({
        messages: [
          { role: 'system', content: this.promptService.buildSystemPrompt() },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 1000,
        stream: true
      });

      fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-key': config.azure.apiKey
        },
        body
      }).then(async response => {
        if (!response.ok) {
          let errorMessage = `HTTP error! status: ${response.status}`;
          try {
            const errorData = await response.json();
            if (errorData.error) {
              console.error('Azure OpenAI API error response:', errorData.error);
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
        console.error('Azure OpenAI streaming error:', error);
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
      console.error('[AzureOpenAI] Failed to parse AI response:', error);
      return { accuracyScore: 50, feedback: [], overallComment: '' };
    }
  }

  override supportsAudioInput(): boolean {
    const deployment = (this.configService.getConfig()?.azure?.deploymentName || '').toLowerCase();
    // Azure deployment name is user-defined; user must name a GPT-4o audio deployment with "audio" in the name to opt in.
    return deployment.includes('audio');
  }

  override analyzePronunciation(
    audioBlob: Blob,
    context: PronunciationContext,
    config: any
  ): Observable<PronunciationFeedback> {
    return new Observable((observer) => {
      const apiKey = config?.azure?.apiKey;
      const endpoint = config?.azure?.endpoint;
      const deployment = config?.azure?.deploymentName;
      if (!apiKey || !endpoint || !deployment) {
        observer.error(new Error('Azure OpenAI chưa được cấu hình đầy đủ.'));
        return;
      }
      if (!deployment.toLowerCase().includes('audio')) {
        observer.error(
          new Error(
            `Deployment "${deployment}" không phải audio deployment. Tạo deployment cho gpt-4o-audio-preview trên Azure và đặt tên có "audio".`
          )
        );
        return;
      }

      const prompt = this.promptService.buildPronunciationPrompt(context);
      const url = `${endpoint}/openai/deployments/${deployment}/chat/completions?api-version=2024-10-01-preview`;

      this.audioConverter
        .toWav(audioBlob)
        .then(({ blob }) => this.audioConverter.blobToBase64(blob))
        .then((base64) =>
          fetch(url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'api-key': apiKey,
            },
            body: JSON.stringify({
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
          })
        )
        .then(async (response) => {
          const data = await response.json();
          if (data.error) throw new Error(data.error.message || JSON.stringify(data.error));
          if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
          return data;
        })
        .then((data) => {
          const content = data.choices?.[0]?.message?.content || '';
          if (!content) throw new Error('Azure OpenAI trả về phản hồi rỗng cho audio.');
          const parsed = this.parsePronunciationResponse(content);
          const filtered = this.filterPronunciationFeedback(parsed, context.expectedText);
          observer.next(filtered);
          observer.complete();
        })
        .catch((error) => {
          console.error('[AzureOpenAI] Pronunciation analysis error:', error);
          observer.error(error);
        });
    });
  }
}
