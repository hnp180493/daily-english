import { Injectable } from '@angular/core';
import { IAnalyticsProvider, AnalyticsProviderConfig } from '../models/analytics-provider.model';
import { Ga4AnalyticsAdapter } from './ga4-analytics-adapter.service';

/**
 * Analytics Provider Factory
 * 
 * Factory service for creating analytics provider instances based on configuration.
 * This allows easy addition of new analytics providers without modifying existing code.
 * 
 * To add a new provider:
 * 1. Create a new adapter class implementing IAnalyticsProvider
 * 2. Add a case in the createProvider method
 * 3. Update environment configuration
 */
@Injectable({
  providedIn: 'root'
})
export class AnalyticsProviderFactory {
  /**
   * Create an analytics provider based on configuration
   */
  createProvider(config: AnalyticsProviderConfig): IAnalyticsProvider | null {
    switch (config.type) {
      case 'ga4':
        return new Ga4AnalyticsAdapter();
      
      // Easy to add more providers:
      // case 'mixpanel':
      //   return new MixpanelAnalyticsAdapter();
      // case 'amplitude':
      //   return new AmplitudeAnalyticsAdapter();
      
      default:
        console.warn(`[AnalyticsProviderFactory] Unknown provider type: ${config.type}`);
        return null;
    }
  }

  /**
   * Create and initialize a provider
   */
  async createAndInitialize(config: AnalyticsProviderConfig): Promise<IAnalyticsProvider | null> {
    if (!config.enabled) {
      return null;
    }

    const provider = this.createProvider(config);
    
    if (!provider) {
      return null;
    }

    try {
      await provider.initialize(config.config);
      return provider;
    } catch (error) {
      console.error(`[AnalyticsProviderFactory] Failed to initialize provider ${config.type}:`, error);
      return null;
    }
  }
}
