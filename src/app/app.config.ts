import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  provideZoneChangeDetection,
  APP_INITIALIZER,
} from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideAnimations } from '@angular/platform-browser/animations';

import { routes } from './app.routes';
import { SeoService } from './services/seo.service';
import { VietnameseSeoService } from './services/vietnamese-seo.service';
import { CocCocSeoService } from './services/coc-coc-seo.service';

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
  return async () => {
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
  };
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideHttpClient(),
    provideAnimations(),
    {
      provide: APP_INITIALIZER,
      useFactory: initializeSeo,
      deps: [SeoService],
      multi: true,
    },
    {
      provide: APP_INITIALIZER,
      useFactory: initializeVietnameseSeo,
      deps: [VietnameseSeoService, CocCocSeoService],
      multi: true,
    },
  ],
};
