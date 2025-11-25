import { Directive, HostListener, OnInit, OnDestroy, inject } from '@angular/core';
import { AnalyticsService } from '../services/analytics.service';

/**
 * Directive to track scroll depth on a page
 * Tracks when user scrolls to 25%, 50%, 75%, and 90% of page height
 */
@Directive({
  selector: '[appScrollDepthTracker]',
  standalone: true
})
export class ScrollDepthTrackerDirective implements OnInit, OnDestroy {
  private analytics = inject(AnalyticsService);
  private trackedDepths = new Set<number>();
  private readonly thresholds = [25, 50, 75, 90];

  ngOnInit(): void {
    this.trackedDepths.clear();
  }

  ngOnDestroy(): void {
    this.trackedDepths.clear();
  }

  @HostListener('window:scroll')
  onScroll(): void {
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const scrollHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    
    if (scrollHeight === 0) return;

    const scrollPercentage = Math.round((scrollTop / scrollHeight) * 100);

    for (const threshold of this.thresholds) {
      if (scrollPercentage >= threshold && !this.trackedDepths.has(threshold)) {
        this.trackedDepths.add(threshold);
        this.analytics.trackScrollDepth(threshold);
      }
    }
  }
}
