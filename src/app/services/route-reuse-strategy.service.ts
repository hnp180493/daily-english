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
  // Note: dashboard is excluded to ensure fresh data on navigation.
  // Home (path '') is intentionally not cached: it reloads learning-path data on auth changes in ngOnInit.
  // Profile is cached; it follows query params as a stream (?tab=settings) instead of reading a snapshot.
  private readonly cacheableRoutes = [
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
    // Same route config AND same path params. Detail pages (exercise/:slug, reader/:id, ...)
    // read their params from the snapshot once, so /exercise/a → /exercise/b must create a
    // fresh component instead of silently keeping exercise A. Query params (?tab=) still reuse.
    if (future.routeConfig !== curr.routeConfig) return false;
    const a = future.params;
    const b = curr.params;
    const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
    for (const key of keys) {
      if (a[key] !== b[key]) return false;
    }
    return true;
  }

  // Clear cache when needed (e.g., on logout)
  clearCache(): void {
    this.handlers.clear();
    console.log('[RouteReuse] Cache cleared');
  }
}
