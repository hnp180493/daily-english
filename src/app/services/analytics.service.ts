import { Injectable, inject } from '@angular/core';
import { IAnalyticsProvider, ExerciseCompletionData } from '../models/analytics-provider.model';
import { PrivacyService } from './privacy.service';

/**
 * Analytics Service Facade
 * 
 * This service provides a single entry point for all analytics tracking in the application.
 * It follows the Facade pattern and delegates to registered analytics providers.
 * 
 * Key benefits:
 * - Application code never depends on specific analytics implementations
 * - Easy to add/remove analytics providers via configuration
 * - Can run multiple providers simultaneously
 * - Provides domain-specific convenience methods
 * - Respects user privacy preferences
 */
@Injectable({
  providedIn: 'root'
})
export class AnalyticsService {
  private providers: IAnalyticsProvider[] = [];
  private privacyService = inject(PrivacyService);

  private debugMode = false;

  /**
   * Register an analytics provider
   */
  registerProvider(provider: IAnalyticsProvider): void {
    if (!this.providers.includes(provider)) {
      this.providers.push(provider);
      
      if (this.debugMode) {
        console.log('[Analytics] Provider registered:', provider.constructor.name);
      }
    }
  }

  /**
   * Remove an analytics provider
   */
  removeProvider(provider: IAnalyticsProvider): void {
    const index = this.providers.indexOf(provider);
    if (index > -1) {
      this.providers.splice(index, 1);
    }
  }

  /**
   * Get all registered providers
   */
  getProviders(): IAnalyticsProvider[] {
    return [...this.providers];
  }

  // ============================================================================
  // Page Tracking
  // ============================================================================

  /**
   * Track a page view
   */
  trackPageView(path: string, title: string): void {
    if (this.debugMode) {
      console.log('[Analytics] trackPageView:', { path, title });
    }
    
    this.providers.forEach(provider => {
      if (provider.isEnabled()) {
        provider.trackPageView(path, title);
      }
    });
  }

  // ============================================================================
  // Exercise Events
  // ============================================================================

  /**
   * Track exercise start
   */
  trackExerciseStart(exerciseId: string, category: string, level: string, type: string): void {
    this.trackEvent('exercise_start', {
      exercise_id: exerciseId,
      exercise_category: category,
      exercise_level: level,
      exercise_type: type
    });
  }

  /**
   * Track exercise completion
   */
  trackExerciseComplete(exerciseId: string, data: ExerciseCompletionData): void {
    this.trackEvent('exercise_complete', {
      exercise_id: exerciseId,
      completion_time: data.completionTime,
      score: data.score,
      accuracy: data.accuracy,
      hints_used: data.hintsUsed
    });
  }

  /**
   * Track exercise submission
   */
  trackExerciseSubmit(exerciseId: string, isCorrect: boolean): void {
    this.trackEvent('exercise_submit', {
      exercise_id: exerciseId,
      is_correct: isCorrect
    });
  }

  /**
   * Track hint usage
   */
  trackHintUsed(exerciseId: string, hintType: string): void {
    this.trackEvent('hint_used', {
      exercise_id: exerciseId,
      hint_type: hintType
    });
  }

  /**
   * Track exercise abandonment
   */
  trackExerciseAbandoned(exerciseId: string, timeSpent: number, completionPercentage: number): void {
    this.trackEvent('exercise_abandoned', {
      exercise_id: exerciseId,
      time_spent: timeSpent,
      completion_percentage: completionPercentage
    });
  }

  // ============================================================================
  // Achievement Events
  // ============================================================================

  /**
   * Track achievement unlock
   */
  trackAchievementUnlocked(achievementId: string, achievementName: string): void {
    this.trackEvent('achievement_unlocked', {
      achievement_id: achievementId,
      achievement_name: achievementName
    });
  }

  /**
   * Track module completion
   */
  trackModuleCompleted(moduleId: string, completionTime: number, progressPercentage: number): void {
    this.trackEvent('module_completed', {
      module_id: moduleId,
      completion_time: completionTime,
      progress_percentage: progressPercentage
    });
  }

  /**
   * Track streak milestone
   */
  trackStreakMilestone(streakCount: number, milestoneType: string): void {
    this.trackEvent('streak_milestone', {
      streak_count: streakCount,
      milestone_type: milestoneType
    });
  }

