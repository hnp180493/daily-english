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
      const controller = new AbortController();
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
        body: JSON.stringify(body),
        signal: controller.signal
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
          if (this.isAbortError(error, controller.signal)) return;
          console.error('[AzureOpenAI] Error:', error);
          observer.error(error);
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
    const prompt = this.promptService.buildAnalysisPrompt(userInput, sourceText, context, context.fullContext, context.translatedContext, translateToVietnamese);
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
      const controller = new AbortController();
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
        body,
        signal: controller.signal
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
        if (!reader) throw new Error('No response body reader available');
        const decoder = new TextDecoder();
        let buffer = '';
        // A network chunk can end in the middle of an SSE line: keep the partial line for the next read
        let pendingLine = '';

        const handleLine = (line: string) => {
          if (!line.startsWith('data: ')) return;
          const data = line.slice(6).trim();
          if (!data || data === '[DONE]') return;

          let parsed: any;
          try {
            parsed = JSON.parse(data);
          } catch (e) {
            return; // Not JSON — ignore
          }
          if (parsed.error) {
            throw new Error(parsed.error.message || JSON.stringify(parsed.error));
          }
          const content = parsed.choices?.[0]?.delta?.content || '';
          if (content) {
            buffer += content;
            this.emitPartialResponse(buffer, observer, state);
          }
        };

        while (true) {
          const { done, value } = await reader.read();

          if (done) {
            pendingLine += decoder.decode();
            if (pendingLine) handleLine(pendingLine);
            this.finishAnalysisStream(buffer, observer, 'AzureOpenAI');
            break;
          }

          pendingLine += decoder.decode(value, { stream: true });
          const lines = pendingLine.split('\n');
          pendingLine = lines.pop() || '';

          for (const line of lines) {
            handleLine(line);
          }
        }
      }).catch(error => {
        if (this.isAbortError(error, controller.signal)) return;
        console.error('Azure OpenAI streaming error:', error);
        observer.error(error);
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
    const prompt = this.promptService.buildHintPrompt(sourceText, userInput, previousHints, context, context.fullContext, translateToVietnamese);
    const messages: AIMessage[] = [
      { role: 'system', content: 'You are a helpful English language teacher providing hints to students. Give ONE specific, actionable hint.' },
      { role: 'user', content: prompt }
    ];

    return this.generateText({ messages, temperature: 0.7, maxTokens: 150 }, config).pipe(
      map(content => content.trim())
    );
  }

  /** Throws on unparseable output — callers show an error instead of saving a made-up score. */
  private parseResponse(content: string): AIResponse {
    return this.parseAnalysisResponse(content, 'AzureOpenAI');
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
    return new Observable<PronunciationFeedback>((observer) => {
      const controller = new AbortController();
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
            signal: controller.signal,
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
          if (this.isAbortError(error, controller.signal)) return;
          console.error('[AzureOpenAI] Pronunciation analysis error:', error);
          observer.error(error);
        });

      return () => controller.abort();
    });
  }
}
