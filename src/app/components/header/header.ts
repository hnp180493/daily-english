import { Component, ChangeDetectionStrategy, inject, computed, effect, signal, OnInit, HostListener, ElementRef, viewChild, WritableSignal } from '@angular/core';
import { RouterLink, RouterLinkActive, Router, NavigationEnd } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs/operators';
import { CommonModule } from '@angular/common';
import { AuthStatus } from '../auth-status/auth-status';
import { FavoriteService } from '../../services/favorite.service';
import { ProgressService } from '../../services/progress.service';
import { AchievementService } from '../../services/achievement.service';
import { PointsAnimationService } from '../../services/points-animation.service';
import { ReviewService } from '../../services/review.service';
import { AuthService } from '../../services/auth.service';
import { FeatureFlagService } from '../../services/feature-flag.service';
import { SettingsService } from '../../services/settings.service';
import { ToastService } from '../../services/toast.service';
import { TranslationService } from '../../services/translation.service';
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
  private featureFlagService = inject(FeatureFlagService);
  private settingsService = inject(SettingsService);
  private toastService = inject(ToastService);
  private router = inject(Router);
  protected translate = inject(TranslationService);

  // Language toggle (vi ↔ en)
  private settingsSignal = this.settingsService.getSettingsSignal();
  currentLanguage = computed(() => this.settingsSignal().uiLanguage);
  languageLabel = computed(() => this.currentLanguage() === 'vi' ? 'VI' : 'EN');
  languageTooltip = computed(() =>
    this.currentLanguage() === 'vi'
      ? this.translate.t('header.lang.tooltip_to_en')
      : this.translate.t('header.lang.tooltip_to_vi')
  );

  toggleLanguage(): void {
    const next = this.currentLanguage() === 'vi' ? 'en' : 'vi';
    this.settingsService.setUILanguage(next);
    if (next === 'en') {
      this.toastService.info(this.translate.t('toast.lang.switched_to_en'), 5000);
    } else {
      this.toastService.success(this.translate.t('toast.lang.switched_to_vi'), 2000);
    }
  }

  // Check if user is authenticated
  isAuthenticated = computed(() => !!this.authService.currentUser());
  
  // Check if user is beta tester
  isBetaTester = computed(() => this.featureFlagService.isBetaTester());
  
  favoriteCount = computed(() => this.favoriteService.favoriteCount());
  achievementCount = computed(() => this.achievementService.unlockedAchievements().length);
  
  // Dropdown menu state
  showLearningMenu = signal(false);
  private menuCloseTimeout: any = null;
  private menuOpenedByHover = false;
  private learningMenuRef = viewChild<ElementRef<HTMLElement>>('learningMenu');
  private learningMenuTriggerRef = viewChild<ElementRef<HTMLButtonElement>>('learningMenuTrigger');
  
  // Review queue badge
  reviewQueue = this.reviewService.getReviewQueueSignal();
  dueReviewCount = computed(() => {
    const queue = this.reviewQueue();
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    return queue.filter(item => {
      const reviewDate = new Date(item.nextReviewDate);
      const reviewDay = new Date(reviewDate.getFullYear(), reviewDate.getMonth(), reviewDate.getDate());
      return reviewDay <= today;
    }).length;
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
  // Signals (not plain fields) so the effects re-run when an animation ends and re-sync
  // with whatever the latest value is by then.
  private isAnimatingPoints = signal(false);

  // Animated achievement count
  private animatedAchievementCount = signal(0);
  private isAnimatingAchievements = signal(false);
  
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
    // Animated points: count up on increase, set directly on first load / decrease
    effect(() => this.syncAnimatedValue(this.totalPoints(), this.animatedPoints, this.isAnimatingPoints));

    // Animated achievement count
    effect(() =>
      this.syncAnimatedValue(this.achievementCount(), this.animatedAchievementCount, this.isAnimatingAchievements)
    );

    // Close the "More" menu after any navigation (item picked, back button, programmatic)
    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        takeUntilDestroyed()
      )
      .subscribe(() => this.closeLearningMenu());
  }

  /**
   * Bring `display` towards `actual`. While an animation runs we do nothing; because
   * `isAnimating` is a signal, the effect re-runs when it ends and picks up any change
   * (increase or decrease) that happened in the meantime.
   */
  private syncAnimatedValue(
    actual: number,
    display: WritableSignal<number>,
    isAnimating: WritableSignal<boolean>
  ): void {
    if (isAnimating()) return;
    const current = display();
    if (actual === current) return;

    // First load or a decrease: set immediately without animation
    if (current === 0 || actual < current) {
      display.set(actual);
      return;
    }

    isAnimating.set(true);
    // Use requestAnimationFrame to avoid blocking navigation
    requestAnimationFrame(() => {
      this.animateCount(current, actual, display, () => isAnimating.set(false));
    });
  }

  ngOnInit(): void {
    // Review queue is loaded by ReviewService after auth is stable
    // No need to load here - just use the signal from ReviewService
  }
  
  private loadReviewQueue(): void {
    this.reviewService.getReviewQueue().subscribe({
      next: (queue) => {
        console.log('[Header] Review queue loaded:', queue.length, 'items');
      },
      error: (error) => {
        console.error('[Header] Failed to load review queue:', error);
      }
    });
  }

  navigateToReviewQueue(): void {
    // This will be called from the template
    console.log('[Header] Navigate to review queue');
  }
  
  /** True when the current page lives under the "More" menu. */
  isLearningMenuActive(): boolean {
    const path = this.router.url.split(/[?#]/)[0];
    if (path === '/') return true; // sentence writing (home) moved into "More"
    const sections = ['/flashcards', '/dashboard', '/exercises', '/guide', '/grammar-lessons', '/reading', '/writing', '/listening'];
    if (this.isAuthenticated()) sections.push('/learning-path');
    return sections.some((s) => path.startsWith(s));
  }
  
  /** Click / tap / Enter / Space on the trigger toggles the menu. */
  onMenuTriggerClick(): void {
    this.clearMenuCloseTimeout();
    if (this.menuOpenedByHover) {
      // Mouse hovered it open, then clicked: keep it open instead of closing it immediately
      this.menuOpenedByHover = false;
      this.showLearningMenu.set(true);
      return;
    }
    this.showLearningMenu.update((open) => !open);
  }

  /** Hover-to-open is for real mouse pointers only; touch taps go through the click toggle. */
  onMenuPointerEnter(event: PointerEvent): void {
    if (event.pointerType !== 'mouse') return;
    this.clearMenuCloseTimeout();
    if (!this.showLearningMenu()) {
      this.menuOpenedByHover = true;
      this.showLearningMenu.set(true);
    }
  }

  onMenuPointerLeave(event: PointerEvent): void {
    if (event.pointerType !== 'mouse') return;
    this.clearMenuCloseTimeout();
    // Add delay before closing menu
    this.menuCloseTimeout = setTimeout(() => {
      this.closeLearningMenu();
    }, 200); // 200ms delay
  }

  onMenuItemClick(event: MouseEvent): void {
    if ((event.target as HTMLElement | null)?.closest('a')) {
      this.closeLearningMenu();
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.showLearningMenu()) return;
    const menu = this.learningMenuRef()?.nativeElement;
    if (menu && !menu.contains(event.target as Node)) {
      this.closeLearningMenu();
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (!this.showLearningMenu()) return;
    this.closeLearningMenu();
    this.learningMenuTriggerRef()?.nativeElement.focus();
  }

  private closeLearningMenu(): void {
    this.clearMenuCloseTimeout();
    this.menuOpenedByHover = false;
    this.showLearningMenu.set(false);
  }

  private clearMenuCloseTimeout(): void {
    if (this.menuCloseTimeout) {
      clearTimeout(this.menuCloseTimeout);
      this.menuCloseTimeout = null;
    }
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