  /**
   * Track level up
   */
  trackLevelUp(oldLevel: number, newLevel: number, totalPoints: number): void {
    this.trackEvent('level_up', {
      old_level: oldLevel,
      new_level: newLevel,
      total_points: totalPoints
    });
  }

  /**
   * Track daily challenge completion
   */
  trackDailyChallengeCompleted(challengeId: string): void {
    this.trackEvent('daily_challenge_completed', {
      challenge_id: challengeId
    });
  }

  // ============================================================================
  // AI Events
  // ============================================================================

  /**
   * Track AI request
   */
  trackAiRequest(provider: string, model: string, requestType: string): void {
    this.trackEvent('ai_request', {
      ai_provider: provider,
      ai_model: model,
      request_type: requestType
    });
  }

  /**
   * Track AI response
   */
  trackAiResponse(provider: string, responseTime: number, tokenCount: number): void {
    this.trackEvent('ai_response', {
      ai_provider: provider,
      response_time: responseTime,
      token_count: tokenCount
    });
  }

  /**
   * Track AI error
   */
  trackAiError(provider: string, errorType: string): void {
    this.trackEvent('ai_error', {
      ai_provider: provider,
      error_type: errorType
    });
  }

  /**
   * Track AI provider change
   */
  trackAiProviderChanged(oldProvider: string, newProvider: string): void {
    this.trackEvent('ai_provider_changed', {
      old_provider: oldProvider,
      new_provider: newProvider
    });
  }

  /**
   * Track API key configuration (without exposing the key)
   */
  trackApiKeyConfigured(provider: string): void {
    this.trackEvent('api_key_configured', {
      provider: provider
    });
  }

  // ============================================================================
  // Authentication Events
  // ============================================================================

  /**
   * Track login
   */
  trackLogin(method: string, isNewUser: boolean): void {
    this.trackEvent('login', {
      method: method,
      is_new_user: isNewUser
    });
  }

  /**
   * Track logout
   */
  trackLogout(sessionDuration: number): void {
    this.trackEvent('logout', {
      session_duration: sessionDuration
    });
  }

  /**
   * Track guest to authenticated conversion
   */
  trackGuestToAuthConversion(): void {
    this.trackEvent('guest_to_auth_conversion', {});
  }

  /**
   * Track authentication error (without exposing credentials)
   */
  trackAuthError(errorType: string): void {
    this.trackEvent('auth_error', {
      error_type: errorType
    });
  }

  /**
   * Track registration
   */
  trackRegistration(): void {
    this.trackEvent('registration', {});
  }

  // ============================================================================
  // Session Tracking
  // ============================================================================

  /**
   * Track session start
   */
  trackSessionStart(): void {
    this.trackEvent('session_start', {});
  }

  /**
   * Track session end
   */
  trackSessionEnd(duration: number, activitiesPerformed: number): void {
    this.trackEvent('session_end', {
      duration: duration,
      activities_performed: activitiesPerformed
    });
  }

  /**
   * Track user activity
   */
  trackUserActivity(): void {
    this.trackEvent('user_activity', {});
  }

  // ============================================================================
  // Feature-Specific Events
  // ============================================================================

  /**
   * Track dictation start
   */
  trackDictationStart(exerciseId: string): void {
    this.trackEvent('dictation_start', {
      exercise_id: exerciseId
    });
  }

  /**
   * Track dictation completion
   */
  trackDictationComplete(exerciseId: string, accuracy: number): void {
    this.trackEvent('dictation_complete', {
      exercise_id: exerciseId,
      accuracy: accuracy
    });
  }

  /**
   * Track review session start
   */
  trackReviewSessionStart(): void {
    this.trackEvent('review_session_start', {});
  }

  /**
   * Track review session end
   */
  trackReviewSessionEnd(itemsReviewed: number, duration: number): void {
    this.trackEvent('review_session_end', {
      items_reviewed: itemsReviewed,
      duration: duration
    });
  }

  /**
   * Track custom exercise creation
   */
  trackCustomExerciseCreated(exerciseMetadata: any): void {
    this.trackEvent('custom_exercise_created', exerciseMetadata);
  }

  /**
   * Track data export
   */
  trackDataExport(operationType: string): void {
    this.trackEvent('data_export', {
      operation_type: operationType
    });
  }

  /**
   * Track data import
   */
  trackDataImport(operationType: string): void {
    this.trackEvent('data_import', {
      operation_type: operationType
    });
  }

