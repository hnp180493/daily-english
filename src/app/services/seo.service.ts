import { Injectable, inject, DOCUMENT } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface SeoConfig {
  title: string;
  description: string;
  keywords?: string[];
  image?: string;
  url?: string;
  type?: 'website' | 'article' | 'profile';
  locale?: string;
  author?: string;
  twitterCard?: 'summary' | 'summary_large_image' | 'app' | 'player';
  twitterSite?: string;
  twitterCreator?: string;
}

export interface StructuredData {
  '@context': string;
  '@type': string;
  [key: string]: any;
}

export interface RouteSeoData {
  title: string;
  description: string;
  keywords?: string[];
  image?: string;
  structuredDataType?: 'WebSite' | 'EducationalOrganization' | 'LearningResource';
  noindex?: boolean;
}

export interface WebSiteSchema {
  '@context': 'https://schema.org';
  '@type': 'WebSite';
  name: string;
  url: string;
  description: string;
  inLanguage: string;
  potentialAction?: {
    '@type': 'SearchAction';
    target: string;
    'query-input': string;
  };
}

export interface EducationalOrganizationSchema {
  '@context': 'https://schema.org';
  '@type': 'EducationalOrganization';
  name: string;
  url: string;
  description: string;
  logo?: string;
  sameAs?: string[];
}

export interface LearningResourceSchema {
  '@context': 'https://schema.org';
  '@type': 'LearningResource';
  name: string;
  description: string;
  educationalLevel: string;
  learningResourceType: string;
  inLanguage: string;
  teaches: string;
}

@Injectable({
  providedIn: 'root',
})
export class SeoService {
  private meta = inject(Meta);
  private titleService = inject(Title);
  private router = inject(Router);
  private document = inject(DOCUMENT);

  private readonly DEFAULT_TITLE = 'Daily English';
  private readonly DEFAULT_DESCRIPTION =
    'Nền tảng học tiếng Anh với bài tập dịch câu, phản hồi AI thông minh, và theo dõi tiến độ học tập';
  private readonly BASE_URL = 'https://dailyenglish.qzz.io';

  constructor() {
    // Listen to route changes and update meta tags
    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe(() => {
        this.updateMetaForRoute();
      });

    // Add verification tags if configured
    if (environment.seo?.googleSiteVerification) {
      this.addVerificationTag('google', environment.seo.googleSiteVerification);
    }
    if (environment.seo?.bingWebmasterVerification) {
      this.addVerificationTag('bing', environment.seo.bingWebmasterVerification);
    }
  }

  /**
   * Update page title with Daily English suffix
   */
  setTitle(title: string): void {
    if (!title) {
      this.logWarning('Title is empty, using default');
      title = this.DEFAULT_TITLE;
    }

    const fullTitle = title.includes('Daily English') ? title : `${title} - Daily English`;
    this.titleService.setTitle(fullTitle);
  }

  /**
   * Update meta description tag
   */
  setDescription(description: string): void {
    if (!description) {
      this.logWarning('Description is empty, using default');
      description = this.DEFAULT_DESCRIPTION;
    }

    if (description.length > 160) {
      this.logWarning(
        `Description too long (${description.length} chars). Recommended: 150-160 chars`
      );
    }

    this.meta.updateTag({ name: 'description', content: description });
  }

  /**
   * Update meta keywords tag
   */
  setKeywords(keywords: string[]): void {
    if (!keywords || keywords.length === 0) {
      this.logWarning('Keywords array is empty');
      return;
    }

    const keywordsString = keywords.join(', ');
    this.meta.updateTag({ name: 'keywords', content: keywordsString });
  }

  /**
   * Set or update canonical URL
   */
  setCanonicalUrl(url?: string): void {
    const canonicalUrl = url || `${this.BASE_URL}${this.router.url}`;

    // Remove existing canonical link if present
    const existingLink = this.document.querySelector('link[rel="canonical"]');
    if (existingLink) {
      existingLink.setAttribute('href', canonicalUrl);
    } else {
      // Create new canonical link
      const link: HTMLLinkElement = this.document.createElement('link');
      link.setAttribute('rel', 'canonical');
      link.setAttribute('href', canonicalUrl);
      this.document.head.appendChild(link);
    }
  }

