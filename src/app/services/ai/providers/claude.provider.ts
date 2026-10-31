import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { BaseAIProvider, AIRequest, AIMessage } from '../base-ai-provider';
import { AIResponse, AIStreamChunk, ExerciseContext } from '../../../models/ai.model';
import { PromptService } from '../prompt.service';
import { SettingsService } from '../../settings.service';

/**
 * Anthropic Claude provider — calls the Messages API directly from the browser.
 *
 * CORS: Anthropic gates direct browser calls behind the `anthropic-dangerous-direct-browser-access`
 * opt-in header. This is acceptable here because the project is FE-only and
 * uses a user-supplied API key pattern (the key never leaves the user's browser
 * except to api.anthropic.com).
 *
 * Differences from OpenAI/OpenRouter:
 *   - `system` is a TOP-LEVEL field, NOT a message in the messages array.
 *   - `max_tokens` is REQUIRED.
 *   - Response shape: `content: [{type: 'text', text: '...'}, ...]`.
 *   - Streaming uses Anthropic's own event types (`content_block_delta`).
 *   - Newer models (Opus 4.7+, Sonnet/Haiku 5+) reject non-default `temperature` with HTTP 400.
 *
 * Audio: Claude does not accept audio input via the chat API; `supportsAudioInput`
 * stays `false` (default), so pronunciation falls back to Tier 1 Web Speech.
 */
@Injectable({ providedIn: 'root' })
export class ClaudeProvider extends BaseAIProvider {
  private promptService = inject(PromptService);
  private settingsService = inject(SettingsService);

  private readonly API_URL = 'https://api.anthropic.com/v1/messages';
  private readonly API_VERSION = '2023-06-01';

  get name(): string {
    return 'anthropic';
  }

  isConfigured(config: any): boolean {
    return !!(config?.anthropic?.apiKey && config?.anthropic?.modelName);
  }

