import { Component, ChangeDetectionStrategy, computed, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ScrollingModule } from '@angular/cdk/scrolling';
import { ReviewService } from '../../services/review.service';
import { ReviewQueueItem, ReviewStats } from '../../models/review.model';
import { ReviewQueueItem as ReviewQueueItemComponent } from '../review-queue-item/review-queue-item';
import { ReviewStatsComponent } from '../review-stats/review-stats';

@Component({
  selector: 'app-review-queue',
  imports: [CommonModule, ReviewQueueItemComponent, ReviewStatsComponent, ScrollingModule],
  templateUrl: './review-queue.html',
  styleUrl: './review-queue.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReviewQueueComponent implements OnInit {
  private reviewService = inject(ReviewService);
  private router = inject(Router);

  // Signals from service
  reviewQueue = this.reviewService.getReviewQueueSignal();
  reviewStats = signal<ReviewStats>({
    reviewsThisWeek: 0,
    weakPointsImproved: 0,
    currentStreak: 0,
    totalReviewsCompleted: 0
  });

  ngOnInit(): void {
    // Force invalidate cache to ensure fresh data
    this.reviewService.invalidateCache();
    
    // Load review queue
    this.reviewService.getReviewQueue().subscribe();
    
    // Load review stats
    this.reviewService.getReviewStats().subscribe(stats => {
      this.reviewStats.set(stats);
    });
  }

  // Local filter state
  selectedUrgency = signal<'all' | 'high' | 'medium' | 'low'>('all');
  sortBy = signal<'urgency' | 'date' | 'difficulty'>('urgency');
  columnLayout = signal<1 | 2 | 3>(2); // Default to 2 columns

  // Computed grid class based on column layout
  gridClass = computed(() => {
    const cols = this.columnLayout();
    return `grid grid-cols-1 ${cols === 2 ? 'lg:grid-cols-2' : cols === 3 ? 'lg:grid-cols-3' : ''} gap-3`;
  });

  // Computed filtered and sorted queue
  filteredQueue = computed(() => {
    let queue = this.reviewQueue();
    
    // Filter: show items due within 5 days (compare dates only, not time)
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset to start of day
    
    const fiveDaysLater = new Date(today);
    fiveDaysLater.setDate(today.getDate() + 5);
    
    queue = queue.filter(item => {
      const reviewDate = new Date(item.nextReviewDate);
      reviewDate.setHours(0, 0, 0, 0); // Reset to start of day
      return reviewDate <= fiveDaysLater;
    });
    
    // Filter by urgency
    const urgency = this.selectedUrgency();
    if (urgency !== 'all') {
      queue = queue.filter(item => item.urgency === urgency);
    }
    
    // Sort
    return this.sortQueue(queue, this.sortBy());
  });

  filterByUrgency(urgency: 'all' | 'high' | 'medium' | 'low'): void {
    this.selectedUrgency.set(urgency);
  }

  setSortBy(sortBy: 'urgency' | 'date' | 'difficulty'): void {
    this.sortBy.set(sortBy);
  }

  setColumnLayout(cols: 1 | 2 | 3): void {
    this.columnLayout.set(cols);
  }

  private sortQueue(queue: ReviewQueueItem[], sortBy: string): ReviewQueueItem[] {
    const sorted = [...queue];
    
    switch (sortBy) {
      case 'urgency':
        const urgencyOrder = { high: 0, medium: 1, low: 2 };
        return sorted.sort((a, b) => urgencyOrder[a.urgency] - urgencyOrder[b.urgency]);
      
      case 'date':
        return sorted.sort((a, b) => 
          a.nextReviewDate.getTime() - b.nextReviewDate.getTime()
        );
      
      case 'difficulty':
        const difficultyOrder = { beginner: 0, intermediate: 1, advanced: 2 };
        return sorted.sort((a, b) => {
          const aLevel = a.exercise.level as string;
          const bLevel = b.exercise.level as string;
          return (difficultyOrder[aLevel as keyof typeof difficultyOrder] || 0) - 
                 (difficultyOrder[bLevel as keyof typeof difficultyOrder] || 0);
        });
      
      default:
        return sorted;
    }
  }

  startReview(exerciseId: string): void {
    this.router.navigate(['/exercise', exerciseId]);
  }

  startQuickReview(exerciseId: string): void {
    this.router.navigate(['/exercise', exerciseId], { 
      queryParams: { quickReview: 'true' } 
    });
  }
}
