import { Injectable, inject } from '@angular/core';
import { Title, Meta } from '@angular/platform-browser';
import { Router } from '@angular/router';

export interface SeoConfig {
  title: string;
  description: string;
  keywords?: string | string[];
  image?: string;
  url?: string;
  type?: 'website' | 'article';
  locale?: string;
}

export interface RouteSeoData {
  title: string;
  description: string;
  keywords?: string | string[];
  image?: string;
  type?: 'website' | 'article';
}

@Injectable({
  providedIn: 'root'
})
export class SeoService {
  private titleService = inject(Title);
  private metaService = inject(Meta);
  private router = inject(Router);

  private readonly defaultConfig: SeoConfig = {
    title: 'Daily English - Học tiếng Anh với AI | 250+ bài tập miễn phí',
    description: 'Học tiếng Anh hiệu quả với 250+ bài tập dịch câu, phản hồi AI thông minh, lộ trình học tập có cấu trúc và hệ thống ôn tập thông minh. Hoàn toàn miễn phí!',
    keywords: 'học tiếng anh, học tiếng anh online, học tiếng anh miễn phí, luyện dịch tiếng anh, AI feedback, bài tập tiếng anh, học tiếng anh với AI, daily english',
    image: 'https://dailyenglish.qzz.io/og-image-vi.png',
    type: 'website'
  };

  updateTags(config: Partial<SeoConfig>): void {
    const seoConfig = { ...this.defaultConfig, ...config };
    const fullUrl = seoConfig.url || `https://dailyenglish.qzz.io${this.router.url}`;

    // Update title
    this.titleService.setTitle(seoConfig.title);

    // Update meta tags
    this.metaService.updateTag({ name: 'description', content: seoConfig.description });
    
    if (seoConfig.keywords) {
      const keywordsString = Array.isArray(seoConfig.keywords) 
        ? seoConfig.keywords.join(', ') 
        : seoConfig.keywords;
      this.metaService.updateTag({ name: 'keywords', content: keywordsString });
    }

    // Open Graph tags
    this.metaService.updateTag({ property: 'og:title', content: seoConfig.title });
    this.metaService.updateTag({ property: 'og:description', content: seoConfig.description });
    this.metaService.updateTag({ property: 'og:url', content: fullUrl });
    this.metaService.updateTag({ property: 'og:type', content: seoConfig.type || 'website' });
    
    if (seoConfig.image) {
      this.metaService.updateTag({ property: 'og:image', content: seoConfig.image });
    }

    // Twitter Card tags
    this.metaService.updateTag({ name: 'twitter:title', content: seoConfig.title });
    this.metaService.updateTag({ name: 'twitter:description', content: seoConfig.description });
    
    if (seoConfig.image) {
      this.metaService.updateTag({ name: 'twitter:image', content: seoConfig.image });
    }

    // Canonical URL
    this.updateCanonicalUrl(fullUrl);
  }

  private updateCanonicalUrl(url: string): void {
    let link: HTMLLinkElement | null = document.querySelector('link[rel="canonical"]');
    
    if (!link) {
      link = document.createElement('link');
      link.setAttribute('rel', 'canonical');
      document.head.appendChild(link);
    }
    
    link.setAttribute('href', url);
  }

  /**
   * Generate SEO-friendly title for exercise pages
   */
  generateExerciseTitle(exerciseTitle: string, category: string, difficulty: string): string {
    return `${exerciseTitle} - ${category} ${difficulty} | Daily English`;
  }

  /**
   * Generate SEO-friendly description for exercise pages
   */
  generateExerciseDescription(exerciseTitle: string, difficulty: string): string {
    return `Luyện tập dịch câu tiếng Anh cấp độ ${difficulty}: "${exerciseTitle}". Nhận phản hồi AI chi tiết về ngữ pháp, từ vựng và cấu trúc câu. Miễn phí 100%.`;
  }

  /**
   * Set structured data (JSON-LD) for SEO
   */
  setStructuredData(data: any): void {
    let script: HTMLScriptElement | null = document.querySelector('script[type="application/ld+json"]');
    
    if (!script) {
      script = document.createElement('script');
      script.type = 'application/ld+json';
      document.head.appendChild(script);
    }
    
    script.textContent = JSON.stringify(data);
  }

  /**
   * Generate WebSite schema for homepage
   */
  generateWebSiteSchema(): any {
    return {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: 'Daily English',
      url: 'https://dailyenglish.qzz.io',
      description: 'Học tiếng Anh hiệu quả với 250+ bài tập dịch câu, phản hồi AI thông minh',
      potentialAction: {
        '@type': 'SearchAction',
        target: 'https://dailyenglish.qzz.io/exercises?search={search_term_string}',
        'query-input': 'required name=search_term_string'
      }
    };
  }
}