  /**
   * Update all meta tags with provided configuration
   */
  updateTags(config: SeoConfig): void {
    // Validate and set defaults
    if (!config.title) {
      this.logWarning('Title is required for SEO');
      config.title = this.DEFAULT_TITLE;
    }

    if (!config.description) {
      this.logWarning('Description is required for SEO');
      config.description = this.DEFAULT_DESCRIPTION;
    }

    // Update basic tags
    this.setTitle(config.title);
    this.setDescription(config.description);

    if (config.keywords && config.keywords.length > 0) {
      this.setKeywords(config.keywords);
    }

    this.setCanonicalUrl(config.url);

    // Update social media tags
    this.setOpenGraphTags(config);
    this.setTwitterCardTags(config);
  }

  /**
   * Set Open Graph meta tags for social media sharing
   */
  setOpenGraphTags(config: SeoConfig): void {
    const ogTitle = config.title || this.DEFAULT_TITLE;
    const ogDescription = config.description || this.DEFAULT_DESCRIPTION;
    const ogImage = config.image || `${this.BASE_URL}/og-image.png`;
    const ogUrl = config.url || `${this.BASE_URL}${this.router.url}`;
    const ogType = config.type || 'website';
    const ogLocale = config.locale || 'vi_VN';

    this.meta.updateTag({ property: 'og:title', content: ogTitle });
    this.meta.updateTag({ property: 'og:description', content: ogDescription });
    this.meta.updateTag({ property: 'og:image', content: ogImage });
    this.meta.updateTag({ property: 'og:url', content: ogUrl });
    this.meta.updateTag({ property: 'og:type', content: ogType });
    this.meta.updateTag({ property: 'og:locale', content: ogLocale });
  }

  /**
   * Set Twitter Card meta tags for Twitter sharing
   */
  setTwitterCardTags(config: SeoConfig): void {
    const twitterCard = config.twitterCard || 'summary_large_image';
    const twitterTitle = config.title || this.DEFAULT_TITLE;
    const twitterDescription = config.description || this.DEFAULT_DESCRIPTION;
    const twitterImage = config.image || `${this.BASE_URL}/og-image.png`;

    this.meta.updateTag({ name: 'twitter:card', content: twitterCard });
    this.meta.updateTag({ name: 'twitter:title', content: twitterTitle });
    this.meta.updateTag({ name: 'twitter:description', content: twitterDescription });
    this.meta.updateTag({ name: 'twitter:image', content: twitterImage });

    if (config.twitterSite) {
      this.meta.updateTag({ name: 'twitter:site', content: config.twitterSite });
    }

    if (config.twitterCreator) {
      this.meta.updateTag({ name: 'twitter:creator', content: config.twitterCreator });
    }
  }

  /**
   * Inject JSON-LD structured data into document head
   */
  setStructuredData(data: StructuredData): void {
    try {
      // Remove existing structured data first
      this.removeStructuredData();

      // Validate JSON structure
      const jsonString = JSON.stringify(data);
      JSON.parse(jsonString); // Validate it's valid JSON

      // Create script element
      const script = this.document.createElement('script');
      script.type = 'application/ld+json';
      script.text = jsonString;
      script.id = 'structured-data';
      this.document.head.appendChild(script);
    } catch (error) {
      this.logError('Failed to set structured data', error);
    }
  }

  /**
   * Remove existing structured data from document
   */
  removeStructuredData(): void {
    const existingScript = this.document.getElementById('structured-data');
    if (existingScript) {
      existingScript.remove();
    }
  }

  /**
   * Update meta tags based on current route
   */
  updateMetaForRoute(): void {
    const route = this.router.routerState.root;
    let child = route.firstChild;

    // Traverse to the deepest activated route
    while (child) {
      if (child.firstChild) {
        child = child.firstChild;
      } else if (child.snapshot.data && child.snapshot.data['seo']) {
        // Found route with SEO data
        const seoData: RouteSeoData = child.snapshot.data['seo'];
        this.applySeoData(seoData, child.snapshot.params);
        return;
      } else {
        break;
      }
    }

    // No SEO data found, use defaults
    this.updateTags({
      title: this.DEFAULT_TITLE,
      description: this.DEFAULT_DESCRIPTION,
    });
  }

