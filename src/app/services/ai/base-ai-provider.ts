import { Observable, Subscriber } from 'rxjs';
import { AIResponse, AIStreamChunk, ExerciseContext } from '../../models/ai.model';
import { FeedbackItem } from '../../models/exercise.model';

export interface AIProviderConfig {
  [key: string]: any;
}

export interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AIRequest {
  messages: AIMessage[];
  temperature?: number;
  maxTokens?: number;
}

export interface StreamingState {
  lastScore: number;
  emittedFeedbackCount: number;
}

/**
 * Base class for all AI providers
 * Supports both simple text generation and complex translation analysis
 */
export abstract class BaseAIProvider {
  abstract get name(): string;
  abstract isConfigured(config: any): boolean;

  // Core method: generate text from messages
  abstract generateText(request: AIRequest, config: any): Observable<string>;

  // Optional: Advanced methods for translation analysis
  // Providers can override these for custom implementations
  analyzeText(
    userInput: string,
    sourceText: string,
    context: ExerciseContext,
    config: any
  ): Observable<AIResponse> {
    throw new Error('analyzeText not implemented for this provider');
  }

  analyzeTextStream(
    userInput: string,
    sourceText: string,
    context: ExerciseContext,
    config: any
  ): Observable<AIStreamChunk> {
    throw new Error('analyzeTextStream not implemented for this provider');
  }

  generateHint(
    sourceText: string,
    userInput: string,
    previousHints: string[],
    context: ExerciseContext,
    config: any
  ): Observable<string> {
    throw new Error('generateHint not implemented for this provider');
  }

  /**
   * Emit partial response chunks during streaming.
   * Supports both JSONL format (new) and nested JSON format (legacy).
   */
  protected emitPartialResponse(
    buffer: string,
    observer: Subscriber<AIStreamChunk>,
    state: StreamingState
  ): void {
    // Clean LLM special tokens (Mistral, Llama, etc.)
    let cleanBuffer = this.stripLlmTokens(buffer);

    // Clean markdown code blocks
    if (cleanBuffer.startsWith('```json')) {
      cleanBuffer = cleanBuffer.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (cleanBuffer.startsWith('```')) {
      cleanBuffer = cleanBuffer.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    // Try JSONL format first (new streaming format)
    if (this.tryParseJsonl(cleanBuffer, observer, state)) {
      return;
    }

    // Fallback to legacy nested JSON format
    this.parseLegacyJson(cleanBuffer, observer, state);
  }

  /**
   * Strip LLM special tokens like <s>, </s>, <|im_start|>, etc.
   */
  private stripLlmTokens(text: string): string {
    return text
      .replace(/<s>/gi, '')
      .replace(/<\/s>/gi, '')
      .replace(/<\|im_start\|>/gi, '')
      .replace(/<\|im_end\|>/gi, '')
      .replace(/<\|endoftext\|>/gi, '')
      .replace(/<\|assistant\|>/gi, '')
      .replace(/<\|user\|>/gi, '')
      .replace(/<\|system\|>/gi, '')
      .trim();
  }

  /**
   * Parse JSONL format: each line is a separate JSON object.
   * Format:
   *   {"accuracyScore": 85}
   *   {"type": "tense", "suggestion": "...", "explanation": "..."}
   *   [END]
   */
  private tryParseJsonl(
    buffer: string,
    observer: Subscriber<AIStreamChunk>,
    state: StreamingState
  ): boolean {
    const lines = buffer.split('\n').filter(line => line.trim());
    
    // Check if this looks like JSONL format (first line should be score-only object)
    if (lines.length === 0) return false;
    
    const firstLine = lines[0].trim();
    // JSONL format starts with {"accuracyScore": ...} without feedback array
    if (!firstLine.match(/^\s*\{\s*"accuracyScore"\s*:\s*\d+\s*\}\s*$/)) {
      return false;
    }

    // Parse each complete line
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Skip [END] marker
      if (line === '[END]') continue;
      
      // Skip already processed lines
      if (i === 0 && state.lastScore !== -1) continue;
      if (i > 0 && i <= state.emittedFeedbackCount) continue;

      try {
        // Try to fix common JSON issues (unquoted string values)
        let fixedLine = line;
        // Fix unquoted type values like {"type": spelling, ...} -> {"type": "spelling", ...}
        fixedLine = fixedLine.replace(
          /"type"\s*:\s*([a-zA-Z]+)(\s*[,}])/g,
          '"type": "$1"$2'
        );
        
        const obj = JSON.parse(fixedLine);
        
        // Score object
        if ('accuracyScore' in obj && !('type' in obj)) {
          if (state.lastScore !== obj.accuracyScore) {
            state.lastScore = obj.accuracyScore;
            observer.next({
              type: 'score',
              data: { accuracyScore: obj.accuracyScore, feedback: [], overallComment: '' }
            });
          }
        }
        // Feedback item
        else if (obj.type && (obj.suggestion || obj.explanation)) {
          if (i > state.emittedFeedbackCount) {
            observer.next({ type: 'feedback', feedbackItem: obj as FeedbackItem });
            state.emittedFeedbackCount = i;
          }
        }
      } catch {
        // Line not yet complete, skip
      }
    }

    return true;
  }

