import { Injectable, inject } from '@angular/core';
import { Router, NavigationStart, NavigationEnd, NavigationCancel, NavigationError } from '@angular/router';
import { filter } from 'rxjs/operators';

/**
 * Service to optimize navigation performance
 * Tracks navigation timing and provides insights
 */
@Injectable({ providedIn: 'root' })
export class NavigationOptimizerService {
  private router = inject(Router);
  private navigationStartTime = 0;

  constructor() {
    this.setupNavigationTracking();
  }

  private setupNavigationTracking(): void {
    // Track navigation start
    this.router.events
      .pipe(filter(event => event instanceof NavigationStart))
      .subscribe(() => {
        this.navigationStartTime = performance.now();
      });

    // Track navigation end
    this.router.events
      .pipe(
        filter(
          event =>
            event instanceof NavigationEnd ||
            event instanceof NavigationCancel ||
            event instanceof NavigationError
        )
      )
      .subscribe(event => {
        if (this.navigationStartTime > 0) {
          const duration = performance.now() - this.navigationStartTime;
          
          if (duration > 500) {
            console.warn(`[Navigation] Slow navigation detected: ${duration.toFixed(2)}ms`, {
              url: event instanceof NavigationEnd ? event.urlAfterRedirects : 'cancelled/error',
              type: event.constructor.name
            });
          } else {
            console.log(`[Navigation] Completed in ${duration.toFixed(2)}ms`);
          }
          
          this.navigationStartTime = 0;
        }
      });
  }
}