  /**
   * Apply SEO data from route configuration
   */
  private applySeoData(seoData: RouteSeoData, params?: any): void {
    // Check if page should not be indexed
    if (seoData.noindex) {
      this.meta.updateTag({ name: 'robots', content: 'noindex, nofollow' });
    } else {
      this.meta.removeTag('name="robots"');
    }

    // Update basic meta tags
    const config: SeoConfig = {
      title: seoData.title,
      description: seoData.description,
      keywords: seoData.keywords,
      image: seoData.image,
    };

    this.updateTags(config);

    // Update hreflang tags
    this.setHreflangTags();

    // Update structured data based on type
    if (seoData.structuredDataType) {
      switch (seoData.structuredDataType) {
        case 'WebSite':
          this.setStructuredData(this.generateWebSiteSchema());
          break;
        case 'EducationalOrganization':
          this.setStructuredData(this.generateEducationalOrganizationSchema());
          break;
        case 'LearningResource':
          // Will be handled by individual components with specific data
          break;
      }
    }
  }

  /**
   * Add verification meta tag for search engines
   */
  addVerificationTag(provider: 'google' | 'bing', code: string): void {
    if (!code) {
      this.logWarning(`Verification code for ${provider} is empty`);
      return;
    }

    const metaName =
      provider === 'google' ? 'google-site-verification' : 'msvalidate.01';

    // Check if tag already exists
    const existingTag = this.meta.getTag(`name="${metaName}"`);
    if (existingTag) {
      this.meta.updateTag({ name: metaName, content: code });
    } else {
      this.meta.addTag({ name: metaName, content: code });
    }
  }

  /**
   * Set hreflang tags for language localization
   */
  setHreflangTags(currentUrl?: string): void {
    const url = currentUrl || `${this.BASE_URL}${this.router.url}`;

    // Remove existing hreflang links
    const existingLinks = this.document.querySelectorAll('link[rel="alternate"]');
    existingLinks.forEach((link) => link.remove());

    // Add Vietnamese hreflang
    const viLink: HTMLLinkElement = this.document.createElement('link');
    viLink.setAttribute('rel', 'alternate');
    viLink.setAttribute('hreflang', 'vi');
    viLink.setAttribute('href', url);
    this.document.head.appendChild(viLink);

    // Add x-default hreflang (default language)
    const defaultLink: HTMLLinkElement = this.document.createElement('link');
    defaultLink.setAttribute('rel', 'alternate');
    defaultLink.setAttribute('hreflang', 'x-default');
    defaultLink.setAttribute('href', url);
    this.document.head.appendChild(defaultLink);
  }

  /**
   * Generate WebSite schema with search action
   */
  generateWebSiteSchema(): WebSiteSchema {
    return {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: 'Daily English',
      url: this.BASE_URL,
      description: this.DEFAULT_DESCRIPTION,
      inLanguage: 'vi',
      potentialAction: {
        '@type': 'SearchAction',
        target: `${this.BASE_URL}/exercises?q={search_term_string}`,
        'query-input': 'required name=search_term_string',
      },
    };
  }

  /**
   * Generate EducationalOrganization schema
   */
  generateEducationalOrganizationSchema(): EducationalOrganizationSchema {
    return {
      '@context': 'https://schema.org',
      '@type': 'EducationalOrganization',
      name: 'Daily English',
      url: this.BASE_URL,
      description: this.DEFAULT_DESCRIPTION,
      logo: `${this.BASE_URL}/og-image.png`,
    };
  }

  /**
   * Generate LearningResource schema for exercises
   */
  generateLearningResourceSchema(
    name: string,
    description: string,
    level: string = 'Beginner'
  ): LearningResourceSchema {
    return {
      '@context': 'https://schema.org',
      '@type': 'LearningResource',
      name,
      description,
      educationalLevel: level,
      learningResourceType: 'Exercise',
      inLanguage: 'en',
      teaches: 'English Language',
    };
  }

  /**
   * Log warning message
   */
  private logWarning(message: string): void {
    console.warn(`[SEO Warning]: ${message}`);
  }

  /**
   * Log error message
   */
  private logError(message: string, error?: any): void {
    console.error(`[SEO Error]: ${message}`, error);
  }
}
