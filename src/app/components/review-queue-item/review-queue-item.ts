import { Component, ChangeDetectionStrategy, input, output, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReviewQueueItem as ReviewQueueItemModel, UrgencyLevel } from '../../models/review.model';

@Component({
  selector: 'app-review-queue-item',
  imports: [CommonModule],
  templateUrl: './review-queue-item.html',
  styleUrl: './review-queue-item.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ReviewQueueItem {
  // Input signals
  item = input.required<ReviewQueueItemModel>();

  // Output events
  startReview = output<string>();
  startQuickReview = output<string>();

  // Expose UrgencyLevel enum to template
  UrgencyLevel = UrgencyLevel;

  // Computed signal for formatted date
  formattedDate = computed(() => this.formatDate(this.item().nextReviewDate));
  
  // Computed signal to check if overdue
  isOverdue = computed(() => this.formattedDate() === 'Overdue');
  
  // Computed signal to check if today
  isToday = computed(() => this.formattedDate() === 'Today');
  
  // Computed signal to check if tomorrow
  isTomorrow = computed(() => this.formattedDate() === 'Tomorrow');

  onStartReview(): void {
    this.startReview.emit(this.item().exerciseId);
  }

  onStartQuickReview(): void {
    this.startQuickReview.emit(this.item().exerciseId);
  }

  getUrgencyColor(urgency: UrgencyLevel): string {
    switch (urgency) {
      case UrgencyLevel.HIGH:
        return 'bg-red-500';
      case UrgencyLevel.MEDIUM:
        return 'bg-yellow-500';
      case UrgencyLevel.LOW:
        return 'bg-green-500';
      default:
        return 'bg-gray-500';
    }
  }

  getUrgencyLabel(urgency: UrgencyLevel): string {
    switch (urgency) {
      case UrgencyLevel.HIGH:
        return 'Urgent';
      case UrgencyLevel.MEDIUM:
        return 'Due Soon';
      case UrgencyLevel.LOW:
        return 'Scheduled';
      default:
        return 'Unknown';
    }
  }

  getUrgencyEmoji(urgency: UrgencyLevel): string {
    switch (urgency) {
      case UrgencyLevel.HIGH:
        return '🔴';
      case UrgencyLevel.MEDIUM:
        return '🟡';
      case UrgencyLevel.LOW:
        return '🟢';
      default:
        return '⚪';
    }
  }

  getUrgencyAriaLabel(urgency: UrgencyLevel): string {
    switch (urgency) {
      case UrgencyLevel.HIGH:
        return 'High urgency - Score below 60%, needs immediate attention';
      case UrgencyLevel.MEDIUM:
        return 'Medium urgency - Score between 60% and 75%, review soon';
      case UrgencyLevel.LOW:
        return 'Low urgency - Scheduled for review';
      default:
        return 'Unknown urgency';
    }
  }

  getDifficultyColor(level: string): string {
    switch (level) {
      case 'beginner':
        return 'bg-green-900/40 text-green-300 border border-green-700';
      case 'intermediate':
        return 'bg-yellow-900/40 text-yellow-300 border border-yellow-700';
      case 'advanced':
        return 'bg-red-900/40 text-red-300 border border-red-700';
      default:
        return 'bg-gray-700 text-gray-300 border border-gray-600';
    }
  }

  formatDate(date: Date): string {
    const now = new Date();
    now.setHours(0, 0, 0, 0); // Reset to start of day
    
    const reviewDate = new Date(date);
    reviewDate.setHours(0, 0, 0, 0); // Reset to start of day
    
    const diffDays = Math.floor((reviewDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return 'Overdue';
    } else if (diffDays === 0) {
      return 'Today';
    } else if (diffDays === 1) {
      return 'Tomorrow';
    } else {
      return `In ${diffDays} days`;
    }
  }

  roundScore(score: number): number {
    return Math.round(score);
  }
}
