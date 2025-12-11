import { Injectable } from '@angular/core';
import { RouteReuseStrategy, ActivatedRouteSnapshot, DetachedRouteHandle } from '@angular/router';

/**
 * Custom route reuse strategy to cache and reuse route components
 * This significantly improves navigation performance by avoiding component recreation
 */
@Injectable()
export class CustomRouteReuseStrategy implements RouteReuseStrategy {
  private handlers: Map<string, DetachedRouteHandle> = new Map();
  
  // Routes that should be cached
  // Note: dashboard is excluded to ensure fresh data on navigation
  private readonly cacheableRoutes = [
    'home',
    'exercises',
    'profile',
    'favorites'
  ];

  shouldDetach(route: ActivatedRouteSnapshot): boolean {
    // Cache the route if it's in the cacheable list
    return this.cacheableRoutes.includes(route.routeConfig?.path || '');
  }

  store(route: ActivatedRouteSnapshot, handle: DetachedRouteHandle | null): void {
    if (handle) {
      const path = route.routeConfig?.path || '';
      this.handlers.set(path, handle);
      console.log('[RouteReuse] Cached route:', path);
    }
  }

  shouldAttach(route: ActivatedRouteSnapshot): boolean {
    const path = route.routeConfig?.path || '';
    return this.handlers.has(path);
  }

  retrieve(route: ActivatedRouteSnapshot): DetachedRouteHandle | null {
    const path = route.routeConfig?.path || '';
    const handle = this.handlers.get(path);
    if (handle) {
      console.log('[RouteReuse] Reusing cached route:', path);
    }
    return handle || null;
  }

  shouldReuseRoute(future: ActivatedRouteSnapshot, curr: ActivatedRouteSnapshot): boolean {
    // Reuse route if the route config is the same
    return future.routeConfig === curr.routeConfig;
  }

  // Clear cache when needed (e.g., on logout)
  clearCache(): void {
    this.handlers.clear();
    console.log('[RouteReuse] Cache cleared');
  }
}
