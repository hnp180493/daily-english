import { Component, ChangeDetectionStrategy, inject, computed, effect, signal, OnInit } from '@angular/core';
import { RouterLink, RouterLinkActive, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthStatus } from '../auth-status/auth-status';
import { FavoriteService } from '../../services/favorite.service';
import { ProgressService } from '../../services/progress.service';
import { AchievementService } from '../../services/achievement.service';
import { PointsAnimationService } from '../../services/points-animation.service';
import { ReviewService } from '../../services/review.service';
import { AuthService } from '../../services/auth.service';
import { UserProgressHelper } from '../../models/exercise.model';

@Component({
  selector: 'app-header',
  imports: [CommonModule, RouterLink, RouterLinkActive, AuthStatus],
  templateUrl: './header.html',
  styleUrl: './header.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HeaderComponent implements OnInit {
  private favoriteService = inject(FavoriteService);
  private progressService = inject(ProgressService);
  private achievementService = inject(AchievementService);
  private pointsAnimationService = inject(PointsAnimationService);
  private reviewService = inject(ReviewService);
  private authService = inject(AuthService);
  private router = inject(Router);
  
  // Check if user is authenticated
  isAuthenticated = computed(() => !!this.authService.currentUser());
  
  appTitle = 'English';
  favoriteCount = computed(() => this.favoriteService.favoriteCount());
  achievementCount = computed(() => this.achievementService.unlockedAchievements().length);
  
  // Dropdown menu state
  showLearningMenu = signal(false);
  private menuCloseTimeout: any = null;
  
  // Review queue badge
  reviewQueue = this.reviewService.getReviewQueueSignal();
  dueReviewCount = computed(() => {
    const queue = this.reviewQueue();
    const now = new Date();
    return queue.filter(item => item.nextReviewDate <= now).length;
  });
  
  urgentReviewCount = computed(() => {
    const queue = this.reviewQueue();
    return queue.filter(item => item.urgency === 'high').length;
  });
  
  // Use signal directly from service for better reactivity
  private progressSignal = this.progressService.getProgressSignal();
  
  // Use computed to ensure reactivity
  streak = computed(() => {
    this.progressSignal(); // Access to trigger reactivity
    return this.progressService.calculateStreak();
  });
  
  // Animated points display
  private animatedPoints = signal(0);
  private isAnimatingPoints = false;
  
  // Animated achievement count
  private animatedAchievementCount = signal(0);
  private isAnimatingAchievements = false;
  
  totalPoints = computed(() => {
    const progress = this.progressSignal();
    console.log('[Header] totalPoints computed:', {
      totalPoints: progress.totalPoints,
      attempts: UserProgressHelper.getAttemptsCount(progress),
      timestamp: new Date().toISOString()
    });
    return progress.totalPoints;
  });
  
  // Display animated points instead of actual points
  displayPoints = computed(() => this.animatedPoints());
  
  // Display animated achievement count
  displayAchievementCount = computed(() => this.animatedAchievementCount());
  
  flyingPoints = computed(() => this.pointsAnimationService.getFlyingPoints()());
  
  constructor() {
    // Initialize animated points on first load
    effect(() => {
      const actualPoints = this.totalPoints();
      const currentAnimated = this.animatedPoints();
      
      // First load: set immediately without animation
      if (currentAnimated === 0 && actualPoints > 0) {
        this.animatedPoints.set(actualPoints);
        return;
      }
      
      // If points increased and not currently animating, start animation
      if (actualPoints > currentAnimated && !this.isAnimatingPoints) {
        // Use requestAnimationFrame to avoid blocking navigation
        requestAnimationFrame(() => {
          this.animateCount(currentAnimated, actualPoints, this.animatedPoints, () => {
            this.isAnimatingPoints = false;
          });
        });
        this.isAnimatingPoints = true;
      }
    });
    
    // Initialize animated achievement count
    effect(() => {
      const actualCount = this.achievementCount();
      const currentAnimated = this.animatedAchievementCount();
      
      // First load: set immediately without animation
      if (currentAnimated === 0 && actualCount > 0) {
        this.animatedAchievementCount.set(actualCount);
        return;
      }
      
      // If count increased and not currently animating, start animation
      if (actualCount > currentAnimated && !this.isAnimatingAchievements) {
        // Use requestAnimationFrame to avoid blocking navigation
        requestAnimationFrame(() => {
          this.animateCount(currentAnimated, actualCount, this.animatedAchievementCount, () => {
            this.isAnimatingAchievements = false;
          });
        });
        this.isAnimatingAchievements = true;
      }
    });
  }

  ngOnInit(): void {
    // Load review queue to populate badge
    this.reviewService.getReviewQueue().subscribe();
  }

  navigateToReviewQueue(): void {
    // This will be called from the template
    console.log('[Header] Navigate to review queue');
  }
  
  isLearningMenuActive(): boolean {
    const url = this.router.url;
    const isLearningPath = url.includes('/learning-path');
    
    // For authenticated users, include learning-path in active check
    if (this.isAuthenticated()) {
      return isLearningPath || url.includes('/dashboard') || url.includes('/exercises/custom') || url.includes('/guide');
    }
    
    // For guest users, exclude learning-path
    return url.includes('/dashboard') || url.includes('/exercises/custom') || url.includes('/guide');
  }
  
  onMenuMouseEnter(): void {
    // Clear any pending close timeout
    if (this.menuCloseTimeout) {
      clearTimeout(this.menuCloseTimeout);
      this.menuCloseTimeout = null;
    }
    this.showLearningMenu.set(true);
  }
  
  onMenuMouseLeave(): void {
    // Add delay before closing menu
    this.menuCloseTimeout = setTimeout(() => {
      this.showLearningMenu.set(false);
      this.menuCloseTimeout = null;
    }, 200); // 200ms delay
  }
  
  private animateCount(
    from: number,
    to: number,
    targetSignal: any,
    onComplete: () => void
  ): void {
    const duration = 600; // 600ms for counting animation
    const steps = 30;
    const increment = (to - from) / steps;
    const stepDuration = duration / steps;
    
    let current = from;
    let step = 0;
    
    const animate = () => {
      step++;
      current += increment;
      
      if (step < steps) {
        targetSignal.set(Math.round(current));
        setTimeout(animate, stepDuration);
      } else {
        targetSignal.set(to);
        onComplete();
      }
    };
    
    animate();
  }
}
