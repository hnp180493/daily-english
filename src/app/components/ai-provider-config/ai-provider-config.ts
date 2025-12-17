import { Component, ChangeDetectionStrategy, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ConfigService, AIConfig } from '../../services/config.service';
import { ToastService } from '../../services/toast.service';
import { AuthService } from '../../services/auth.service';

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
  private toastService = inject(ToastService);
  private authService = inject(AuthService);

  // Chỉ hiển thị Azure OpenAI cho email cụ thể
  showAzureProvider = computed(() => {
    const email = this.authService.getEmail();
    return email === 'phuochnsw@gmail.com';
  });

  config = signal<AIConfig>({
    provider: 'gemini',
    azure: {
      endpoint: '',
      apiKey: '',
      deploymentName: 'gpt-4'
    },
    gemini: {
      apiKey: '',
      modelName: 'gemini-2.5-flash-lite'
    },
    openai: {
      apiKey: '',
      modelName: 'gpt-4o-mini'
    },
    openrouter: {
      apiKey: '',
      modelName: 'nvidia/nemotron-3-nano-30b-a3b:free',
      siteUrl: '',
      siteName: ''
    }
  });

  showApiKeys = signal({
    azure: false,
    gemini: false,
    openai: false,
    openrouter: false
  });

  expandedProvider = signal<'azure' | 'gemini' | 'openai' | 'openrouter' | null>(null);
  
  useCustomModel = signal({
    gemini: false,
    openai: false,
    openrouter: false
  });

  private readonly CUSTOM_MODEL_KEYS = {
    gemini: 'gemini_useCustomModel',
    openai: 'openai_useCustomModel',
    openrouter: 'openrouter_useCustomModel'
  };

  ngOnInit(): void {
    this.loadConfig();
    this.loadCustomModelPreference();
  }

  loadConfig(): void {
    const saved = this.configService.getConfig();
    console.log('Loading config from service:', saved);
    if (saved) {
      // Ensure openrouter config exists with defaults if not present
      const configWithDefaults = {
        ...saved,
        openrouter: saved.openrouter || {
          apiKey: '',
          modelName: 'nvidia/nemotron-3-nano-30b-a3b:free',
          siteUrl: '',
          siteName: ''
        }
      };
      console.log('Setting config with defaults:', configWithDefaults);
      this.config.set(configWithDefaults);
    }
  }

  private loadCustomModelPreference(): void {
    try {
      const preferences: any = {};
      for (const [provider, key] of Object.entries(this.CUSTOM_MODEL_KEYS)) {
        const saved = localStorage.getItem(key);
        preferences[provider] = saved === 'true';
      }
      this.useCustomModel.set(preferences);
    } catch (error) {
      console.error('Failed to load custom model preferences:', error);
    }
  }

  private saveCustomModelPreference(provider: 'gemini' | 'openai' | 'openrouter'): void {
    try {
      const key = this.CUSTOM_MODEL_KEYS[provider];
      localStorage.setItem(key, String(this.useCustomModel()[provider]));
    } catch (error) {
      console.error('Failed to save custom model preference:', error);
    }
  }

  saveConfig(): void {
    try {
      this.configService.saveConfig(this.config());
      this.toastService.success('Configuration saved successfully!');
    } catch (error) {
      console.error('Failed to save config:', error);
      this.toastService.error('Failed to save configuration');
    }
  }

  toggleApiKeyVisibility(provider: 'azure' | 'gemini' | 'openai' | 'openrouter'): void {
    this.showApiKeys.update(keys => ({
      ...keys,
      [provider]: !keys[provider]
    }));
  }

  toggleProvider(provider: 'azure' | 'gemini' | 'openai' | 'openrouter'): void {
    if (this.expandedProvider() === provider) {
      this.expandedProvider.set(null);
    } else {
      this.expandedProvider.set(provider);
    }
  }

  selectProvider(provider: 'azure' | 'gemini' | 'openai' | 'openrouter'): void {
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

  updateOpenRouterApiKey(apiKey: string): void {
    this.config.update(c => ({ ...c, openrouter: { ...c.openrouter!, apiKey } }));
  }

  updateOpenRouterModel(modelName: string): void {
    this.config.update(c => ({ ...c, openrouter: { ...c.openrouter!, modelName } }));
  }

  updateOpenRouterSiteUrl(siteUrl: string): void {
    this.config.update(c => ({ ...c, openrouter: { ...c.openrouter!, siteUrl } }));
  }

  updateOpenRouterSiteName(siteName: string): void {
    this.config.update(c => ({ ...c, openrouter: { ...c.openrouter!, siteName } }));
  }

  toggleCustomModelInput(provider: 'gemini' | 'openai' | 'openrouter'): void {
    this.useCustomModel.update(models => ({
      ...models,
      [provider]: !models[provider]
    }));
    this.saveCustomModelPreference(provider);
  }

  clearConfig(): void {
    if (confirm('Are you sure you want to clear all configuration?')) {
      this.configService.clearConfig();
      
      // Clear all custom model preferences
      for (const key of Object.values(this.CUSTOM_MODEL_KEYS)) {
        localStorage.removeItem(key);
      }
      
      this.useCustomModel.set({
        gemini: false,
        openai: false,
        openrouter: false
      });
      
      this.config.set({
        provider: 'gemini',
        azure: {
          endpoint: '',
          apiKey: '',
          deploymentName: 'gpt-4'
        },
        gemini: {
          apiKey: '',
          modelName: 'gemini-2.5-flash-lite'
        },
        openai: {
          apiKey: '',
          modelName: 'gpt-4o-mini'
        },
        openrouter: {
          apiKey: '',
          modelName: 'nvidia/nemotron-3-nano-30b-a3b:free',
          siteUrl: '',
          siteName: ''
        }
      });
      this.expandedProvider.set(null);
    }
  }
}
