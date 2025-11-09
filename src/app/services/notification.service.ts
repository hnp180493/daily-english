import { Injectable, signal } from '@angular/core';
import { Achievement, AchievementNotification } from '../models/achievement.model';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private notificationQueue = signal<AchievementNotification[]>([]);
  private currentNotification = signal<AchievementNotification | null>(null);
  private isProcessing = false;
  private dismissTimer: any = null;

  queueNotifications(achievements: Achievement[]): void {
    const notifications = achievements.map(achievement => ({
      achievement,
      name: achievement.name,
      rarity: achievement.rarity,
      iconUrl: achievement.iconUrl,
      timestamp: new Date()
    }));

    this.notificationQueue.update(queue => [...queue, ...notifications]);
    this.processQueue();
  }

  private processQueue(): void {
    if (this.isProcessing || this.notificationQueue().length === 0) {
      return;
    }

    this.isProcessing = true;
    const [next, ...rest] = this.notificationQueue();
    this.notificationQueue.set(rest);
    this.currentNotification.set(next);

    // Auto-dismiss after 5 seconds
    this.dismissTimer = setTimeout(() => {
      this.dismissNotification();
      
      // Process next notification after 1 second delay
      setTimeout(() => {
        this.isProcessing = false;
        this.processQueue();
      }, 1000);
    }, 5000);
  }

  dismissNotification(): void {
    if (this.dismissTimer) {
      clearTimeout(this.dismissTimer);
      this.dismissTimer = null;
    }
    this.currentNotification.set(null);
  }

  getCurrentNotification(): AchievementNotification | null {
    return this.currentNotification();
  }

  // Expose signal for components to subscribe
  get currentNotification$() {
    return this.currentNotification;
  }
}
