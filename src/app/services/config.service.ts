import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { AnalyticsService } from './analytics.service';

export interface AIConfig {
  provider: 'azure' | 'gemini' | 'openai' | 'openrouter';
  azure: {
    endpoint: string;
    apiKey: string;
    deploymentName: string;
  };
  gemini: {
    apiKey: string;
    modelName: string;
  };
  openai: {
    apiKey: string;
    modelName: string;
  };
  openrouter?: {
    apiKey: string;
    modelName: string;
    siteUrl?: string;
    siteName?: string;
  };
}

@Injectable({
  providedIn: 'root'
})
export class ConfigService {
  private readonly STORAGE_KEY = 'aiConfig';
  private configSubject = new BehaviorSubject<AIConfig | null>(null);
  public config$: Observable<AIConfig | null> = this.configSubject.asObservable();
  private analyticsService = inject(AnalyticsService);

  constructor() {
    this.loadConfig();
  }

  getConfig(): AIConfig | null {
    return this.configSubject.value;
  }

  loadConfig(): void {
    try {
      const saved = localStorage.getItem(this.STORAGE_KEY);
      if (saved) {
        const config = JSON.parse(saved);
        this.configSubject.next(config);
      }
    } catch (error) {
      console.error('Failed to load config from localStorage:', error);
    }
  }

  saveConfig(config: AIConfig): void {
    try {
      const oldConfig = this.getConfig();
      const oldProvider = oldConfig?.provider;
      const newProvider = config.provider;
      
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(config));
      this.configSubject.next(config);
      
      // Track provider change
      if (oldProvider && oldProvider !== newProvider) {
        this.analyticsService.trackAiProviderChanged(oldProvider, newProvider);
      }
      
      // Track API key configuration (without exposing the key)
      this.analyticsService.trackApiKeyConfigured(newProvider);
    } catch (error) {
      console.error('Failed to save config to localStorage:', error);
      throw error;
    }
  }

  clearConfig(): void {
    localStorage.removeItem(this.STORAGE_KEY);
    this.configSubject.next(null);
  }

  hasValidConfig(): boolean {
    // Always reload from localStorage to get the latest config
    this.loadConfig();
    
    const config = this.getConfig();
    if (!config) return false;

    if (config.provider === 'azure') {
      return !!(config.azure.endpoint && config.azure.apiKey && config.azure.deploymentName);
    } else if (config.provider === 'gemini') {
      return !!(config.gemini.apiKey && config.gemini.modelName);
    } else if (config.provider === 'openai') {
      return !!(config.openai.apiKey && config.openai.modelName);
    } else if (config.provider === 'openrouter') {
      return !!(config.openrouter?.apiKey && config.openrouter?.modelName);
    }
    return false;
  }
}
