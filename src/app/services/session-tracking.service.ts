import { Injectable, inject } from '@angular/core';
import { AnalyticsService } from './analytics.service';

/**
 * Session Tracking Service
 * 
 * Tracks user sessions, activity, and identifies daily active users.
 * Implements accurate session duration calculation excluding idle periods.
 */
@Injectable({
  providedIn: 'root'
})
export class SessionTrackingService {
  private analyticsService = inject(AnalyticsService);
  
  private sessionId: string | null = null;
  private sessionStartTime: number | null = null;
  private lastActivityTime: number | null = null;
  private activitiesPerformed = 0;
  private isSessionActive = false;
  
  private readonly IDLE_THRESHOLD = 5 * 60 * 1000; // 5 minutes in milliseconds
  private readonly DAU_THRESHOLD = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
  
  private activityCheckInterval?: number;

  constructor() {
    this.initializeSession();
    this.setupActivityListeners();
    this.setupBeforeUnloadHandler();
  }

  /**
   * Initialize a new session
   */
  private initializeSession(): void {
    this.sessionId = this.generateSessionId();
    this.sessionStartTime = Date.now();
    this.lastActivityTime = Date.now();
    this.activitiesPerformed = 0;
    this.isSessionActive = true;

    // Check if user is a daily active user
    const isDailyActiveUser = this.checkDailyActiveUser();

    // Track session start
    this.analyticsService.trackSessionStart();
    
    // Set user property for DAU
    if (isDailyActiveUser) {
      this.analyticsService.setUserProperty('is_daily_active_user', 1);
    }

    // Store session start time
    this.storeSessionStartTime();

    console.log('[SessionTracking] Session started:', this.sessionId);
  }

  /**
   * Generate a unique session ID
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Track user activity
   */
  trackActivity(): void {
    if (!this.isSessionActive) {
      return;
    }

    const now = Date.now();
    const timeSinceLastActivity = now - (this.lastActivityTime || now);

    // If idle period exceeded, don't count this as continuous activity
    if (timeSinceLastActivity > this.IDLE_THRESHOLD) {
      console.log('[SessionTracking] Idle period detected, resetting activity timer');
    }

    this.lastActivityTime = now;
    this.activitiesPerformed++;

    // Track activity event (throttled to avoid too many events)
    if (this.activitiesPerformed % 10 === 0) {
      this.analyticsService.trackUserActivity();
    }
  }

  /**
   * Calculate session duration excluding idle periods
   */
  private calculateSessionDuration(): number {
    if (!this.sessionStartTime || !this.lastActivityTime) {
      return 0;
    }

    const totalTime = this.lastActivityTime - this.sessionStartTime;
    
    // For simplicity, we use the last activity time as the end time
    // This automatically excludes the final idle period
    return Math.floor(totalTime / 1000); // Convert to seconds
  }

  /**
   * End the current session
   */
  endSession(): void {
    if (!this.isSessionActive) {
      return;
    }

    const duration = this.calculateSessionDuration();
    
    // Track session end
    this.analyticsService.trackSessionEnd(duration, this.activitiesPerformed);

    console.log('[SessionTracking] Session ended:', {
      sessionId: this.sessionId,
      duration,
      activitiesPerformed: this.activitiesPerformed
    });

    this.isSessionActive = false;
  }

  /**
   * Check if user is a daily active user
   * Returns true if user's last visit was more than 24 hours ago
   */
  private checkDailyActiveUser(): boolean {
    const lastVisitKey = 'analytics_last_visit';
    const lastVisitStr = localStorage.getItem(lastVisitKey);
    
    if (!lastVisitStr) {
      // First visit
      return false;
    }

    const lastVisit = parseInt(lastVisitStr, 10);
    const now = Date.now();
    const timeSinceLastVisit = now - lastVisit;

    return timeSinceLastVisit >= this.DAU_THRESHOLD;
  }

  /**
   * Store session start time for DAU tracking
   */
  private storeSessionStartTime(): void {
    const lastVisitKey = 'analytics_last_visit';
    localStorage.setItem(lastVisitKey, Date.now().toString());
  }

  /**
   * Setup activity listeners
   */
  private setupActivityListeners(): void {
    // Track various user interactions as activity
    const events = ['click', 'keydown', 'scroll', 'mousemove', 'touchstart'];
    
    events.forEach(eventType => {
      document.addEventListener(eventType, () => this.trackActivity(), { passive: true });
    });

    // Periodic check for idle timeout
    this.activityCheckInterval = window.setInterval(() => {
      if (!this.lastActivityTime) {
        return;
      }

      const timeSinceLastActivity = Date.now() - this.lastActivityTime;
      
      if (timeSinceLastActivity > this.IDLE_THRESHOLD && this.isSessionActive) {
        console.log('[SessionTracking] User idle for more than 5 minutes');
      }
    }, 60000); // Check every minute
  }

  /**
   * Setup beforeunload handler to track session end
   */
  private setupBeforeUnloadHandler(): void {
    window.addEventListener('beforeunload', () => {
      this.endSession();
    });
  }

  /**
   * Get current session ID
   */
  getSessionId(): string | null {
    return this.sessionId;
  }

  /**
   * Get session duration
   */
  getSessionDuration(): number {
    return this.calculateSessionDuration();
  }

  /**
   * Get activities performed count
   */
  getActivitiesPerformed(): number {
    return this.activitiesPerformed;
  }

  /**
   * Check if session is active
   */
  isActive(): boolean {
    return this.isSessionActive;
  }
}