  /**
   * Parse legacy nested JSON format for backward compatibility.
   */
  private parseLegacyJson(
    cleanBuffer: string,
    observer: Subscriber<AIStreamChunk>,
    state: StreamingState
  ): void {
    // Emit score as soon as it appears
    const scoreMatch = cleanBuffer.match(/"accuracyScore"\s*:\s*(\d+)/);
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

    // Extract feedback array section
    const feedbackMatch = cleanBuffer.match(/"feedback"\s*:\s*\[([\s\S]*?)(?:\]|$)/);
    if (feedbackMatch) {
      const feedbackSection = feedbackMatch[1];
      const feedbackObjects = this.extractCompleteJsonObjects(feedbackSection);

      // Emit only new feedback items
      for (let i = state.emittedFeedbackCount; i < feedbackObjects.length; i++) {
        try {
          const feedbackItem = JSON.parse(feedbackObjects[i]) as FeedbackItem;
          if (feedbackItem.type && (feedbackItem.suggestion || feedbackItem.explanation)) {
            observer.next({ type: 'feedback', feedbackItem });
            state.emittedFeedbackCount++;
          }
        } catch {
          // Skip invalid feedback items
        }
      }
    }
  }

  /**
   * Extract complete JSON objects from a partial string using balanced brace counting.
   * Handles nested objects and strings containing braces.
   */
  protected extractCompleteJsonObjects(text: string): string[] {
    const objects: string[] = [];
    let depth = 0;
    let start = -1;
    let inString = false;
    let escapeNext = false;

    for (let i = 0; i < text.length; i++) {
      const char = text[i];

      if (escapeNext) {
        escapeNext = false;
        continue;
      }

      if (char === '\\' && inString) {
        escapeNext = true;
        continue;
      }

      if (char === '"' && !escapeNext) {
        inString = !inString;
        continue;
      }

      if (inString) continue;

      if (char === '{') {
        if (depth === 0) start = i;
        depth++;
      } else if (char === '}') {
        depth--;
        if (depth === 0 && start !== -1) {
          objects.push(text.substring(start, i + 1));
          start = -1;
        }
      }
    }

    return objects;
  }

  /**
   * Create a new streaming state for tracking emitted chunks.
   */
  protected createStreamingState(): StreamingState {
    return { lastScore: -1, emittedFeedbackCount: 0 };
  }

  /**
   * Parse response content supporting both JSONL and legacy JSON formats.
   * Returns a default response if content is empty or invalid.
   */
  protected parseResponseContent(content: string): AIResponse {
    // Strip LLM special tokens first
    let cleanText = this.stripLlmTokens(content);
    cleanText = cleanText.replace(/^```json\s*/i, '').replace(/^```\s*/, '');
    cleanText = cleanText.replace(/\s*```\s*$/, '');

    // Check for empty/invalid response from weak models
    if (!cleanText || cleanText.length < 10) {
      console.warn('[BaseAIProvider] Empty or too short response from model');
      throw new Error(
        'Model returned empty response. This model may not support the required prompt format. Try a different model.'
      );
    }

    // Try JSONL format first
    const lines = cleanText.split('\n').filter(line => line.trim() && line.trim() !== '[END]');
    if (lines.length > 0) {
      const firstLine = lines[0].trim();
      if (firstLine.match(/^\s*\{\s*"accuracyScore"\s*:\s*\d+\s*\}\s*$/)) {
        let score = 0;
        const feedback: FeedbackItem[] = [];

        for (const line of lines) {
          try {
            const obj = JSON.parse(line.trim());
            if ('accuracyScore' in obj && !('type' in obj)) {
              score = obj.accuracyScore;
            } else if (obj.type) {
              feedback.push(obj as FeedbackItem);
            }
          } catch {
            // Skip invalid lines
          }
        }

        return { accuracyScore: score, feedback, overallComment: '' };
      }
    }

    // Fallback to legacy nested JSON format
    const jsonMatch = cleanText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          accuracyScore: parsed.accuracyScore || 0,
          feedback: parsed.feedback || [],
          overallComment: parsed.overallComment || ''
        };
      } catch {
        // JSON parse failed
      }
    }

    throw new Error(
      'Invalid response format. The model did not return valid JSON. Try a different model or check your API configuration.'
    );
  }
}
