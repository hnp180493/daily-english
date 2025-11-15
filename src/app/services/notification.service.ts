import { Injectable, inject } from '@angular/core';
import { Observable, from, of } from 'rxjs';
import { map, switchMap, tap } from 'rxjs/operators';
import { DatabaseService } from './database/database.service';
import { AuthService } from './auth.service';

export interface NotificationPreferences {
  userId: string;
  enabled: boolean;
  reminderTime: string; // HH:MM format
  dailyChallengeReminder: boolean;
  goalProgressReminder: boolean;
  streakReminder: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class NotificationService {
  private db = inject(DatabaseService);
  private auth = inject(AuthService);

  private notificationPermission: NotificationPermission = 'default';
  private preferences: NotificationPreferences | null = null;

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
          const userId = this.auth.getUserId();
          if (!userId) return of(false);

          const prefs: NotificationPreferences = {
            userId,
            enabled: true,
            reminderTime: '19:00',
            dailyChallengeReminder: true,
            goalProgressReminder: true,
            streakReminder: true,
          };

          return from(this.db.saveNotificationPreferencesAuto(prefs)).pipe(
            tap(() => (this.preferences = prefs)),
            map(() => true)
          );
        }

        return of(false);
      })
    );
  }

  disableNotifications(): Observable<void> {
    const userId = this.auth.getUserId();
    if (!userId) return of(undefined);

    const prefs: NotificationPreferences = {
      userId,
      enabled: false,
      reminderTime: '19:00',
      dailyChallengeReminder: false,
      goalProgressReminder: false,
      streakReminder: false,
    };

    return from(this.db.saveNotificationPreferencesAuto(prefs)).pipe(
      tap(() => (this.preferences = prefs)),
      map(() => undefined)
    );
  }

  setReminderTime(time: string): Observable<void> {
    if (!this.preferences) {
      return of(undefined);
    }

    const updatedPrefs = {
      ...this.preferences,
      reminderTime: time,
    };

    return from(this.db.saveNotificationPreferencesAuto(updatedPrefs)).pipe(
      tap(() => (this.preferences = updatedPrefs)),
      map(() => undefined)
    );
  }

  getPreferences(): Observable<NotificationPreferences | null> {
    return from(this.db.loadNotificationPreferencesAuto()).pipe(
      tap((prefs) => (this.preferences = prefs))
    );
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

  sendGoalAchievement(): void {
    if (!this.canSendNotification() || !this.preferences?.goalProgressReminder) {
      return;
    }

    this.showNotification(
      'Goal Achieved! 🏆',
      'Congratulations! You\'ve reached your weekly goal and earned 500 bonus points!',
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
    this.getPreferences().subscribe((prefs) => {
      this.preferences = prefs;
    });
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

  // Schedule notifications (simplified version - in production, use Service Workers)
  scheduleNotifications(): void {
    if (!this.preferences?.enabled) {
      return;
    }

    // Schedule daily challenge reminder
    this.scheduleDailyReminder();

    // Schedule urgent reminder (2 hours before midnight)
    this.scheduleUrgentReminder();
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

    setTimeout(() => {
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

    setTimeout(() => {
      // Check if challenge is completed before sending
      // This would need to be integrated with daily challenge service
      this.sendUrgentReminder(0);
      // Reschedule for next day
      this.scheduleUrgentReminder();
    }, delay);
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