  generateText(request: AIRequest, config: any): Observable<string> {
    return new Observable((observer) => {
      const controller = new AbortController();
      const { systemContent, userMessages } = this.splitSystemAndMessages(request.messages);
      const model = config.anthropic.modelName || 'claude-sonnet-4-6';

      const body: Record<string, unknown> = {
        model,
        max_tokens: request.maxTokens ?? 1024,
        messages: userMessages,
      };
      if (this.supportsTemperature(model)) body['temperature'] = request.temperature ?? 0.7;
      if (systemContent) body['system'] = systemContent;

      fetch(this.API_URL, {
        method: 'POST',
        headers: this.buildHeaders(config),
        body: JSON.stringify(body),
        signal: controller.signal,
      })
        .then(async (response) => {
          const data = await response.json();
          if (data.error) {
            console.error('Anthropic API error response:', data.error);
            throw new Error(data.error.message || JSON.stringify(data.error));
          }
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          return data;
        })
        .then((data) => {
          const text = this.extractText(data);
          observer.next(text);
          observer.complete();
        })
        .catch((error) => {
          if (this.isAbortError(error, controller.signal)) return;
          console.error('[Claude] Error:', error);
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
      { role: 'user', content: prompt },
    ];

    // map() turns a parse failure into an error notification (no fake score)
    return this.generateText({ messages, temperature: 0.7, maxTokens: 1200 }, config).pipe(
      map((content) => this.parseResponse(content))
    );
  }

  override analyzeTextStream(
    userInput: string,
    sourceText: string,
    context: ExerciseContext,
    config: any
  ): Observable<AIStreamChunk> {
    return new Observable((observer) => {
      const controller = new AbortController();
      const state = this.createStreamingState();
      const translateToVietnamese = this.settingsService.getSettings().translateFeedbackToVietnamese;
      const prompt = this.promptService.buildAnalysisPrompt(
        userInput,
        sourceText,
        context,
        context.fullContext,
        context.translatedContext,
        translateToVietnamese
      );
      const model = config.anthropic.modelName || 'claude-sonnet-4-6';

      const requestBody: Record<string, unknown> = {
        model,
        max_tokens: 1200,
        stream: true,
        system: this.promptService.buildSystemPrompt(),
        messages: [{ role: 'user', content: prompt }],
      };
      if (this.supportsTemperature(model)) requestBody['temperature'] = 0.7;
      const body = JSON.stringify(requestBody);

      fetch(this.API_URL, {
        method: 'POST',
        headers: this.buildHeaders(config),
        body,
        signal: controller.signal,
      })
        .then(async (response) => {
          if (!response.ok) {
            let errorMessage = `HTTP error! status: ${response.status}`;
            try {
              const errorData = await response.json();
              if (errorData.error) {
                errorMessage = errorData.error.message || JSON.stringify(errorData.error);
              }
            } catch {
              /* ignore */
            }
            throw new Error(errorMessage);
          }

          const reader = response.body?.getReader();
          if (!reader) throw new Error('No response body reader available');
          const decoder = new TextDecoder();
          let buffer = '';
          let textBuffer = '';
          let stopReason: string | undefined;

          const handleEvent = (evt: string) => {
            const dataLine = evt.split('\n').find((l) => l.startsWith('data: '));
            if (!dataLine) return;
            const data = dataLine.slice(6).trim();
            if (!data || data === '[DONE]') return;
            let parsed: any;
            try {
              parsed = JSON.parse(data);
            } catch {
              return; // Incomplete/invalid event — skip
            }
            // `event: error` (e.g. overloaded_error) arrives mid-stream with HTTP 200: fail the stream
            if (parsed.type === 'error') {
              throw new Error(parsed.error?.message || 'Claude trả về lỗi trong lúc trả lời. Vui lòng thử lại.');
            }
            if (parsed.type === 'message_delta' && parsed.delta?.stop_reason) {
              stopReason = parsed.delta.stop_reason;
            }
            // Text arrives in content_block_delta events.
            if (parsed.type === 'content_block_delta' && parsed.delta?.type === 'text_delta') {
              const chunk = parsed.delta.text || '';
              if (chunk) {
                textBuffer += chunk;
                this.emitPartialResponse(textBuffer, observer, state);
              }
            }
          };

          while (true) {
            const { done, value } = await reader.read();
            if (done) {
              buffer += decoder.decode();
              if (buffer.trim()) handleEvent(buffer);
              this.finishAnalysisStream(
                textBuffer,
                observer,
                'Claude',
                stopReason === 'refusal' ? 'Claude từ chối trả lời yêu cầu này. Hãy thử lại với nội dung khác.' : undefined
              );
              break;
            }

            buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, '\n');
            // Anthropic sends SSE: each event is `event: <type>\ndata: <json>\n\n`
            const events = buffer.split('\n\n');
            buffer = events.pop() || ''; // last fragment may be incomplete

            for (const evt of events) {
              handleEvent(evt);
            }
          }
        })
        .catch((error) => {
          if (this.isAbortError(error, controller.signal)) return;
          console.error('[Claude] Streaming error:', error);
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
    const prompt = this.promptService.buildHintPrompt(
      sourceText,
      userInput,
      previousHints,
      context,
      context.fullContext,
      translateToVietnamese
    );
    const messages: AIMessage[] = [
      { role: 'system', content: 'You are a helpful English language teacher providing hints to students. Give ONE specific, actionable hint.' },
      { role: 'user', content: prompt },
    ];

    return this.generateText({ messages, temperature: 0.7, maxTokens: 200 }, config).pipe(
      map((content) => content.trim())
    );
  }

  // -----------------------------
  // Helpers
  // -----------------------------

  /**
   * Claude Opus 4.7+, Sonnet/Haiku 5+ and Fable/Mythos reject non-default sampling
   * params (HTTP 400). Older models (e.g. claude-sonnet-4-6, claude-3-5-sonnet-*) accept them.
   */
  private supportsTemperature(model: string): boolean {
    const name = (model || '').toLowerCase();
    if (/fable|mythos/.test(name)) return false;
    const match = name.match(/claude-(opus|sonnet|haiku)-(\d+)(?:-(\d{1,2}))?(?!\d)/);
    if (!match) return true; // legacy naming like claude-3-5-sonnet-20241022
    const major = parseInt(match[2], 10);
    const minor = match[3] ? parseInt(match[3], 10) : 0;
    if (match[1] === 'opus') {
      return major < 4 || (major === 4 && minor < 7);
    }
    return major < 5;
  }

  private buildHeaders(config: any): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'x-api-key': config.anthropic.apiKey,
      'anthropic-version': this.API_VERSION,
      // Required for direct browser calls — Anthropic gates browser CORS behind this opt-in.
      'anthropic-dangerous-direct-browser-access': 'true',
    };
  }

  /**
   * Anthropic's `messages` array does NOT accept role: 'system'. The system
   * prompt is a separate top-level `system` field. Collapse all system messages
   * into one string and strip them from the messages list.
   */
  private splitSystemAndMessages(messages: AIMessage[]): { systemContent: string; userMessages: AIMessage[] } {
    const systemParts: string[] = [];
    const userMessages: AIMessage[] = [];
    for (const m of messages) {
      if (m.role === 'system') {
        systemParts.push(m.content);
      } else {
        userMessages.push(m);
      }
    }
    return { systemContent: systemParts.join('\n\n'), userMessages };
  }

  private extractText(data: any): string {
    const blocks: any[] = data?.content || [];
    return blocks
      .filter((b) => b?.type === 'text')
      .map((b) => b?.text || '')
      .join('');
  }

  /** Throws on unparseable output — callers show an error instead of saving a made-up score. */
  private parseResponse(content: string): AIResponse {
    return this.parseAnalysisResponse(content, 'Claude');
  }
}
