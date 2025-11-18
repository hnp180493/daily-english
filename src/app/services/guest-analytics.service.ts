import { Injectable } from '@angular/core';

/**
 * Guest Analytics Service
 * Tracks guest user engagement metrics in localStorage
 * Data is cleared when user logs in
 */
@Injectable({
  providedIn: 'root'
})
export class GuestAnalyticsService {
  private readonly ANALYTICS_KEY = 'guest_analytics';

  /**
   * Get or create guest user identifier
   */
  getGuestUserId(): string {
    const analytics = this.loadAnalytics();
    
    if (!analytics.guestUserId) {
      // Generate unique guest ID
      analytics.guestUserId = this.generateGuestId();
      this.saveAnalytics(analytics);
    }
    
    return analytics.guestUserId;
  }

  /**
   * Track first exercise completion
   */
  trackFirstExerciseCompletion(): void {
    const analytics = this.loadAnalytics();
    
    if (!analytics.firstExerciseTimestamp) {
      analytics.firstExerciseTimestamp = new Date().toISOString();
      this.saveAnalytics(analytics);
      console.log('[GuestAnalytics] First exercise completed at:', analytics.firstExerciseTimestamp);
    }
  }

  /**
   * Increment total exercises completed
   */
  incrementExercisesCompleted(): void {
    const analytics = this.loadAnalytics();
    analytics.totalExercisesCompleted = (analytics.totalExercisesCompleted || 0) + 1;
    this.saveAnalytics(analytics);
    console.log('[GuestAnalytics] Total exercises completed:', analytics.totalExercisesCompleted);
  }

  /**
   * Get analytics data
   */
  getAnalytics(): GuestAnalytics {
    return this.loadAnalytics();
  }

  /**
   * Clear all analytics data (called on login)
   */
  clearAnalytics(): void {
    try {
      localStorage.removeItem(this.ANALYTICS_KEY);
      console.log('[GuestAnalytics] Analytics data cleared');
    } catch (error) {
      console.error('[GuestAnalytics] Failed to clear analytics:', error);
    }
  }

  /**
   * Load analytics from localStorage
   */
  private loadAnalytics(): GuestAnalytics {
    try {
      const data = localStorage.getItem(this.ANALYTICS_KEY);
      if (!data) {
        return this.getDefaultAnalytics();
      }
      
      const analytics = JSON.parse(data);
      return this.validateAnalytics(analytics);
    } catch (error) {
      console.error('[GuestAnalytics] Failed to load analytics, resetting:', error);
      return this.getDefaultAnalytics();
    }
  }

  /**
   * Save analytics to localStorage
   */
  private saveAnalytics(analytics: GuestAnalytics): void {
    try {
      const data = JSON.stringify(analytics);
      localStorage.setItem(this.ANALYTICS_KEY, data);
    } catch (error) {
      console.error('[GuestAnalytics] Failed to save analytics:', error);
    }
  }

  /**
   * Generate unique guest user ID
   */
  private generateGuestId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 15);
    return `guest_${timestamp}_${random}`;
  }

  /**
   * Validate analytics data structure
   */
  private validateAnalytics(analytics: any): GuestAnalytics {
    return {
      guestUserId: typeof analytics.guestUserId === 'string' ? analytics.guestUserId : '',
      firstExerciseTimestamp: typeof analytics.firstExerciseTimestamp === 'string' 
        ? analytics.firstExerciseTimestamp 
        : null,
      totalExercisesCompleted: typeof analytics.totalExercisesCompleted === 'number' 
        ? analytics.totalExercisesCompleted 
        : 0
    };
  }

  /**
   * Get default analytics structure
   */
  private getDefaultAnalytics(): GuestAnalytics {
    return {
      guestUserId: '',
      firstExerciseTimestamp: null,
      totalExercisesCompleted: 0
    };
  }
}

/**
 * Guest Analytics Data Structure
 */
export interface GuestAnalytics {
  guestUserId: string;
  firstExerciseTimestamp: string | null;
  totalExercisesCompleted: number;
}
