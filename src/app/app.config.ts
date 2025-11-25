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
import { AnalyticsService } from './services/analytics.service';
import { AnalyticsProviderFactory } from './services/analytics-provider-factory.service';
import { SessionTrackingService } from './services/session-tracking.service';
import { environment } from '../environments/environment';

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

export function initializeAnalytics(
  analyticsService: AnalyticsService,
  providerFactory: AnalyticsProviderFactory
) {
  return () => {
    // Run analytics initialization in background without blocking app startup
    Promise.resolve().then(async () => {
      try {
        const analyticsConfig = environment.analytics;
        
        if (!analyticsConfig || !analyticsConfig.providers) {
          console.log('[App Init]: No analytics providers configured');
          return;
        }

        // Create and register all enabled providers
        for (const providerConfig of analyticsConfig.providers) {
          const provider = await providerFactory.createAndInitialize(providerConfig);
          
          if (provider) {
            analyticsService.registerProvider(provider);
            console.log(`[App Init]: Analytics provider '${providerConfig.type}' registered successfully`);
          }
        }

        console.log('[App Init]: Analytics initialized successfully');
      } catch (error) {
        console.error('[App Init]: Failed to initialize analytics', error);
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
    provideAppInitializer(() => {
      const analyticsService = inject(AnalyticsService);
      const providerFactory = inject(AnalyticsProviderFactory);
      initializeAnalytics(analyticsService, providerFactory)();
    }),
    provideAppInitializer(() => {
      // Initialize session tracking service
      const sessionTracking = inject(SessionTrackingService);
      console.log('[App Init]: Session tracking initialized');
    }),
  ],
};
