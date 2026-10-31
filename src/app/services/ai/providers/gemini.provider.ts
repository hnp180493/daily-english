import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { BaseAIProvider, AIRequest, AIMessage } from '../base-ai-provider';
import { AIResponse, AIStreamChunk, ExerciseContext } from '../../../models/ai.model';
import { PronunciationContext, PronunciationFeedback } from '../../../models/pronunciation.model';
import { PromptService } from '../prompt.service';
import { SettingsService } from '../../settings.service';

@Injectable({
  providedIn: 'root'
})
export class GeminiProvider extends BaseAIProvider {
  private promptService = inject(PromptService);
  private settingsService = inject(SettingsService);

  get name(): string {
    return 'gemini';
  }

  isConfigured(config: any): boolean {
    return !!(config?.gemini?.apiKey && config?.gemini?.modelName);
  }

  generateText(request: AIRequest, config: any): Observable<string> {
    return new Observable(observer => {
      const controller = new AbortController();
      const modelName = config.gemini.modelName || 'gemini-pro';
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${config.gemini.apiKey}`;

      // Convert messages to Gemini format. System messages go to systemInstruction
      // (Gemini's contents only accept user/model turns).
      const systemText = request.messages
        .filter(m => m.role === 'system')
        .map(m => m.content)
        .join('\n\n');
      const prompt = request.messages
        .filter(m => m.role !== 'system')
        .map(m => m.content)
        .join('\n\n');

      const body: Record<string, unknown> = {
        contents: [
          {
            parts: [{ text: prompt }]
          }
        ],
        generationConfig: this.buildGenerationConfig(modelName, request.temperature ?? 0.7, request.maxTokens ?? 800)
      };
      if (systemText) {
        body['systemInstruction'] = { parts: [{ text: systemText }] };
      }

      fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal
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
          const content = this.extractText(data);
          if (!content) {
            // Blocked prompt / safety stop / thinking used the whole budget: fail loudly
            throw new Error(
              this.describeEmptyResponse(data.candidates?.[0]?.finishReason, data.promptFeedback?.blockReason)
            );
          }
          observer.next(content);
          observer.complete();
        })
        .catch(error => {
          if (this.isAbortError(error, controller.signal)) return;
          console.error('[Gemini] Error:', error);
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
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${config.gemini.modelName}:streamGenerateContent?alt=sse&key=${config.gemini.apiKey}`;

      const body = JSON.stringify({
        systemInstruction: {
          parts: [{ text: this.promptService.buildSystemPrompt() }]
        },
        contents: [
          {
            parts: [{ text: prompt }]
          }
        ],
        generationConfig: this.buildGenerationConfig(config.gemini.modelName || '', 0.7, 1000)
      });

      fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        signal: controller.signal
      }).then(async response => {
        if (!response.ok) {
          let errorMessage = `HTTP error! status: ${response.status}`;
          try {
            const errorData = await response.json();
            if (errorData.error) {
              console.error('Gemini API error response:', errorData.error);
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
        let finishReason: string | undefined;
        let blockReason: string | undefined;

        const handleLine = (line: string) => {
          if (!line.startsWith('data: ')) return;
          const data = line.slice(6).trim();
          if (!data) return;

          let parsed: any;
          try {
            parsed = JSON.parse(data);
          } catch (e) {
            return; // Not JSON — ignore
          }
          if (parsed.error) {
            throw new Error(parsed.error.message || JSON.stringify(parsed.error));
          }
          finishReason = parsed.candidates?.[0]?.finishReason || finishReason;
          blockReason = parsed.promptFeedback?.blockReason || blockReason;

          const content = this.extractText(parsed);
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
            this.finishAnalysisStream(buffer, observer, 'Gemini', this.describeEmptyResponse(finishReason, blockReason));
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
        console.error('Gemini streaming error:', error);
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
    return this.parseAnalysisResponse(content, 'Gemini');
  }

  /**
   * Gemini 2.5+ models "think" by default, and thinking tokens count against
   * maxOutputTokens — with a small limit the visible answer can come back empty.
   * 2.5 Flash/Flash-Lite can switch thinking off; 2.5 Pro can't (minimum budget),
   * so give it a small budget on top of the answer limit. Newer models get headroom.
   */
  private buildGenerationConfig(modelName: string, temperature: number, maxTokens: number): Record<string, unknown> {
    const generationConfig: Record<string, unknown> = { temperature, maxOutputTokens: maxTokens };
    const name = modelName.toLowerCase();
    const major = parseInt(name.match(/gemini-(\d+)/)?.[1] ?? '0', 10);

    if (/gemini-2\.5/.test(name)) {
      const thinkingBudget = name.includes('pro') ? 1024 : 0;
      generationConfig['thinkingConfig'] = { thinkingBudget };
      generationConfig['maxOutputTokens'] = maxTokens + thinkingBudget;
    } else if (major >= 3) {
      generationConfig['maxOutputTokens'] = maxTokens + 8192;
    }
    return generationConfig;
  }

  /** Join the visible text parts (skipping thought summaries, if any). */
  private extractText(data: any): string {
    const parts: any[] = data?.candidates?.[0]?.content?.parts || [];
    return parts
      .filter(p => !p?.thought)
      .map(p => p?.text || '')
      .join('');
  }

  private describeEmptyResponse(finishReason?: string, blockReason?: string): string {
    if (blockReason) {
      return `Gemini đã chặn yêu cầu này (${blockReason}). Hãy thử lại với nội dung khác.`;
    }
    if (finishReason === 'MAX_TOKENS') {
      return 'Gemini dùng hết giới hạn token trước khi trả lời. Vui lòng thử lại hoặc chọn model khác.';
    }
    if (finishReason && finishReason !== 'STOP') {
      return `Gemini không trả lời (lý do: ${finishReason}). Vui lòng thử lại hoặc chọn model khác.`;
    }
    return 'Gemini không trả về nội dung. Vui lòng thử lại hoặc chọn model khác.';
  }

  override supportsAudioInput(): boolean {
    return true;
  }

  override analyzePronunciation(
    audioBlob: Blob,
    context: PronunciationContext,
    config: any
  ): Observable<PronunciationFeedback> {
    return new Observable<PronunciationFeedback>(observer => {
      const controller = new AbortController();
      const modelName = config?.gemini?.modelName || 'gemini-2.5-flash';
      const apiKey = config?.gemini?.apiKey;

      if (!apiKey) {
        observer.error(new Error('Gemini API key chưa được cấu hình.'));
        return;
      }

      const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
      const prompt = this.promptService.buildPronunciationPrompt(context);
      const mimeType = audioBlob.type || 'audio/webm';

      this.blobToBase64(audioBlob)
        .then(base64Audio =>
          fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [
                {
                  parts: [
                    { text: prompt },
                    { inlineData: { mimeType, data: base64Audio } }
                  ]
                }
              ],
              generationConfig: {
                temperature: 0.3,
                maxOutputTokens: 2500,
                responseMimeType: 'application/json',
                // Disable Gemini 2.5 "thinking" budget — it eats output tokens and truncates JSON.
                // The pronunciation task is small enough that thinking doesn't add value.
                thinkingConfig: { thinkingBudget: 0 }
              }
            }),
            signal: controller.signal
          })
        )
        .then(async response => {
          const data = await response.json();
          if (data.error) {
            throw new Error(data.error.message || JSON.stringify(data.error));
          }
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          return data;
        })
        .then(data => {
          const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
          const finishReason = data.candidates?.[0]?.finishReason;
          if (!content) {
            throw new Error('Gemini trả về phản hồi rỗng cho audio.');
          }
          if (finishReason === 'MAX_TOKENS') {
            console.warn('[Gemini] Pronunciation response truncated (MAX_TOKENS). Attempting repair.');
          }
          const parsed = this.parsePronunciationResponse(content);
          const filtered = this.filterPronunciationFeedback(parsed, context.expectedText);
          observer.next(filtered);
          observer.complete();
        })
        .catch(error => {
          if (this.isAbortError(error, controller.signal)) return;
          console.error('[Gemini] Pronunciation analysis error:', error);
          observer.error(error);
        });

      return () => controller.abort();
    });
  }
}
