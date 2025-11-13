import { HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { of } from 'rxjs';
import { tap } from 'rxjs/operators';

/**
 * HTTP cache interceptor to reduce redundant API calls
 * Caches GET requests for static data like exercises
 */

const cache = new Map<string, { response: HttpResponse<any>; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export const cacheInterceptor: HttpInterceptorFn = (req, next) => {
  // Only cache GET requests
  if (req.method !== 'GET') {
    return next(req);
  }

  // Don't cache API calls (only static JSON files)
  if (req.url.includes('api.') || req.url.includes('openai') || req.url.includes('gemini')) {
    return next(req);
  }

  const cachedResponse = cache.get(req.url);
  const now = Date.now();

  // Return cached response if valid
  if (cachedResponse && now - cachedResponse.timestamp < CACHE_DURATION) {
    console.log('[Cache] Hit:', req.url);
    return of(cachedResponse.response.clone());
  }

  // Make request and cache response
  return next(req).pipe(
    tap((event) => {
      if (event instanceof HttpResponse) {
        cache.set(req.url, {
          response: event.clone(),
          timestamp: now,
        });
        console.log('[Cache] Stored:', req.url);
      }
    })
  );
};
