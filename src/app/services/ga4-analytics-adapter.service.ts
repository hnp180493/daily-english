import { Injectable, inject } from '@angular/core';
import { IAnalyticsProvider, Ga4Config, Ga4Event } from '../models/analytics-provider.model';
import { EventQueueManager } from './event-queue-manager.service';
import { PrivacyService } from './privacy.service';

/**
 * GA4 Analytics Adapter
 * 
 * Concrete implementation of IAnalyticsProvider for Google Analytics 4.
 * This adapter handles:
 * - Loading and initializing gtag.js library
 * - Translating generic analytics calls to GA4-specific gtag() calls
 * - Error handling and graceful degradation
 * - Event queueing for offline scenarios
 * - PII filtering and privacy compliance
 * 
 * The adapter ensures the application never directly depends on GA4,
 * making it easy to switch to other analytics providers.
 */
@Injectable()
export class Ga4AnalyticsAdapter implements IAnalyticsProvider {
  private config: Ga4Config | null = null;
  private initialized = false;
  private enabled = true;
  private debugMode = false;
  private scriptLoaded = false;
  private scriptLoading = false;
  private initializationPromise: Promise<void> | null = null;
  private eventQueue = inject(EventQueueManager);
  private privacyService = inject(PrivacyService);

  /**
   * Initialize the GA4 adapter with configuration
   */
  async initialize(config: Ga4Config): Promise<void> {
    // If already initializing, return the existing promise
    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    // If already initialized, return immediately
    if (this.initialized) {
      return Promise.resolve();
    }

    this.initializationPromise = this.performInitialization(config);
    return this.initializationPromise;
  }

  /**
   * Perform the actual initialization
   */
  private async performInitialization(config: Ga4Config): Promise<void> {
    try {
      this.config = config;
      this.debugMode = config.debugMode || false;

      // Check if analytics is enabled (user hasn't opted out)
      if (!this.privacyService.isAnalyticsEnabled()) {
        if (this.debugMode) {
          console.log('[GA4] Analytics disabled by user preference - skipping initialization');
        }
        this.enabled = false;
        this.initialized = false;
        return;
      }

      if (this.debugMode) {
        console.log('[GA4] Initializing with config:', {
          measurementId: config.measurementId,
          debugMode: config.debugMode,
          anonymizeIp: config.anonymizeIp
        });
      }

      // Load gtag.js script
      await this.loadGtagScript(config.measurementId);

      // Initialize gtag with configuration
      this.initializeGtag(config);

      this.initialized = true;

      // Set up event queue debug mode
      this.eventQueue.setDebugMode(this.debugMode);

      // Set up online event listener to flush queue
      if (typeof window !== 'undefined') {
        window.addEventListener('online', () => {
          if (this.debugMode) {
            console.log('[GA4] Device back online - flushing queue');
          }
          this.flushQueue();
        });
      }

      if (this.debugMode) {
        console.log('[GA4] Initialization complete');
      }
    } catch (error) {
      console.error('[GA4] Initialization failed:', error);
      // Don't throw - fail gracefully
      this.initialized = false;
      this.enabled = false;
    }
  }

