/**
 * Analytics Provider Models
 * 
 * This file defines the abstract interfaces and types for the analytics system.
 * It follows the Adapter Pattern to ensure complete decoupling from any specific
 * analytics provider (GA4, Mixpanel, Amplitude, etc.).
 */

/**
 * Abstract interface that all analytics providers must implement.
 * This ensures the application never depends on a specific analytics implementation.
 */
export interface IAnalyticsProvider {
  // Lifecycle methods
  initialize(config: any): Promise<void>;
  isInitialized(): boolean;
  
  // Page tracking
  trackPageView(path: string, title: string, additionalData?: Record<string, any>): void;
  
  // Event tracking
  trackEvent(eventName: string, eventParams?: Record<string, any>): void;
  
  // User properties
  setUserProperty(propertyName: string, value: string | number): void;
  setUserProperties(properties: Record<string, string | number>): void;
  
  // User identification
  setUserId(userId: string | null): void;
  
  // Configuration
  setEnabled(enabled: boolean): void;
  isEnabled(): boolean;
  setDebugMode(enabled: boolean): void;
}

/**
 * Generic provider configuration
 */
export interface AnalyticsProviderConfig {
  type: string; // 'ga4', 'mixpanel', 'amplitude', etc.
  enabled: boolean;
  config: any; // Provider-specific configuration
}

/**
 * Main analytics configuration
 */
export interface AnalyticsConfig {
  providers: AnalyticsProviderConfig[];
}

/**
 * GA4-specific configuration
 */
export interface Ga4Config {
  measurementId: string;
  debugMode: boolean;
  anonymizeIp?: boolean;
  cookieFlags?: string;
}

/**
 * Exercise completion data for tracking
 */
export interface ExerciseCompletionData {
  completionTime: number;
  score: number;
  accuracy: number;
  hintsUsed: number;
}

/**
 * Page view data
 */
export interface PageViewData {
  path: string;
  title: string;
  referrer?: string;
}

/**
 * User properties schema
 */
export interface UserProperties {
  learningLevel?: string;
  languagePreference?: string;
  accountType?: 'guest' | 'authenticated';
  userCohort?: string;
}

/**
 * Session data
 */
export interface SessionData {
  sessionId: string;
  startTime: number;
  lastActivityTime: number;
  activitiesPerformed: number;
}

/**
 * GA4 event structure
 */
export interface Ga4Event {
  eventName: string;
  eventParams: Record<string, any>;
  timestamp: number;
}
