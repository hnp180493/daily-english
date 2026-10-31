import { Injectable, inject } from '@angular/core';
import { Observable, from, of } from 'rxjs';
import { map, switchMap, tap } from 'rxjs/operators';
import { TranslationService } from './translation.service';

/** Supplied by the caller so this service doesn't depend on ProgressService. */
export type StreakStatusFn = () => { streak: number; practicedToday: boolean };

export interface NotificationPreferences {
  enabled: boolean;
  reminderTime: string; // HH:MM format
  dailyChallengeReminder: boolean;
  goalProgressReminder: boolean;
  streakReminder: boolean;
}

const STORAGE_KEY = 'notification_preferences';

@Injectable({
  providedIn: 'root',
})
export class NotificationService {
  private translate = inject(TranslationService);
  private notificationPermission: NotificationPermission = 'default';
  private preferences: NotificationPreferences | null = null;
  private streakStatus?: StreakStatusFn;
  private dailyTimer?: ReturnType<typeof setTimeout>;
  private urgentTimer?: ReturnType<typeof setTimeout>;

  constructor() {
    this.checkNotificationSupport();
    this.loadPreferences();
  }

  // Configuration methods
  enableNotifications(): Observable<boolean> {
    if (!('Notification' in window)) {
      console.warn('This browser does not support notifications');
      return of(false);
    }

    return from(Notification.requestPermission()).pipe(
      switchMap((permission) => {
        this.notificationPermission = permission;

        if (permission === 'granted') {
          const prefs: NotificationPreferences = {
            enabled: true,
            reminderTime: '19:00',
            dailyChallengeReminder: true,
            goalProgressReminder: true,
            streakReminder: true,
          };

          this.savePreferencesToLocalStorage(prefs);
          this.preferences = prefs;
          this.scheduleNotifications(this.streakStatus);
          return of(true);
        }

        return of(false);
      })
    );
  }

  disableNotifications(): Observable<void> {
    const prefs: NotificationPreferences = {
      enabled: false,
      reminderTime: '19:00',
      dailyChallengeReminder: false,
      goalProgressReminder: false,
      streakReminder: false,
    };

    this.savePreferencesToLocalStorage(prefs);
    this.preferences = prefs;
    this.clearTimers();
    return of(undefined);
  }

  setReminderTime(time: string): Observable<void> {
    if (!this.preferences) {
      return of(undefined);
    }

    const updatedPrefs = {
      ...this.preferences,
      reminderTime: time,
    };

    this.savePreferencesToLocalStorage(updatedPrefs);
    this.preferences = updatedPrefs;
    this.scheduleNotifications(this.streakStatus);
    return of(undefined);
  }

  getPreferences(): Observable<NotificationPreferences | null> {
    return of(this.preferences);
  }

  // Notification sending methods
  sendDailyChallengeReminder(): void {
    if (!this.canSendNotification() || !this.preferences?.dailyChallengeReminder) {
      return;
    }

    this.showNotification(
      'Daily Challenge Available! 🎯',
      'Complete today\'s challenge to maintain your streak!',
      '/learning-path'
    );
  }

  sendUrgentReminder(streak: number): void {
    if (!this.canSendNotification() || !this.preferences?.streakReminder) {
      return;
    }

    const message =
      streak > 0
        ? `Don't lose your ${streak}-day streak! Only 2 hours left to complete today's challenge.`
        : 'Only 2 hours left to complete today\'s challenge!';

    this.showNotification('⏰ Urgent Reminder', message, '/learning-path');
  }

  sendGoalProgressUpdate(remaining: number): void {
    if (!this.canSendNotification() || !this.preferences?.goalProgressReminder) {
      return;
    }

    this.showNotification(
      'Almost There! 🎉',
      `Just ${remaining} more exercise${remaining > 1 ? 's' : ''} to reach your weekly goal!`,
      '/learning-path'
    );
  }

  sendGoalAchievement(bonusPoints?: number): void {
    if (!this.canSendNotification() || !this.preferences?.goalProgressReminder) {
      return;
    }

    const points = bonusPoints || 'bonus';
    this.showNotification(
      'Goal Achieved! 🏆',
      `Congratulations! You've reached your weekly goal and earned ${points} points!`,
      '/learning-path'
    );
  }

  sendStreakMilestone(days: number): void {
    if (!this.canSendNotification() || !this.preferences?.streakReminder) {
      return;
    }

    const emoji = days >= 30 ? '🔥🔥🔥' : days >= 7 ? '🔥🔥' : '🔥';
    this.showNotification(
      `${days}-Day Streak! ${emoji}`,
      `Amazing! You've maintained a ${days}-day learning streak!`,
      '/learning-path'
    );
  }

