import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
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
      const { systemContent, userMessages } = this.splitSystemAndMessages(request.messages);

      const body: Record<string, unknown> = {
        model: config.anthropic.modelName || 'claude-sonnet-4-6',
        max_tokens: request.maxTokens ?? 1024,
        temperature: request.temperature ?? 0.7,
        messages: userMessages,
      };
      if (systemContent) body['system'] = systemContent;

      fetch(this.API_URL, {
        method: 'POST',
        headers: this.buildHeaders(config),
        body: JSON.stringify(body),
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
          console.error('[Claude] Error:', error);
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
    return new Observable((observer) => {
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

      this.generateText({ messages, temperature: 0.7, maxTokens: 1200 }, config).subscribe({
        next: (content) => {
          observer.next(this.parseResponse(content));
          observer.complete();
        },
        error: (error) => observer.error(error),
      });
    });
  }

  override analyzeTextStream(
    userInput: string,
    sourceText: string,
    context: ExerciseContext,
    config: any
  ): Observable<AIStreamChunk> {
    return new Observable((observer) => {
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

      const body = JSON.stringify({
        model: config.anthropic.modelName || 'claude-sonnet-4-6',
        max_tokens: 1200,
        temperature: 0.7,
        stream: true,
        system: this.promptService.buildSystemPrompt(),
        messages: [{ role: 'user', content: prompt }],
      });

      fetch(this.API_URL, {
        method: 'POST',
        headers: this.buildHeaders(config),
        body,
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

          while (true) {
            const { done, value } = await reader.read();
            if (done) {
              if (textBuffer) {
                observer.next({ type: 'complete', data: this.parseResponse(textBuffer) });
              }
              observer.complete();
              break;
            }

            buffer += decoder.decode(value, { stream: true });
            // Anthropic sends SSE: each event is `event: <type>\ndata: <json>\n\n`
            const events = buffer.split('\n\n');
            buffer = events.pop() || ''; // last fragment may be incomplete

            for (const evt of events) {
              const dataLine = evt.split('\n').find((l) => l.startsWith('data: '));
              if (!dataLine) continue;
              const data = dataLine.slice(6).trim();
              if (!data || data === '[DONE]') continue;
              try {
                const parsed = JSON.parse(data);
                // We only care about content_block_delta events that carry text.
                if (parsed.type === 'content_block_delta' && parsed.delta?.type === 'text_delta') {
                  const chunk = parsed.delta.text || '';
                  if (chunk) {
                    textBuffer += chunk;
                    this.emitPartialResponse(textBuffer, observer, state);
                  }
                }
              } catch {
                // Incomplete chunk — skip
              }
            }
          }
        })
        .catch((error) => {
          console.error('[Claude] Streaming error:', error);
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
    return new Observable((observer) => {
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

      this.generateText({ messages, temperature: 0.7, maxTokens: 200 }, config).subscribe({
        next: (content) => {
          observer.next(content.trim());
          observer.complete();
        },
        error: (error) => observer.error(error),
      });
    });
  }

  // -----------------------------
  // Helpers
  // -----------------------------

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

  private parseResponse(content: string): AIResponse {
    try {
      return this.parseResponseContent(content);
    } catch (error) {
      console.error('[Claude] Failed to parse AI response:', error);
      return { accuracyScore: 50, feedback: [], overallComment: '' };
    }
  }
}
