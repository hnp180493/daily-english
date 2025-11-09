import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { BaseAIProvider, AIRequest } from '../base-ai-provider';

/**
 * DeepSeek AI Provider
 * 
 * To enable DeepSeek:
 * 1. Add this provider to AIProviderFactory
 * 2. Add deepseek config to ConfigService interface
 * 3. Add deepseek option to environment.ts
 * 
 * Example config:
 * {
 *   provider: 'deepseek',
 *   deepseek: {
 *     apiKey: 'your-api-key',
 *     modelName: 'deepseek-chat',
 *     endpoint: 'https://api.deepseek.com/v1'
 *   }
 * }
 */
@Injectable({
  providedIn: 'root'
})
export class DeepSeekProvider extends BaseAIProvider {
  get name(): string {
    return 'deepseek';
  }

  isConfigured(config: any): boolean {
    return !!(
      config?.deepseek?.apiKey &&
      config?.deepseek?.modelName
    );
  }

  generateText(request: AIRequest, config: any): Observable<string> {
    return new Observable(observer => {
      const endpoint = config.deepseek.endpoint || 'https://api.deepseek.com/v1';
      
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.deepseek.apiKey}`
      };

      const body = {
        model: config.deepseek.modelName || 'deepseek-chat',
        messages: request.messages,
        temperature: request.temperature ?? 0.7,
        max_tokens: request.maxTokens ?? 800
      };

      fetch(`${endpoint}/chat/completions`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body)
      })
        .then(async response => {
          const data = await response.json();
          
          // Check for error in response (works for both 200 and error status codes)
          if (data.error) {
            console.error('DeepSeek API error response:', data.error);
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
          console.error('[DeepSeek] Error:', error);
          observer.error(error);
        });
    });
  }
}
