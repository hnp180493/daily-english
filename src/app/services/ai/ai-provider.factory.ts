import { Injectable, inject } from '@angular/core';
import { BaseAIProvider } from './base-ai-provider';
import { AzureOpenAIProvider } from './providers/azure-openai.provider';
import { OpenAIProvider } from './providers/openai.provider';
import { GeminiProvider } from './providers/gemini.provider';

@Injectable({
  providedIn: 'root'
})
export class AIProviderFactory {
  private azureProvider = inject(AzureOpenAIProvider);
  private openaiProvider = inject(OpenAIProvider);
  private geminiProvider = inject(GeminiProvider);

  private providers: Map<string, BaseAIProvider>;

  constructor() {
    this.providers = new Map<string, BaseAIProvider>();
    this.providers.set('azure', this.azureProvider);
    this.providers.set('openai', this.openaiProvider);
    this.providers.set('gemini', this.geminiProvider);
  }

  getProvider(providerName: string): BaseAIProvider | null {
    return this.providers.get(providerName) || null;
  }

  getAllProviders(): BaseAIProvider[] {
    return Array.from(this.providers.values());
  }

  getConfiguredProvider(config: any): BaseAIProvider | null {
    if (!config?.provider) {
      return null;
    }

    const provider = this.getProvider(config.provider);
    if (provider && provider.isConfigured(config)) {
      return provider;
    }

    return null;
  }

  // Easy way to add new providers in the future
  registerProvider(provider: BaseAIProvider): void {
    this.providers.set(provider.name, provider);
  }
}
