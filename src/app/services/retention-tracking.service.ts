import { Injectable, inject } from '@angular/core';
import { AnalyticsService } from './analytics.service';

/**
 * Service to track user retention and cohort behavior
 * Manages first visit tracking, return visit calculations, and retention milestones
 */
@Injectable({
  providedIn: 'root'
})
export class RetentionTrackingService {
  private analytics = inject(AnalyticsService);
  
  private readonly STORAGE_KEY_FIRST_VISIT = 'analytics_first_visit';
  private readonly STORAGE_KEY_LAST_VISIT = 'analytics_last_visit';
  private readonly STORAGE_KEY_RETENTION_MILESTONES = 'analytics_retention_milestones';

  /**
   * Initialize retention tracking
   * Should be called when the application starts
   */
  initialize(): void {
    const now = Date.now();
    const firstVisit = this.getFirstVisit();
    const lastVisit = this.getLastVisit();

    if (!firstVisit) {
      // First time user
      this.setFirstVisit(now);
      this.setLastVisit(now);
      this.trackFirstVisit();
    } else {
      // Returning user
      const daysSinceLastVisit = lastVisit ? this.calculateDaysSince(lastVisit) : 0;
      const daysSinceFirstVisit = this.calculateDaysSince(firstVisit);
      
      this.setLastVisit(now);
      this.trackReturnVisit(daysSinceLastVisit, daysSinceFirstVisit);
      
      // Check and track retention milestones
      this.checkRetentionMilestones(daysSinceFirstVisit);
    }

    // Set user lifecycle property
    this.setUserLifecycleProperty(firstVisit, lastVisit);
  }

  /**
   * Track first visit
   */
  private trackFirstVisit(): void {
    this.analytics.trackConversion('first_visit', 0);
    this.analytics.setUserProperty('user_cohort', this.formatDate(Date.now()));
  }

  /**
   * Track return visit
   */
  private trackReturnVisit(daysSinceLastVisit: number, daysSinceFirstVisit: number): void {
    this.analytics.setUserProperty('days_since_last_visit', daysSinceLastVisit);
    this.analytics.setUserProperty('days_since_first_visit', daysSinceFirstVisit);

    // Mark as daily active user if returning after 24+ hours
    if (daysSinceLastVisit >= 1) {
      this.analytics.trackConversion('daily_active_user', daysSinceLastVisit);
    }
  }

  /**
   * Check and track retention milestones
   */
  private checkRetentionMilestones(daysSinceFirstVisit: number): void {
    const milestones = this.getTrackedMilestones();
    const milestonesToTrack = [
      { days: 1, name: '1_day' },
      { days: 7, name: '7_day' },
      { days: 30, name: '30_day' }
    ];

    for (const milestone of milestonesToTrack) {
      if (daysSinceFirstVisit >= milestone.days && !milestones.has(milestone.name)) {
        this.trackRetentionMilestone(milestone.name, daysSinceFirstVisit);
        milestones.add(milestone.name);
      }
    }

    this.saveTrackedMilestones(milestones);
  }

  /**
   * Track retention milestone
   */
  private trackRetentionMilestone(milestoneName: string, daysSinceFirstVisit: number): void {
    this.analytics.trackConversion(`retention_${milestoneName}`, daysSinceFirstVisit);
  }

  /**
   * Set user lifecycle property
   */
  private setUserLifecycleProperty(firstVisit: number | null, lastVisit: number | null): void {
    if (!firstVisit) {
      this.analytics.setUserProperty('user_lifecycle', 'new');
      return;
    }

    const daysSinceLastVisit = lastVisit ? this.calculateDaysSince(lastVisit) : 0;
    
    let lifecycle: string;
    if (daysSinceLastVisit === 0) {
      lifecycle = 'new';
    } else if (daysSinceLastVisit <= 30) {
      lifecycle = 'returning';
    } else {
      lifecycle = 'churned';
    }

    this.analytics.setUserProperty('user_lifecycle', lifecycle);
  }

  /**
   * Calculate days since a timestamp
   */
  private calculateDaysSince(timestamp: number): number {
    const now = Date.now();
    const diffMs = now - timestamp;
    return Math.floor(diffMs / (1000 * 60 * 60 * 24));
  }

  /**
   * Format date as YYYY-MM-DD
   */
  private formatDate(timestamp: number): string {
    const date = new Date(timestamp);
    return date.toISOString().split('T')[0];
  }

  /**
   * Get first visit timestamp from localStorage
   */
  private getFirstVisit(): number | null {
    const value = localStorage.getItem(this.STORAGE_KEY_FIRST_VISIT);
    return value ? parseInt(value, 10) : null;
  }

  /**
   * Set first visit timestamp in localStorage
   */
  private setFirstVisit(timestamp: number): void {
    localStorage.setItem(this.STORAGE_KEY_FIRST_VISIT, timestamp.toString());
  }

  /**
   * Get last visit timestamp from localStorage
   */
  private getLastVisit(): number | null {
    const value = localStorage.getItem(this.STORAGE_KEY_LAST_VISIT);
    return value ? parseInt(value, 10) : null;
  }

  /**
   * Set last visit timestamp in localStorage
   */
  private setLastVisit(timestamp: number): void {
    localStorage.setItem(this.STORAGE_KEY_LAST_VISIT, timestamp.toString());
  }

  /**
   * Get tracked milestones from localStorage
   */
  private getTrackedMilestones(): Set<string> {
    const value = localStorage.getItem(this.STORAGE_KEY_RETENTION_MILESTONES);
    return value ? new Set(JSON.parse(value)) : new Set();
  }

  /**
   * Save tracked milestones to localStorage
   */
  private saveTrackedMilestones(milestones: Set<string>): void {
    localStorage.setItem(this.STORAGE_KEY_RETENTION_MILESTONES, JSON.stringify([...milestones]));
  }
}
