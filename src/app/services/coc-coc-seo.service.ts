import { Injectable, inject, DOCUMENT } from '@angular/core';
import { Meta } from '@angular/platform-browser';

/**
 * Cốc Cốc meta tags interface
 */
export interface CocCocMetaTags {
  title: string;
  description: string;
  keywords?: string[];
  image?: string;
}

/**
 * Cốc Cốc SEO Service
 * Specialized service for Cốc Cốc browser and search engine optimization
 */
@Injectable({
  providedIn: 'root',
})
export class CocCocSeoService {
  private meta = inject(Meta);
  private document = inject(DOCUMENT);

  /**
   * Add Cốc Cốc verification meta tag
   */
  addCocCocVerification(code: string): void {
    if (!code) {
      this.logWarning('Cốc Cốc verification code is empty');
      return;
    }

    const existingTag = this.meta.getTag('name="coccoc-verification"');
    if (existingTag) {
      this.meta.updateTag({ name: 'coccoc-verification', content: code });
      this.logInfo('Cốc Cốc verification tag updated');
    } else {
      this.meta.addTag({ name: 'coccoc-verification', content: code });
      this.logInfo('Cốc Cốc verification tag added');
    }
  }

  /**
   * Optimize meta tags for Cốc Cốc search engine
   */
  optimizeForCocCoc(config: CocCocMetaTags): void {
    if (!config.title || !config.description) {
      this.logWarning('Title and description are required for Cốc Cốc optimization');
      return;
    }

    // Add Cốc Cốc-specific meta tags
    this.meta.updateTag({ name: 'coccoc:title', content: config.title });
    this.meta.updateTag({ name: 'coccoc:description', content: config.description });

    if (config.keywords && config.keywords.length > 0) {
      this.meta.updateTag({ name: 'coccoc:keywords', content: config.keywords.join(', ') });
    }

    if (config.image) {
      this.meta.updateTag({ name: 'coccoc:image', content: config.image });
    }

    this.logInfo('Cốc Cốc meta tags optimized', {
      title: config.title,
      descriptionLength: config.description.length,
      keywordCount: config.keywords?.length || 0,
    });
  }

  /**
   * Generate Cốc Cốc sitemap reference
   */
  generateCocCocSitemapReference(): void {
    // Remove existing sitemap link if present
    const existingLink = this.document.querySelector('link[rel="sitemap"][title="Sitemap"]');
    if (existingLink) {
      existingLink.remove();
    }

    // Create new sitemap link for Cốc Cốc
    const link: HTMLLinkElement = this.document.createElement('link');
    link.setAttribute('rel', 'sitemap');
    link.setAttribute('type', 'application/xml');
    link.setAttribute('title', 'Sitemap');
    link.setAttribute('href', '/sitemap-vi.xml');
    this.document.head.appendChild(link);

    this.logInfo('Cốc Cốc sitemap reference added');
  }

  /**
   * Detect if user is using Cốc Cốc browser
   */
  isCocCocBrowser(): boolean {
    if (typeof navigator === 'undefined') {
      return false;
    }

    const userAgent = navigator.userAgent.toLowerCase();

    // Cốc Cốc browser identification
    const isCocCoc =
      userAgent.includes('coc_coc_browser') ||
      userAgent.includes('coccoc') ||
      userAgent.includes('coccocbrowser');

    if (isCocCoc) {
      this.logInfo('Cốc Cốc browser detected');
    }

    return isCocCoc;
  }

  /**
   * Apply Cốc Cốc-specific optimizations if browser is detected
   */
  applyBrowserSpecificOptimizations(): void {
    if (this.isCocCocBrowser()) {
      // Add Cốc Cốc-specific CSS class to body
      this.document.body.classList.add('coccoc-browser');

      // Add Cốc Cốc-specific meta tag
      this.meta.addTag({ name: 'coccoc:optimized', content: 'true' });

      this.logInfo('Cốc Cốc browser-specific optimizations applied');
    }
  }

  /**
   * Remove Cốc Cốc meta tags
   */
  removeCocCocTags(): void {
    this.meta.removeTag('name="coccoc:title"');
    this.meta.removeTag('name="coccoc:description"');
    this.meta.removeTag('name="coccoc:keywords"');
    this.meta.removeTag('name="coccoc:image"');
    this.meta.removeTag('name="coccoc:optimized"');

    this.logInfo('Cốc Cốc meta tags removed');
  }

  /**
   * Validate Cốc Cốc meta tags are present
   */
  validateCocCocTags(): boolean {
    const titleTag = this.meta.getTag('name="coccoc:title"');
    const descriptionTag = this.meta.getTag('name="coccoc:description"');

    const isValid = !!(titleTag && descriptionTag);

    if (!isValid) {
      this.logWarning('Cốc Cốc meta tags validation failed');
    } else {
      this.logInfo('Cốc Cốc meta tags validation passed');
    }

    return isValid;
  }

  /**
   * Log info message
   */
  private logInfo(message: string, data?: any): void {
    if (data) {
      console.log(`[Cốc Cốc SEO]: ${message}`, data);
    } else {
      console.log(`[Cốc Cốc SEO]: ${message}`);
    }
  }

  /**
   * Log warning message
   */
  private logWarning(message: string): void {
    console.warn(`[Cốc Cốc SEO Warning]: ${message}`);
  }
}
