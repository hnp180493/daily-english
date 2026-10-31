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
export class OpenAIProvider extends BaseAIProvider {
  private promptService = inject(PromptService);
  private settingsService = inject(SettingsService);
  private configService = inject(ConfigService);
  private audioConverter = inject(AudioConverterService);

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
      const controller = new AbortController();
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
        body: JSON.stringify(body),
        signal: controller.signal
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
          if (this.isAbortError(error, controller.signal)) return;
          console.error('[OpenAI] Error:', error);
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
        body,
        signal: controller.signal
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
            this.finishAnalysisStream(buffer, observer, 'OpenAI');
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
        console.error('OpenAI streaming error:', error);
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

    return this.generateText({ messages, temperature: 0.7 }, config).pipe(
      map(content => content.trim())
    );
  }

  /** Throws on unparseable output — callers show an error instead of saving a made-up score. */
  private parseResponse(content: string): AIResponse {
    return this.parseAnalysisResponse(content, 'OpenAI');
  }

  override supportsAudioInput(): boolean {
    const modelName = (this.configService.getConfig()?.openai?.modelName || '').toLowerCase();
    // Heuristic: model must explicitly mention 'audio'. e.g. 'gpt-4o-audio-preview'.
    return modelName.includes('audio');
  }

  override analyzePronunciation(
    audioBlob: Blob,
    context: PronunciationContext,
    config: any
  ): Observable<PronunciationFeedback> {
    return new Observable<PronunciationFeedback>((observer) => {
      const controller = new AbortController();
      const apiKey = config?.openai?.apiKey;
      const modelName = config?.openai?.modelName || 'gpt-4o-audio-preview';
      if (!apiKey) {
        observer.error(new Error('OpenAI API key chưa được cấu hình.'));
        return;
      }
      if (!modelName.toLowerCase().includes('audio')) {
        observer.error(
          new Error(
            `Model "${modelName}" không hỗ trợ audio. Vào Profile → chọn model "gpt-4o-audio-preview" hoặc Gemini 2.5.`
          )
        );
        return;
      }

      const prompt = this.promptService.buildPronunciationPrompt(context);

      this.audioConverter
        .toWav(audioBlob)
        .then(({ blob }) => this.audioConverter.blobToBase64(blob))
        .then((base64) =>
          fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${apiKey}`,
            },
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
          if (!content) throw new Error('OpenAI trả về phản hồi rỗng cho audio.');
          const parsed = this.parsePronunciationResponse(content);
          const filtered = this.filterPronunciationFeedback(parsed, context.expectedText);
          observer.next(filtered);
          observer.complete();
        })
        .catch((error) => {
          if (this.isAbortError(error, controller.signal)) return;
          console.error('[OpenAI] Pronunciation analysis error:', error);
          observer.error(error);
        });

      return () => controller.abort();
    });
  }
}
