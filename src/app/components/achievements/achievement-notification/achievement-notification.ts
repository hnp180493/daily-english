import { Component, ChangeDetectionStrategy, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { trigger, transition, style, animate } from '@angular/animations';
import { NotificationService } from '../../../services/notification.service';

@Component({
  selector: 'app-achievement-notification',
  imports: [CommonModule],
  templateUrl: './achievement-notification.html',
  styleUrl: './achievement-notification.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [
    trigger('slideIn', [
      transition(':enter', [
        style({ transform: 'translateY(-100%)', opacity: 0 }),
        animate('300ms ease-out', style({ transform: 'translateY(0)', opacity: 1 }))
      ]),
      transition(':leave', [
        animate('300ms ease-in', style({ transform: 'translateY(-100%)', opacity: 0 }))
      ])
    ])
  ]
})
export class AchievementNotification {
  private notificationService = inject(NotificationService);
  private router = inject(Router);

  currentNotification = computed(() => this.notificationService.getCurrentNotification());
  isVisible = computed(() => this.currentNotification() !== null);

  viewAchievement(): void {
    this.notificationService.dismissNotification();
    this.router.navigate(['/achievements']);
  }

  dismiss(): void {
    this.notificationService.dismissNotification();
  }
}