  sendPathCompletion(pathName: string): void {
    if (!this.canSendNotification()) {
      return;
    }

    this.showNotification(
      'Path Completed! 🎓',
      `Congratulations! You've completed the ${pathName} and earned 5000 bonus points!`,
      '/learning-path'
    );
  }

  sendModuleUnlock(moduleName: string): void {
    if (!this.canSendNotification()) {
      return;
    }

    this.showNotification(
      'New Module Unlocked! 🔓',
      `Great progress! You've unlocked: ${moduleName}`,
      '/learning-path'
    );
  }

  // Private helper methods
  private checkNotificationSupport(): void {
    if ('Notification' in window) {
      this.notificationPermission = Notification.permission;
    }
  }

  private loadPreferences(): void {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        this.preferences = JSON.parse(stored);
      } catch (e) {
        console.error('Failed to parse notification preferences:', e);
        this.preferences = null;
      }
    }
  }

  private savePreferencesToLocalStorage(prefs: NotificationPreferences): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  }

  private canSendNotification(): boolean {
    return (
      'Notification' in window &&
      this.notificationPermission === 'granted' &&
      this.preferences?.enabled === true
    );
  }

  private showNotification(title: string, body: string, url?: string): void {
    if (!this.canSendNotification()) {
      return;
    }

    const notification = new Notification(title, {
      body,
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      tag: 'daily-english-notification',
      requireInteraction: false,
    });

    if (url) {
      notification.onclick = () => {
        window.focus();
        window.location.href = url;
        notification.close();
      };
    }

    // Auto-close after 10 seconds
    setTimeout(() => notification.close(), 10000);
  }

  // Schedule notifications (setTimeout based — only fires while the tab/PWA is open).
  // Safe to call repeatedly: existing timers are replaced.
  scheduleNotifications(streakStatus?: StreakStatusFn): void {
    if (streakStatus) this.streakStatus = streakStatus;
    this.clearTimers();
    if (!this.preferences?.enabled) {
      return;
    }

    // Schedule daily challenge reminder
    this.scheduleDailyReminder();

    // Schedule urgent reminder (2 hours before midnight)
    this.scheduleUrgentReminder();
  }

  private clearTimers(): void {
    if (this.dailyTimer) clearTimeout(this.dailyTimer);
    if (this.urgentTimer) clearTimeout(this.urgentTimer);
    this.dailyTimer = this.urgentTimer = undefined;
  }

  private scheduleDailyReminder(): void {
    if (!this.preferences?.dailyChallengeReminder) {
      return;
    }

    const [hours, minutes] = this.preferences.reminderTime.split(':').map(Number);
    const now = new Date();
    const scheduledTime = new Date();
    scheduledTime.setHours(hours, minutes, 0, 0);

    if (scheduledTime <= now) {
      scheduledTime.setDate(scheduledTime.getDate() + 1);
    }

    const delay = scheduledTime.getTime() - now.getTime();

    this.dailyTimer = setTimeout(() => {
      this.sendDailyChallengeReminder();
      // Reschedule for next day
      this.scheduleDailyReminder();
    }, delay);
  }

  private scheduleUrgentReminder(): void {
    if (!this.preferences?.streakReminder) {
      return;
    }

    const now = new Date();
    const urgentTime = new Date();
    urgentTime.setHours(22, 0, 0, 0); // 10 PM

    if (urgentTime <= now) {
      urgentTime.setDate(urgentTime.getDate() + 1);
    }

    const delay = urgentTime.getTime() - now.getTime();

    this.urgentTimer = setTimeout(() => {
      // Only warn when there is a streak to lose and today isn't done yet.
      const status = this.streakStatus?.();
      if (status && status.streak > 0 && !status.practicedToday) {
        this.sendStreakWarning(status.streak);
      }
      // Reschedule for next day
      this.scheduleUrgentReminder();
    }, delay);
  }

  sendStreakWarning(streak: number): void {
    if (!this.canSendNotification() || !this.preferences?.streakReminder) {
      return;
    }
    this.showNotification(
      this.translate.t('streak_warning.title').replace('{days}', String(streak)),
      this.translate.t('streak_warning.body'),
      '/exercises'
    );
  }

  // Methods for achievement notifications
  getCurrentNotification(): any {
    // Placeholder for achievement notification system
    return null;
  }

  dismissNotification(): void {
    // Placeholder for dismissing notifications
    console.log('Notification dismissed');
  }
}
