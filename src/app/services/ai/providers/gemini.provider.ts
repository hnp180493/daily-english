import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { BaseAIProvider, AIRequest, AIMessage } from '../base-ai-provider';
import { AIResponse, AIStreamChunk, ExerciseContext } from '../../../models/ai.model';
import { PromptService } from '../prompt.service';

@Injectable({
  providedIn: 'root'
})
export class GeminiProvider extends BaseAIProvider {
  private promptService = inject(PromptService);

  get name(): string {
    return 'gemini';
  }

  isConfigured(config: any): boolean {
    return !!(config?.gemini?.apiKey && config?.gemini?.modelName);
  }

  generateText(request: AIRequest, config: any): Observable<string> {
    return new Observable(observer => {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${config.gemini.modelName || 'gemini-pro'}:generateContent?key=${config.gemini.apiKey}`;

      // Convert messages to Gemini format
      const prompt = request.messages
        .filter(m => m.role !== 'system')
        .map(m => m.content)
        .join('\n\n');

      const body = {
        contents: [
          {
            parts: [{ text: prompt }]
          }
        ],
        generationConfig: {
          temperature: request.temperature ?? 0.7,
          maxOutputTokens: request.maxTokens ?? 800
        }
      };

      fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
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
          const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
          observer.next(content);
          observer.complete();
        })
        .catch(error => {
          console.error('[Gemini] Error:', error);
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
      const prompt = this.promptService.buildAnalysisPrompt(userInput, sourceText, context, context.fullContext, context.translatedContext);
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
      // Reset counters for each new stream
      this.emittedFeedbackCount = 0;
      this.lastEmittedScore = null;

      const prompt = this.promptService.buildAnalysisPrompt(userInput, sourceText, context, context.fullContext, context.translatedContext);
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${config.gemini.modelName}:streamGenerateContent?alt=sse&key=${config.gemini.apiKey}`;

      const body = JSON.stringify({
        contents: [
          {
            parts: [{ text: prompt }]
          }
        ],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1000
        }
      });

      fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body
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
              const data = line.slice(6).trim();
              
              if (!data) continue;

              try {
                const parsed = JSON.parse(data);
                const content = parsed.candidates?.[0]?.content?.parts?.[0]?.text || '';
                
                if (content) {
                  buffer += content;
                  this.emitPartialResponse(buffer, observer);
                }
              } catch (e) {
                // Ignore JSON parse errors for incomplete chunks
              }
            }
          }
        }
      }).catch(error => {
        console.error('Gemini streaming error:', error);
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
      const prompt = this.promptService.buildHintPrompt(sourceText, userInput, previousHints, context, context.fullContext);
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
      let cleanText = content.trim();
      if (cleanText.startsWith('```json')) {
        cleanText = cleanText.replace(/^```json\n/, '').replace(/\n```$/, '');
      } else if (cleanText.startsWith('```')) {
        cleanText = cleanText.replace(/^```\n/, '').replace(/\n```$/, '');
      }

      const jsonMatch = cleanText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          accuracyScore: parsed.accuracyScore || 0,
          feedback: parsed.feedback || [],
          overallComment: ''
        };
      }
      throw new Error('Invalid response format');
    } catch (error) {
      console.error('Failed to parse AI response:', error);
      return {
        accuracyScore: 50,
        feedback: [],
        overallComment: ''
      };
    }
  }

  private emittedFeedbackCount = 0;
  private lastEmittedScore: number | null = null;

  private emitPartialResponse(buffer: string, observer: any): void {
    try {
      // Clean markdown code blocks from buffer
      let cleanBuffer = buffer.trim();
      if (cleanBuffer.startsWith('```json')) {
        cleanBuffer = cleanBuffer.replace(/^```json\n/, '').replace(/\n```$/, '');
      } else if (cleanBuffer.startsWith('```')) {
        cleanBuffer = cleanBuffer.replace(/^```\n/, '').replace(/\n```$/, '');
      }

      // Emit score as soon as it appears
      const scoreMatch = cleanBuffer.match(/"accuracyScore"\s*:\s*(\d+)/);
      if (scoreMatch) {
        const score = parseInt(scoreMatch[1], 10);
        if (this.lastEmittedScore !== score) {
          observer.next({ 
            type: 'score', 
            data: { accuracyScore: score, feedback: [], overallComment: '' }
          });
          this.lastEmittedScore = score;
        }
      }

      // Parse individual feedback items as they stream in
      const feedbackSectionMatch = cleanBuffer.match(/"feedback"\s*:\s*\[([^\]]*)/);
      if (feedbackSectionMatch) {
        const feedbackContent = feedbackSectionMatch[1];
        
        // Match individual complete feedback objects
        const itemRegex = /\{\s*"type"\s*:\s*"([^"]+)"[^}]*?"severity"\s*:\s*"([^"]+)"[^}]*?"originalText"\s*:\s*"([^"]*)"[^}]*?"suggestion"\s*:\s*"([^"]*)"[^}]*?"explanation"\s*:\s*"([^"]*)"/g;
        
        const allMatches: any[] = [];
        let match;
        
        // Collect all complete feedback items
        while ((match = itemRegex.exec(feedbackContent)) !== null) {
          allMatches.push({
            type: match[1],
            severity: match[2],
            originalText: match[3],
            suggestion: match[4],
            explanation: match[5],
            startIndex: 0,
            endIndex: 0
          });
        }

        // Emit only new items we haven't emitted yet
        for (let i = this.emittedFeedbackCount; i < allMatches.length; i++) {
          observer.next({ type: 'feedback', feedbackItem: allMatches[i] });
          this.emittedFeedbackCount++;
        }
      }
    } catch (e) {
      // Ignore parsing errors for partial content
    }
  }
}
