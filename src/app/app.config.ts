import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  provideZoneChangeDetection,
  provideAppInitializer,
  inject,
} from '@angular/core';
import { provideRouter, withPreloading, RouteReuseStrategy } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideClientHydration } from '@angular/platform-browser';
import { provideAnimations } from '@angular/platform-browser/animations';

import { routes } from './app.routes';
import { SeoService } from './services/seo.service';
import { VietnameseSeoService } from './services/vietnamese-seo.service';
import { CocCocSeoService } from './services/coc-coc-seo.service';
import { SelectivePreloadStrategy } from './services/selective-preload-strategy.service';
import { CustomRouteReuseStrategy } from './services/route-reuse-strategy.service';
import { cacheInterceptor } from './interceptors/cache.interceptor';

export function initializeSeo(seoService: SeoService) {
  return () => {
    // Set default WebSite structured data on app initialization
    seoService.setStructuredData(seoService.generateWebSiteSchema());
  };
}

export function initializeVietnameseSeo(
  vietnameseSeoService: VietnameseSeoService,
  cocCocSeoService: CocCocSeoService
) {
  return () => {
    // Run SEO initialization in background without blocking app startup
    Promise.resolve().then(async () => {
      try {
        // Load Vietnamese SEO configuration
        await vietnameseSeoService.loadConfiguration();

        // Apply Cốc Cốc browser-specific optimizations
        cocCocSeoService.applyBrowserSpecificOptimizations();

        // Generate Cốc Cốc sitemap reference
        cocCocSeoService.generateCocCocSitemapReference();

        console.log('[App Init]: Vietnamese SEO initialized successfully');
      } catch (error) {
        console.error('[App Init]: Failed to initialize Vietnamese SEO', error);
      }
    });
  };
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes, withPreloading(SelectivePreloadStrategy)),
    provideHttpClient(withInterceptors([cacheInterceptor])),
    provideClientHydration(),
    provideAnimations(),
    SelectivePreloadStrategy,
    {
      provide: RouteReuseStrategy,
      useClass: CustomRouteReuseStrategy,
    },
    provideAppInitializer(() => {
      const seoService = inject(SeoService);
      initializeSeo(seoService)();
    }),
    provideAppInitializer(() => {
      const vietnameseSeoService = inject(VietnameseSeoService);
      const cocCocSeoService = inject(CocCocSeoService);
      initializeVietnameseSeo(vietnameseSeoService, cocCocSeoService)();
    }),
  ],
};