  /**
   * Track settings change
   */
  trackSettingsChanged(category: string, setting: string): void {
    this.trackEvent('settings_changed', {
      category: category,
      setting: setting
    });
  }

  // ============================================================================
  // Engagement Tracking
  // ============================================================================

  /**
   * Track scroll depth
   */
  trackScrollDepth(depth: number): void {
    this.trackEvent('scroll_depth', {
      depth: depth
    });
  }

  /**
   * Track external link click
   */
  trackExternalLinkClick(url: string, linkText: string): void {
    this.trackEvent('external_link_click', {
      url: url,
      link_text: linkText
    });
  }

  /**
   * Track file download
   */
  trackFileDownload(fileName: string, fileType: string): void {
    this.trackEvent('file_download', {
      file_name: fileName,
      file_type: fileType
    });
  }

  /**
   * Track search
   */
  trackSearch(searchTerm: string, resultCount: number): void {
    this.trackEvent('search', {
      search_term: searchTerm,
      result_count: resultCount
    });
  }

  // ============================================================================
  // Conversion Tracking
  // ============================================================================

  /**
   * Track conversion
   */
  trackConversion(goalName: string, value?: number): void {
    const params: any = {
      goal_name: goalName
    };
    if (value !== undefined) {
      params.value = value;
    }
    this.trackEvent('conversion', params);
  }

  /**
   * Track funnel step
   */
  trackFunnelStep(funnelName: string, stepNumber: number, stepName: string): void {
    this.trackEvent('funnel_step', {
      funnel_name: funnelName,
      step_number: stepNumber,
      step_name: stepName
    });
  }

  /**
   * Track funnel abandonment
   */
  trackFunnelAbandonment(funnelName: string, lastStep: string): void {
    this.trackEvent('funnel_abandonment', {
      funnel_name: funnelName,
      last_step: lastStep
    });
  }

  // ============================================================================
  // User Properties
  // ============================================================================

  /**
   * Set a single user property
   */
  setUserProperty(propertyName: string, value: string | number): void {
    this.providers.forEach(provider => {
      if (provider.isEnabled()) {
        provider.setUserProperty(propertyName, value);
      }
    });
  }

  /**
   * Set multiple user properties
   */
  setUserProperties(properties: Record<string, string | number>): void {
    this.providers.forEach(provider => {
      if (provider.isEnabled()) {
        provider.setUserProperties(properties);
      }
    });
  }

  /**
   * Set user ID
   */
  setUserId(userId: string | null): void {
    this.providers.forEach(provider => {
      if (provider.isEnabled()) {
        provider.setUserId(userId);
      }
    });
  }

  // ============================================================================
  // Core Tracking Method
  // ============================================================================

  // ============================================================================
  // Configuration
  // ============================================================================

  /**
   * Enable or disable analytics
   */
  setAnalyticsEnabled(enabled: boolean): void {
    // Update privacy service preference
    if (enabled) {
      this.privacyService.enableAnalytics();
    } else {
      this.privacyService.disableAnalytics();
    }

    // Update all providers
    this.providers.forEach(provider => {
      provider.setEnabled(enabled);
    });
  }

  /**
   * Check if analytics is enabled
   */
  isAnalyticsEnabled(): boolean {
    return this.privacyService.isAnalyticsEnabled() && this.providers.some(provider => provider.isEnabled());
  }

  /**
   * Enable or disable debug mode
   */
  setDebugMode(enabled: boolean): void {
    this.debugMode = enabled;
    console.log('[Analytics] Debug mode:', enabled);
    
    this.providers.forEach(provider => {
      provider.setDebugMode(enabled);
    });
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  /**
   * Track a generic event (delegates to all providers)
   */
  private trackEvent(eventName: string, eventParams?: Record<string, any>): void {
    // Check if analytics is enabled
    if (!this.privacyService.isAnalyticsEnabled()) {
      if (this.debugMode) {
        console.log('[Analytics] Tracking disabled by user preference');
      }
      return;
    }

    if (this.debugMode) {
      console.log('[Analytics] trackEvent:', eventName, eventParams);
    }

    this.providers.forEach(provider => {
      if (provider.isEnabled()) {
        try {
          provider.trackEvent(eventName, eventParams);
        } catch (error) {
          console.error('[Analytics] Error tracking event:', error);
        }
      }
    });
  }
}
