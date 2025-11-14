import { Injectable } from '@angular/core';
import { PreloadingStrategy, Route } from '@angular/router';
import { Observable, of, timer } from 'rxjs';
import { mergeMap } from 'rxjs/operators';

/**
 * Custom preloading strategy that preloads routes based on priority
 * High priority routes are preloaded immediately
 * Low priority routes are preloaded after a delay
 */
@Injectable({ providedIn: 'root' })
export class SelectivePreloadStrategy implements PreloadingStrategy {
  preload(route: Route, load: () => Observable<any>): Observable<any> {
    // Check if route has preload data
    const preloadData = route.data?.['preload'];
    
    if (preloadData === false) {
      // Don't preload this route
      return of(null);
    }
    
    if (preloadData === 'high') {
      // Preload immediately for high priority routes
      // console.log('[Preload] Loading high priority:', route.path);
      return load();
    }
    
    // Default: preload after 2 seconds for other routes
    // console.log('[Preload] Scheduling:', route.path);
    return timer(2000).pipe(
      mergeMap(() => {
        // console.log('[Preload] Loading:', route.path);
        return load();
      })
    );
  }
}