  /**
   * Load the gtag.js script dynamically
   */
  private loadGtagScript(measurementId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      // Check if script is already loaded
      if (this.scriptLoaded) {
        resolve();
        return;
      }

      // Check if script is currently loading
      if (this.scriptLoading) {
        // Wait for the existing load to complete
        const checkInterval = setInterval(() => {
          if (this.scriptLoaded) {
            clearInterval(checkInterval);
            resolve();
          } else if (!this.scriptLoading) {
            clearInterval(checkInterval);
            reject(new Error('Script loading failed'));
          }
        }, 100);
        return;
      }

      this.scriptLoading = true;

      try {
        // Initialize dataLayer if it doesn't exist
        (window as any).dataLayer = (window as any).dataLayer || [];

        // Create and append the gtag.js script
        const script = document.createElement('script');
        script.async = true;
        script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;

        script.onload = () => {
          this.scriptLoaded = true;
          this.scriptLoading = false;
          if (this.debugMode) {
            console.log('[GA4] gtag.js script loaded successfully');
          }
          resolve();
        };

        script.onerror = (error) => {
          this.scriptLoading = false;
          console.error('[GA4] Failed to load gtag.js script:', error);
          reject(new Error('Failed to load gtag.js script'));
        };

        document.head.appendChild(script);
      } catch (error) {
        this.scriptLoading = false;
        console.error('[GA4] Error creating gtag.js script element:', error);
        reject(error);
      }
    });
  }

  /**
   * Initialize gtag with configuration
   */
  private initializeGtag(config: Ga4Config): void {
    if (!this.scriptLoaded) {
      console.warn('[GA4] Cannot initialize gtag - script not loaded');
      return;
    }

    try {
      // Initialize gtag function
      const gtag = this.getGtag();

      // Configure gtag
      gtag('js', new Date());

      // Build config object
      const gtagConfig: any = {};

      if (config.anonymizeIp) {
        gtagConfig.anonymize_ip = true;
      }

      if (config.cookieFlags) {
        gtagConfig.cookie_flags = config.cookieFlags;
      }

      // Configure GA4 with measurement ID
      gtag('config', config.measurementId, gtagConfig);

      if (this.debugMode) {
        console.log('[GA4] gtag configured with measurement ID:', config.measurementId);
      }
    } catch (error) {
      console.error('[GA4] Error initializing gtag:', error);
      throw error;
    }
  }

  /**
   * Get the gtag function from window
   */
  private getGtag(): (...args: any[]) => void {
    if (typeof (window as any).gtag === 'function') {
      return (window as any).gtag;
    }

    // Create gtag function if it doesn't exist
    (window as any).gtag = function() {
      ((window as any).dataLayer = (window as any).dataLayer || []).push(arguments);
    };

    return (window as any).gtag;
  }

  /**
   * Check if the adapter is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Track a page view
   */
  trackPageView(path: string, title: string, additionalData?: Record<string, any>): void {
    if (!this.canTrack()) {
      return;
    }

    const params: any = {
      page_path: path,
      page_title: title,
      ...additionalData
    };

    const event: Ga4Event = {
      eventName: 'page_view',
      eventParams: params,
      timestamp: Date.now()
    };

    this.sendOrQueueEvent(event);
  }

  /**
   * Track a generic event
   */
  trackEvent(eventName: string, eventParams?: Record<string, any>): void {
    if (!this.canTrack()) {
      return;
    }

    // Filter PII from event parameters
    const filteredParams = this.privacyService.filterEventParams(eventParams || {});
    const sanitizedParams = this.sanitizeEventParams(filteredParams);

    // Validate for PII (in debug mode)
    if (this.debugMode) {
      const validation = this.privacyService.validateEventParams(sanitizedParams);
      if (!validation.valid) {
        console.warn('[GA4] Event contains PII:', validation.errors);
      }
    }

    const event: Ga4Event = {
      eventName,
      eventParams: sanitizedParams,
      timestamp: Date.now()
    };

    this.sendOrQueueEvent(event);
  }

  /**
   * Set a single user property
   */
  setUserProperty(propertyName: string, value: string | number): void {
    if (!this.canTrack()) {
      return;
    }

    try {
      const gtag = this.getGtag();
      gtag('set', 'user_properties', {
        [propertyName]: value
      });

      if (this.debugMode) {
        console.log('[GA4] User property set:', propertyName, value);
      }
    } catch (error) {
      this.handleError('setUserProperty', error);
    }
  }

  /**
   * Set multiple user properties
   */
  setUserProperties(properties: Record<string, string | number>): void {
    if (!this.canTrack()) {
      return;
    }

    try {
      const gtag = this.getGtag();
      gtag('set', 'user_properties', properties);

      if (this.debugMode) {
        console.log('[GA4] User properties set:', properties);
      }
    } catch (error) {
      this.handleError('setUserProperties', error);
    }
  }

  /**
   * Set user ID for identification
   */
  setUserId(userId: string | null): void {
    if (!this.canTrack()) {
      return;
    }

    try {
      const gtag = this.getGtag();
      gtag('set', { user_id: userId });

      if (this.debugMode) {
        console.log('[GA4] User ID set:', userId);
      }
    } catch (error) {
      this.handleError('setUserId', error);
    }
  }

  /**
   * Enable or disable tracking
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;

    // Update privacy service preference
    if (enabled) {
      this.privacyService.enableAnalytics();
    } else {
      this.privacyService.disableAnalytics();
    }

    if (this.debugMode) {
      console.log('[GA4] Tracking enabled:', enabled);
    }
  }

  /**
   * Check if tracking is enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Enable or disable debug mode
   */
  setDebugMode(enabled: boolean): void {
    this.debugMode = enabled;
    this.eventQueue.setDebugMode(enabled);
    console.log('[GA4] Debug mode:', enabled);
  }

  /**
   * Send an event or queue it if offline
   */
  private sendOrQueueEvent(event: Ga4Event): void {
    // Check if device is online
    if (!this.eventQueue.isDeviceOnline()) {
      if (this.debugMode) {
        console.log('[GA4] Device offline - queueing event:', event.eventName);
      }
      this.eventQueue.enqueue(event);
      return;
    }

    // Try to send the event
    try {
      const gtag = this.getGtag();
      gtag('event', event.eventName, event.eventParams);

      if (this.debugMode) {
        console.log('[GA4] Event tracked:', event.eventName, event.eventParams);
      }

      // If successful and we have queued events, try to flush them
      if (this.eventQueue.size() > 0) {
        this.flushQueue();
      }
    } catch (error) {
      this.handleError('sendOrQueueEvent', error);
      // Queue the event for retry
      this.eventQueue.enqueue(event);
    }
  }

  /**
   * Flush the event queue
   */
  private async flushQueue(): Promise<void> {
    try {
      await this.eventQueue.flush(async (event: Ga4Event) => {
        const gtag = this.getGtag();
        gtag('event', event.eventName, event.eventParams);
      });
    } catch (error) {
      this.handleError('flushQueue', error);
    }
  }

  /**
   * Check if tracking can proceed
   */
  private canTrack(): boolean {
    // Check privacy service first
    if (!this.privacyService.isAnalyticsEnabled()) {
      if (this.debugMode) {
        console.log('[GA4] Tracking disabled by user preference');
      }
      return false;
    }

    if (!this.enabled) {
      if (this.debugMode) {
        console.log('[GA4] Tracking disabled');
      }
      return false;
    }

    if (!this.initialized) {
      if (this.debugMode) {
        console.warn('[GA4] Not initialized - cannot track');
      }
      return false;
    }

    return true;
  }

  /**
   * Sanitize event parameters to remove invalid values
   */
  private sanitizeEventParams(params?: Record<string, any>): Record<string, any> {
    if (!params) {
      return {};
    }

    const sanitized: Record<string, any> = {};

    for (const [key, value] of Object.entries(params)) {
      // Skip undefined and null values
      if (value === undefined || value === null) {
        continue;
      }

      // Skip functions
      if (typeof value === 'function') {
        continue;
      }

      // Include valid values
      sanitized[key] = value;
    }

    return sanitized;
  }

  /**
   * Handle errors gracefully
   */
  private handleError(method: string, error: any): void {
    console.error(`[GA4] Error in ${method}:`, error);
    // Don't throw - fail gracefully
  }
}
