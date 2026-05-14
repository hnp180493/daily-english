import { Observable, Subscriber } from 'rxjs';
import { AIResponse, AIStreamChunk, ExerciseContext } from '../../models/ai.model';
import { FeedbackItem } from '../../models/exercise.model';
import { PronunciationContext, PronunciationFeedback } from '../../models/pronunciation.model';
import { WritingFeedback, WritingRubricScores } from '../../models/writing.model';

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

  supportsAudioInput(): boolean {
    return false;
  }

  /**
   * Grade a writing submission. Default implementation delegates to `generateText()`
   * with a writing-specific JSON prompt — works for every provider that supports
   * basic text generation. Override only if you need provider-specific tuning.
   */
  analyzeWriting(
    builtPrompt: string,
    promptId: string,
    wordCount: number,
    config: any
  ): Observable<WritingFeedback> {
    return new Observable((observer) => {
      const messages: AIMessage[] = [
        { role: 'system', content: 'You are an experienced English writing teacher. Return ONLY valid JSON, no markdown fences.' },
        { role: 'user', content: builtPrompt },
      ];
      this.generateText({ messages, temperature: 0.3, maxTokens: 2400 }, config).subscribe({
        next: (content) => {
          try {
            const feedback = this.parseWritingResponse(content, promptId, wordCount);
            observer.next(feedback);
            observer.complete();
          } catch (err) {
            observer.error(err);
          }
        },
        error: (err) => observer.error(err),
      });
    });
  }

  analyzePronunciation(
    audioBlob: Blob,
    context: PronunciationContext,
    config: any
  ): Observable<PronunciationFeedback> {
    throw new Error(
      `${this.name} does not support audio input. Switch to a multimodal provider (Gemini 2.5 Pro/Flash, GPT-4o) for pronunciation analysis.`
    );
  }

  protected parseWritingResponse(content: string, promptId: string, wordCount: number): WritingFeedback {
    let cleanText = content.trim();
    cleanText = cleanText.replace(/^```json\s*/i, '').replace(/^```\s*/, '');
    cleanText = cleanText.replace(/\s*```\s*$/, '');

    const objStart = cleanText.indexOf('{');
    if (objStart < 0) {
      throw new Error('Writing response is not valid JSON');
    }
    const candidate = cleanText.slice(objStart);

    let parsed: any;
    try {
      parsed = JSON.parse(candidate);
    } catch (firstErr) {
      const repaired = this.repairTruncatedJson(candidate);
      try {
        parsed = JSON.parse(repaired);
        console.warn('[BaseAIProvider] Recovered truncated writing JSON via repair.');
      } catch (secondErr) {
        throw firstErr instanceof Error ? firstErr : new Error('Writing response JSON parse failed');
      }
    }

    const rawScores = parsed.scores || {};
    const scores: WritingRubricScores = {
      taskAchievement: this.clampBand(rawScores.taskAchievement),
      coherenceCohesion: this.clampBand(rawScores.coherenceCohesion),
      lexicalResource: this.clampBand(rawScores.lexicalResource),
      grammar: this.clampBand(rawScores.grammar),
    };
    const sum = scores.taskAchievement + scores.coherenceCohesion + scores.lexicalResource + scores.grammar;
    const overallBand = Math.round((sum / 4) * 2) / 2; // nearest 0.5

    return {
      promptId,
      scores,
      overallBand,
      overallComment: typeof parsed.overallComment === 'string' ? parsed.overallComment : '',
      strengths: Array.isArray(parsed.strengths) ? parsed.strengths.filter((s: any) => typeof s === 'string') : [],
      improvements: Array.isArray(parsed.improvements) ? parsed.improvements.filter((s: any) => typeof s === 'string') : [],
      errors: Array.isArray(parsed.errors)
        ? parsed.errors
            .filter((e: any) => e && typeof e === 'object')
            .map((e: any) => ({
              type: typeof e.type === 'string' ? e.type : 'other',
              wrong: typeof e.wrong === 'string' ? e.wrong : '',
              right: typeof e.right === 'string' ? e.right : '',
              explanation: typeof e.explanation === 'string' ? e.explanation : '',
            }))
            .filter((e: any) => e.wrong && e.right)
        : [],
      wordCount,
    };
  }

  private clampBand(value: any): number {
    const n = typeof value === 'number' ? value : parseFloat(value);
    if (!Number.isFinite(n)) return 0;
    return Math.max(0, Math.min(9, n));
  }

  protected parsePronunciationResponse(content: string): PronunciationFeedback {
    let cleanText = content.trim();
    cleanText = cleanText.replace(/^```json\s*/i, '').replace(/^```\s*/, '');
    cleanText = cleanText.replace(/\s*```\s*$/, '');

    const objStart = cleanText.indexOf('{');
    if (objStart < 0) {
      throw new Error('Pronunciation response is not valid JSON');
    }
    const candidate = cleanText.slice(objStart);

    let parsed: any;
    try {
      parsed = JSON.parse(candidate);
    } catch (firstErr) {
      // Try to repair a truncated response (common with MAX_TOKENS).
      const repaired = this.repairTruncatedJson(candidate);
      try {
        parsed = JSON.parse(repaired);
        console.warn('[BaseAIProvider] Recovered truncated pronunciation JSON via repair.');
      } catch (secondErr) {
        throw firstErr instanceof Error ? firstErr : new Error('Pronunciation response JSON parse failed');
      }
    }

    return {
      overallScore: typeof parsed.overallScore === 'number' ? parsed.overallScore : 0,
      rawFeedback: parsed.rawFeedback || '',
      pronunciationIssues: Array.isArray(parsed.pronunciationIssues) ? parsed.pronunciationIssues : [],
      strengths: Array.isArray(parsed.strengths) ? parsed.strengths : [],
      perWordFeedback: Array.isArray(parsed.perWordFeedback) ? parsed.perWordFeedback : []
    };
  }

  /**
   * Repair truncated JSON by:
   *  1. If we ended mid-string, drop everything after the last completed JSON value.
   *  2. Strip trailing commas / partial fragments.
   *  3. Append the closing brackets/braces still on the open stack.
   */
  private repairTruncatedJson(text: string): string {
    let inString = false;
    let escape = false;
    const stack: Array<'{' | '['> = [];
    let lastSafeEnd = -1; // index AFTER a completed value at the current stack depth

    for (let i = 0; i < text.length; i++) {
      const c = text[i];

      if (escape) { escape = false; continue; }
      if (inString) {
        if (c === '\\') escape = true;
        else if (c === '"') inString = false;
        continue;
      }
      if (c === '"') { inString = true; continue; }

      if (c === '{' || c === '[') {
        stack.push(c as '{' | '[');
      } else if (c === '}') {
        if (stack[stack.length - 1] === '{') stack.pop();
        lastSafeEnd = i + 1;
      } else if (c === ']') {
        if (stack[stack.length - 1] === '[') stack.pop();
        lastSafeEnd = i + 1;
      } else if (c === ',' && stack.length > 0) {
        lastSafeEnd = i; // before the comma
      }
    }

    // Truncate to the last completed value (drops partial element after final comma / mid-string).
    let truncated = lastSafeEnd > 0 ? text.slice(0, lastSafeEnd) : text;
    // Drop a dangling trailing comma if present
    truncated = truncated.replace(/,\s*$/, '');

    // Recompute open stack on the truncated prefix and close it
    const closers: string[] = [];
    let inStr2 = false;
    let esc2 = false;
    const stack2: Array<'{' | '['> = [];
    for (let i = 0; i < truncated.length; i++) {
      const c = truncated[i];
      if (esc2) { esc2 = false; continue; }
      if (inStr2) {
        if (c === '\\') esc2 = true;
        else if (c === '"') inStr2 = false;
        continue;
      }
      if (c === '"') { inStr2 = true; continue; }
      if (c === '{' || c === '[') stack2.push(c as '{' | '[');
      else if (c === '}' && stack2[stack2.length - 1] === '{') stack2.pop();
      else if (c === ']' && stack2[stack2.length - 1] === '[') stack2.pop();
    }
    while (stack2.length > 0) {
      const open = stack2.pop()!;
      closers.push(open === '{' ? '}' : ']');
    }

    return truncated + closers.join('');
  }

  /**
   * Drop hallucinated entries from AI pronunciation feedback.
   * - perWordFeedback: keep only entries whose `word` is in the expected sentence.
   * - pronunciationIssues / strengths: drop bullets that quote a word ('foo' or "foo")
   *   that is NOT in the expected sentence.
   * Leaves rawFeedback untouched (free-form prose).
   */
  protected filterPronunciationFeedback(
    feedback: PronunciationFeedback,
    expectedText: string
  ): PronunciationFeedback {
    const allowedWords = new Set(
      expectedText
        .toLowerCase()
        .split(/\s+/)
        .map(w => w.replace(/[^a-z0-9'\-]+/g, ''))
        .filter(w => w.length > 0)
    );

    const isAllowedWord = (w: string): boolean =>
      allowedWords.has(w.toLowerCase().replace(/[^a-z0-9'\-]+/g, ''));

    const bulletReferencesUnknownWord = (bullet: string): boolean => {
      const quoted = [...bullet.matchAll(/['"`]([a-zA-Z][a-zA-Z'\-]*)['"`]/g)].map(m => m[1]);
      // If bullet quotes one or more English words and NONE of them are in expected, drop.
      if (quoted.length === 0) return false;
      return !quoted.some(w => isAllowedWord(w));
    };

    return {
      overallScore: feedback.overallScore,
      rawFeedback: feedback.rawFeedback,
      pronunciationIssues: (feedback.pronunciationIssues || []).filter(
        b => !bulletReferencesUnknownWord(b)
      ),
      strengths: (feedback.strengths || []).filter(b => !bulletReferencesUnknownWord(b)),
      perWordFeedback: (feedback.perWordFeedback || []).filter(w => isAllowedWord(w.word))
    };
  }

  protected blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        const base64 = result.split(',')[1] ?? '';
        resolve(base64);
      };
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
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
