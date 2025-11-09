# AI Provider Architecture

## Overview

This directory contains a modular AI provider system using factory pattern. All providers now have consistent error handling that shows detailed API error messages.

## Architecture

```
ai/
├── ai.service.ts                    # Backward compatibility export
├── ai-unified.service.ts            # Main service using factory pattern
├── ai-provider.factory.ts           # Factory to manage providers
├── base-ai-provider.ts              # Abstract base class
├── prompt.service.ts                # Prompt building logic
├── exercise-generator.service.ts    # Exercise generation
└── providers/
    ├── azure-openai.provider.ts     # Azure OpenAI
    ├── openai.provider.ts           # OpenAI
    ├── gemini.provider.ts           # Google Gemini
    └── deepseek.provider.ts         # DeepSeek (optional)
```

## Error Handling (IMPORTANT!)

All providers now use consistent error handling pattern:

```typescript
fetch(url, { method: 'POST', headers, body })
  .then(async response => {
    const data = await response.json();
    
    // 1. Check for error in response FIRST
    if (data.error) {
      console.error('API error response:', data.error);
      throw new Error(data.error.message || JSON.stringify(data.error));
    }
    
    // 2. Then check HTTP status
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return data;
  })
  .then(data => {
    // Process successful response
  })
  .catch(error => {
    console.error('[Provider] Error:', error);
    observer.error(error);
  });
```

This ensures you see detailed error messages like:
- ❌ "The API deployment for this resource does not exist"
- ✅ Instead of just "HTTP error! status: 404"

## Supported Providers

- **Azure OpenAI** (`azure`) - GPT-4 via Azure
- **OpenAI** (`openai`) - Direct OpenAI API
- **Google Gemini** (`gemini`) - Gemini Pro
- **DeepSeek** (`deepseek`) - DeepSeek Chat (optional)

## Usage

```typescript
import { AIService } from './services/ai/ai.service';

constructor(private aiService: AIService) {}

// Streaming analysis
this.aiService.analyzeTextStream(userInput, sourceText, context).subscribe({
  next: (chunk) => {
    if (chunk.type === 'score') console.log('Score:', chunk.data?.accuracyScore);
    if (chunk.type === 'feedback') console.log('Feedback:', chunk.feedbackItem);
    if (chunk.type === 'complete') console.log('Done:', chunk.data);
  },
  error: (error) => console.error('Error:', error.message) // Now shows detailed error!
});
```

## Configuration

In `src/environments/environment.ts`:

```typescript
export const environment = {
  aiProvider: 'azure', // or 'gemini', 'openai', 'deepseek'
  azure: {
    endpoint: 'your-endpoint',
    apiKey: 'your-key',
    deploymentName: 'gpt-4'
  },
  gemini: {
    apiKey: 'your-key',
    modelName: 'gemini-2.5-pro'
  }
};
```

## How to Add a New Provider

### Step 1: Create Provider Class

```typescript
// providers/your-provider.provider.ts
@Injectable({ providedIn: 'root' })
export class YourProvider extends BaseAIProvider {
  get name(): string { return 'your-provider'; }
  
  isConfigured(config: any): boolean {
    return !!(config?.yourProvider?.apiKey);
  }
  
  generateText(request: AIRequest, config: any): Observable<string> {
    return new Observable(observer => {
      fetch(url, { method: 'POST', headers, body: JSON.stringify(body) })
        .then(async response => {
          const data = await response.json();
          
          // IMPORTANT: Check error in data first!
          if (data.error) {
            console.error('API error:', data.error);
            throw new Error(data.error.message || JSON.stringify(data.error));
          }
          
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          
          return data;
        })
        .then(data => {
          observer.next(data.choices?.[0]?.message?.content || '');
          observer.complete();
        })
        .catch(error => {
          console.error('[YourProvider] Error:', error);
          observer.error(error);
        });
    });
  }
}
```

### Step 2: Register in Factory

Add to `ai-provider.factory.ts`:

```typescript
import { YourProvider } from './providers/your-provider.provider';

private yourProvider = inject(YourProvider);

private providers: Map<string, BaseAIProvider> = new Map([
  ['your-provider', this.yourProvider],
  // ... other providers
]);
```

### Step 3: Update Environment

Add config to `environment.ts`:

```typescript
yourProvider: {
  apiKey: '',
  modelName: 'model-name'
}
```

Done! No need to modify any other files.

## Benefits

✅ **Consistent Error Handling** - All providers show detailed API errors
✅ **Easy to Add** - Just create provider class and register
✅ **Type Safe** - TypeScript ensures correct implementation
✅ **Testable** - Mock individual providers easily
✅ **Maintainable** - Each provider isolated in own file

## Migration from Old Architecture

Old services (`azure-openai.service.ts`, `gemini.service.ts`, etc.) have been removed.
Use `AIService` (which now exports `AIUnifiedService`) for all AI operations.

The API remains the same, so existing code continues to work!
