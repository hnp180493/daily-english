import { Component, ChangeDetectionStrategy, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ConfigService, AIConfig } from '../../services/config.service';

@Component({
  selector: 'app-ai-provider-config',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './ai-provider-config.html',
  styleUrl: './ai-provider-config.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AiProviderConfig implements OnInit {
  private configService = inject(ConfigService);

  config = signal<AIConfig>({
    provider: 'openai',
    azure: {
      endpoint: '',
      apiKey: '',
      deploymentName: 'gpt-4'
    },
    gemini: {
      apiKey: '',
      modelName: 'gemini-2.0-flash-exp'
    },
    openai: {
      apiKey: '',
      modelName: 'gpt-4o'
    }
  });

  showApiKeys = signal({
    azure: false,
    gemini: false,
    openai: false
  });

  expandedProvider = signal<'azure' | 'gemini' | 'openai' | null>(null);
  saveSuccess = signal(false);
  saveError = signal(false);

  ngOnInit(): void {
    this.loadConfig();
  }

  loadConfig(): void {
    const saved = this.configService.getConfig();
    if (saved) {
      this.config.set(saved);
    }
  }

  saveConfig(): void {
    try {
      this.configService.saveConfig(this.config());
      this.saveSuccess.set(true);
      this.saveError.set(false);
      
      setTimeout(() => {
        this.saveSuccess.set(false);
      }, 3000);
    } catch (error) {
      console.error('Failed to save config:', error);
      this.saveError.set(true);
      this.saveSuccess.set(false);
    }
  }

  toggleApiKeyVisibility(provider: 'azure' | 'gemini' | 'openai'): void {
    this.showApiKeys.update(keys => ({
      ...keys,
      [provider]: !keys[provider]
    }));
  }

  toggleProvider(provider: 'azure' | 'gemini' | 'openai'): void {
    if (this.expandedProvider() === provider) {
      this.expandedProvider.set(null);
    } else {
      this.expandedProvider.set(provider);
    }
  }

  selectProvider(provider: 'azure' | 'gemini' | 'openai'): void {
    this.config.update(c => ({ ...c, provider }));
    this.expandedProvider.set(provider);
  }

  updateAzureEndpoint(endpoint: string): void {
    this.config.update(c => ({ ...c, azure: { ...c.azure, endpoint } }));
  }

  updateAzureApiKey(apiKey: string): void {
    this.config.update(c => ({ ...c, azure: { ...c.azure, apiKey } }));
  }

  updateAzureDeployment(deploymentName: string): void {
    this.config.update(c => ({ ...c, azure: { ...c.azure, deploymentName } }));
  }

  updateGeminiApiKey(apiKey: string): void {
    this.config.update(c => ({ ...c, gemini: { ...c.gemini, apiKey } }));
  }

  updateGeminiModel(modelName: string): void {
    this.config.update(c => ({ ...c, gemini: { ...c.gemini, modelName } }));
  }

  updateOpenAIApiKey(apiKey: string): void {
    this.config.update(c => ({ ...c, openai: { ...c.openai, apiKey } }));
  }

  updateOpenAIModel(modelName: string): void {
    this.config.update(c => ({ ...c, openai: { ...c.openai, modelName } }));
  }

  clearConfig(): void {
    if (confirm('Are you sure you want to clear all configuration?')) {
      this.configService.clearConfig();
      this.config.set({
        provider: 'openai',
        azure: {
          endpoint: '',
          apiKey: '',
          deploymentName: 'gpt-4'
        },
        gemini: {
          apiKey: '',
          modelName: 'gemini-2.0-flash-exp'
        },
        openai: {
          apiKey: '',
          modelName: 'gpt-4o'
        }
      });
      this.expandedProvider.set(null);
    }
  }
}
