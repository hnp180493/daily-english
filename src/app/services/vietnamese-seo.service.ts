import { Injectable, inject, DOCUMENT } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Meta } from '@angular/platform-browser';
import { SeoService, SeoConfig } from './seo.service';
import { firstValueFrom } from 'rxjs';

/**
 * Vietnamese SEO configuration extending base SeoConfig
 */
export interface VietnameseSeoConfig extends SeoConfig {
  vietnameseTitle?: string;
  vietnameseDescription?: string;
  vietnameseKeywords?: string[];
  proficiencyLevel?: 'sơ cấp' | 'trung cấp' | 'cao cấp';
  targetAudience?: 'học sinh' | 'sinh viên' | 'người đi làm' | 'tất cả';
  contentType?: 'bài tập' | 'bài học' | 'hướng dẫn' | 'tài liệu';
}

/**
 * Vietnamese keyword strategy interface
 */
export interface VietnameseKeywordStrategy {
  primary: string[];
  secondary: string[];
  longTail: string[];
  localVariations?: string[];
}

/**
 * Vietnamese FAQ Schema
 */
export interface VietnameseFAQSchema {
  '@context': 'https://schema.org';
  '@type': 'FAQPage';
  mainEntity: Array<{
    '@type': 'Question';
    name: string;
    acceptedAnswer: {
      '@type': 'Answer';
      text: string;
    };
  }>;
}

/**
 * Vietnamese Breadcrumb Schema
 */
export interface VietnameseBreadcrumbSchema {
  '@context': 'https://schema.org';
  '@type': 'BreadcrumbList';
  itemListElement: Array<{
    '@type': 'ListItem';
    position: number;
    name: string;
    item: string;
  }>;
}

/**
 * Vietnamese Course Schema
 */
export interface VietnameseCourseSchema {
  '@context': 'https://schema.org';
  '@type': 'Course';
  name: string;
  description: string;
  provider: {
    '@type': 'Organization';
    name: string;
    sameAs?: string;
  };
  inLanguage: string;
  educationalLevel?: string;
  teaches?: string;
}

/**
 * Vietnamese Aggregate Rating Schema
 */
export interface VietnameseAggregateRatingSchema {
  '@context': 'https://schema.org';
  '@type': 'Product' | 'Course';
  name: string;
  aggregateRating: {
    '@type': 'AggregateRating';
    ratingValue: number;
    reviewCount: number;
    bestRating: number;
    worstRating: number;
  };
  review?: Array<{
    '@type': 'Review';
    author: {
      '@type': 'Person';
      name: string;
    };
    reviewBody: string;
    reviewRating: {
      '@type': 'Rating';
      ratingValue: number;
    };
  }>;
}

/**
 * Zalo meta tags interface
 */
export interface ZaloMetaTags {
  title: string;
  description: string;
  image: string;
  url?: string;
}

/**
 * Category configuration from JSON
 */
interface CategoryConfig {
  vi: string;
  keywords: string[];
  description: string;
}

/**
 * Proficiency level configuration from JSON
 */
interface LevelConfig {
  vi: string;
  description: string;
  keywords: string[];
}

/**
 * Meta template configuration from JSON
 */
interface MetaTemplate {
  title: string;
  description: string;
}

/**
 * Complete Vietnamese content configuration structure
 */
interface VietnameseContentConfig {
  keywords: VietnameseKeywordStrategy;
  categories: Record<string, CategoryConfig>;
  proficiencyLevels: Record<string, LevelConfig>;
  metaTemplates: Record<string, MetaTemplate>;
  socialSharing: {
    zalo: {
      defaultImage: string;
      titleSuffix: string;
    };
    facebook: {
      appId: string;
      locale: string;
    };
  };
  cocCoc: {
    verification: string;
    searchEngineUrl: string;
    optimizations: {
      enableSpecialTags: boolean;
      prioritizeVietnameseContent: boolean;
    };
  };
}

/**
 * Vietnamese SEO Service
 * Specialized service for Vietnamese market SEO optimization
 */
@Injectable({
  providedIn: 'root',
})
export class VietnameseSeoService {
  private seoService = inject(SeoService);
  private http = inject(HttpClient);
  private meta = inject(Meta);
  private document = inject(DOCUMENT);

  private vietnameseConfig: VietnameseContentConfig | null = null;
  private configLoaded = false;

  /**
   * Load Vietnamese SEO configuration from JSON file
   */
  async loadConfiguration(): Promise<void> {
    if (this.configLoaded) {
      return;
    }

    try {
      this.logInfo('Loading Vietnamese SEO configuration...');
      this.vietnameseConfig = await firstValueFrom(
        this.http.get<VietnameseContentConfig>('/assets/vietnamese-seo-config.json')
      );
      this.configLoaded = true;
      this.logInfo('Vietnamese SEO configuration loaded successfully');
    } catch (error) {
      this.logError('Failed to load Vietnamese SEO configuration', error);
      throw error;
    }
  }

  /**
   * Update meta tags with Vietnamese content
   */
  updateVietnameseTags(config: VietnameseSeoConfig): void {
    if (!this.configLoaded || !this.vietnameseConfig) {
      this.logWarning('Vietnamese configuration not loaded. Call loadConfiguration() first.');
      return;
    }

    // Validate Vietnamese content
    if (config.vietnameseTitle) {
      this.validateVietnameseDiacritics(config.vietnameseTitle);
    }
    if (config.vietnameseDescription) {
      this.validateVietnameseDiacritics(config.vietnameseDescription);
      this.validateVietnameseDescription(config.vietnameseDescription);
    }

    // Use Vietnamese content if available, otherwise fall back to English
    const title = config.vietnameseTitle || config.title;
    const description = config.vietnameseDescription || config.description;
    const keywords = config.vietnameseKeywords || config.keywords;

    // Update base SEO tags
    const seoConfig: SeoConfig = {
      ...config,
      title,
      description,
      keywords,
      locale: 'vi_VN',
    };

    this.seoService.updateTags(seoConfig);

    this.logInfo('Vietnamese meta tags updated', {
      title,
      descriptionLength: description?.length,
      keywordCount: keywords?.length,
    });
  }

  /**
   * Get Vietnamese title using template-based generation
   */
  getVietnameseTitle(
    englishTitle: string,
    category?: string,
    level?: string,
    exerciseName?: string
  ): string {
    if (!this.configLoaded || !this.vietnameseConfig) {
      this.logWarning('Vietnamese configuration not loaded');
      return englishTitle;
    }

    try {
      // Determine which template to use
      let template: string;
      let vietnameseCategory = '';
      let vietnameseLevel = '';

      if (exerciseName && category && level) {
        // Exercise page template
        template = this.vietnameseConfig.metaTemplates['exercise'].title;
        vietnameseCategory = this.getCategoryVietnamese(category);
        vietnameseLevel = this.getLevelVietnamese(level);

        return template
          .replace('{exerciseName}', exerciseName)
          .replace('{category}', vietnameseCategory)
          .replace('{level}', vietnameseLevel);
      } else if (category) {
        // Category page template
        template = this.vietnameseConfig.metaTemplates['category'].title;
        vietnameseCategory = this.getCategoryVietnamese(category);

        return template.replace('{category}', vietnameseCategory);
      } else if (level) {
        // Level page template
        template = this.vietnameseConfig.metaTemplates['level'].title;
        vietnameseLevel = this.getLevelVietnamese(level);

        return template.replace('{level}', vietnameseLevel);
      }

      // Default: return English title with Vietnamese suffix
      return `${englishTitle} - Daily English`;
    } catch (error) {
      this.logError('Error generating Vietnamese title', error);
      return englishTitle;
    }
  }

  /**
   * Get Vietnamese description using template-based generation
   */
  getVietnameseDescription(
    englishDescription: string,
    category?: string,
    level?: string,
    exerciseDescription?: string
  ): string {
    if (!this.configLoaded || !this.vietnameseConfig) {
      this.logWarning('Vietnamese configuration not loaded');
      return englishDescription;
    }

    try {
      let template: string;
      let vietnameseCategory = '';
      let vietnameseLevel = '';

      if (category && level) {
        // Exercise description template
        template = this.vietnameseConfig.metaTemplates['exercise'].description;
        vietnameseCategory = this.getCategoryVietnamese(category);
        vietnameseLevel = this.getLevelVietnamese(level);

        let description = template
          .replace('{category}', vietnameseCategory)
          .replace('{level}', vietnameseLevel);

        if (exerciseDescription) {
          description = description.replace('{exerciseDescription}', exerciseDescription);
        } else {
          description = description.replace('{exerciseDescription}', '');
        }

        return description.trim();
      } else if (category) {
        // Category description template
        template = this.vietnameseConfig.metaTemplates['category'].description;
        vietnameseCategory = this.getCategoryVietnamese(category);

        return template.replace('{category}', vietnameseCategory);
      } else if (level) {
        // Level description template
        template = this.vietnameseConfig.metaTemplates['level'].description;
        vietnameseLevel = this.getLevelVietnamese(level);

        return template.replace('{level}', vietnameseLevel);
      }

      // Default: return English description
      return englishDescription;
    } catch (error) {
      this.logError('Error generating Vietnamese description', error);
      return englishDescription;
    }
  }

  /**
   * Get Vietnamese translation for category
   */
  private getCategoryVietnamese(category: string): string {
    if (!this.vietnameseConfig) {
      return category;
    }

    const categoryKey = category.toLowerCase();
    const categoryConfig = this.vietnameseConfig.categories[categoryKey];

    return categoryConfig?.vi || category;
  }

  /**
   * Get Vietnamese translation for proficiency level
   */
  private getLevelVietnamese(level: string): string {
    if (!this.vietnameseConfig) {
      return level;
    }

    const levelKey = level.toLowerCase();
    const levelConfig = this.vietnameseConfig.proficiencyLevels[levelKey];

    return levelConfig?.vi || level;
  }

  /**
   * Validate Vietnamese diacritics in content
   */
  private validateVietnameseDiacritics(text: string): boolean {
    // Check for proper Vietnamese characters
    const vietnamesePattern =
      /[àáảãạăắằẳẵặâấầẩẫậèéẻẽẹêếềểễệìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹỵđ]/i;

    if (!vietnamesePattern.test(text)) {
      this.logWarning('Vietnamese content may be missing diacritics: ' + text.substring(0, 50));
      return false;
    }
    return true;
  }

  /**
   * Validate meta description length for Vietnamese
   */
  private validateVietnameseDescription(description: string): void {
    // Vietnamese characters may take more bytes
    const byteLength = new Blob([description]).size;

    if (byteLength > 320) {
      // ~160 Vietnamese characters
      this.logWarning(`Vietnamese description too long: ${byteLength} bytes`);
    }

    if (description.length < 50) {
      this.logWarning('Vietnamese description too short');
    }
  }

  /**
   * Generate Vietnamese keywords based on category and proficiency level
   */
  generateVietnameseKeywords(category?: string, level?: string): string[] {
    if (!this.configLoaded || !this.vietnameseConfig) {
      this.logWarning('Vietnamese configuration not loaded');
      return [];
    }

    const keywords: string[] = [];

    // Add primary keywords
    keywords.push(...this.vietnameseConfig.keywords.primary);

    // Add category-specific keywords
    if (category) {
      const categoryKey = category.toLowerCase();
      const categoryConfig = this.vietnameseConfig.categories[categoryKey];
      if (categoryConfig) {
        keywords.push(...categoryConfig.keywords);
      }
    }

    // Add level-specific keywords
    if (level) {
      const levelKey = level.toLowerCase();
      const levelConfig = this.vietnameseConfig.proficiencyLevels[levelKey];
      if (levelConfig) {
        keywords.push(...levelConfig.keywords);
      }
    }

    // Add secondary keywords
    keywords.push(...this.vietnameseConfig.keywords.secondary.slice(0, 3));

    // Add long-tail keywords if specific category and level
    if (category && level) {
      keywords.push(...this.vietnameseConfig.keywords.longTail.slice(0, 2));
    }

    // Remove duplicates and return
    return [...new Set(keywords)];
  }

  /**
   * Optimize content for Vietnamese search by analyzing and suggesting keywords
   */
  optimizeForVietnameseSearch(content: string): string[] {
    if (!this.configLoaded || !this.vietnameseConfig) {
      this.logWarning('Vietnamese configuration not loaded');
      return [];
    }

    const suggestedKeywords: string[] = [];
    const contentLower = content.toLowerCase();

    // Check for category mentions
    Object.entries(this.vietnameseConfig.categories).forEach(([key, config]) => {
      if (contentLower.includes(config.vi.toLowerCase())) {
        suggestedKeywords.push(...config.keywords);
      }
    });

    // Check for level mentions
    Object.entries(this.vietnameseConfig.proficiencyLevels).forEach(([key, config]) => {
      if (contentLower.includes(config.vi.toLowerCase())) {
        suggestedKeywords.push(...config.keywords);
      }
    });

    // Add primary keywords if content is about English learning
    if (
      contentLower.includes('tiếng anh') ||
      contentLower.includes('english') ||
      contentLower.includes('học')
    ) {
      suggestedKeywords.push(...this.vietnameseConfig.keywords.primary.slice(0, 3));
    }

    // Remove duplicates
    return [...new Set(suggestedKeywords)];
  }

  /**
   * Validate keyword density for Vietnamese content
   */
  validateKeywordDensity(content: string, keywords: string[]): Map<string, number> {
    const wordCount = content.split(/\s+/).length;
    const densityMap = new Map<string, number>();

    keywords.forEach((keyword) => {
      const keywordRegex = new RegExp(keyword, 'gi');
      const keywordCount = (content.match(keywordRegex) || []).length;
      const density = wordCount > 0 ? (keywordCount / wordCount) * 100 : 0;

      densityMap.set(keyword, density);

      if (density > 3) {
        this.logWarning(`Keyword "${keyword}" density too high: ${density.toFixed(2)}%`);
      } else if (density === 0) {
        this.logWarning(`Keyword "${keyword}" not found in content`);
      }
    });

    return densityMap;
  }

  /**
   * Get keyword variations for regional Vietnamese differences
   */
  getKeywordVariations(keyword: string): string[] {
    const variations: string[] = [keyword];

    // Common regional variations
    const regionalMap: Record<string, string[]> = {
      'học tiếng anh': ['học tiếng anh', 'học anh văn', 'học english'],
      'bài tập': ['bài tập', 'bài luyện tập', 'bài thực hành'],
      'luyện tập': ['luyện tập', 'thực hành', 'rèn luyện'],
      'miễn phí': ['miễn phí', 'free', 'không mất phí'],
      'online': ['online', 'trực tuyến', 'qua mạng'],
      'ứng dụng': ['ứng dụng', 'app', 'phần mềm'],
    };

    // Check if keyword has regional variations
    Object.entries(regionalMap).forEach(([key, vars]) => {
      if (keyword.toLowerCase().includes(key)) {
        variations.push(...vars);
      }
    });

    return [...new Set(variations)];
  }

  /**
   * Combine primary, secondary, and long-tail keywords
   */
  getCombinedKeywords(
    includePrimary: boolean = true,
    includeSecondary: boolean = true,
    includeLongTail: boolean = false
  ): string[] {
    if (!this.configLoaded || !this.vietnameseConfig) {
      this.logWarning('Vietnamese configuration not loaded');
      return [];
    }

    const keywords: string[] = [];

    if (includePrimary) {
      keywords.push(...this.vietnameseConfig.keywords.primary);
    }

    if (includeSecondary) {
      keywords.push(...this.vietnameseConfig.keywords.secondary);
    }

    if (includeLongTail) {
      keywords.push(...this.vietnameseConfig.keywords.longTail);
    }

    return keywords;
  }

  /**
   * Map exercise type to Vietnamese terms
   */
  getExerciseTypeKeywords(exerciseType: string): string[] {
    const exerciseTypeMap: Record<string, string[]> = {
      translation: ['dịch câu', 'luyện dịch', 'bài tập dịch', 'dịch tiếng anh'],
      vocabulary: ['từ vựng', 'học từ vựng', 'ghi nhớ từ', 'từ mới'],
      grammar: ['ngữ pháp', 'học ngữ pháp', 'bài tập ngữ pháp', 'cấu trúc câu'],
      listening: ['luyện nghe', 'nghe tiếng anh', 'bài tập nghe', 'listening'],
      speaking: ['luyện nói', 'nói tiếng anh', 'phát âm', 'speaking'],
      reading: ['đọc hiểu', 'luyện đọc', 'bài đọc', 'reading'],
      writing: ['viết', 'luyện viết', 'bài tập viết', 'writing'],
    };

    const typeKey = exerciseType.toLowerCase();
    return exerciseTypeMap[typeKey] || [];
  }

  /**
   * Get configuration (for testing or external use)
   */
  getConfiguration(): VietnameseContentConfig | null {
    return this.vietnameseConfig;
  }

  /**
   * Check if configuration is loaded
   */
  isConfigurationLoaded(): boolean {
    return this.configLoaded;
  }

  /**
   * Generate Vietnamese FAQ schema
   */
  generateVietnameseFAQSchema(faqs: Array<{ question: string; answer: string }>): VietnameseFAQSchema {
    const schema: VietnameseFAQSchema = {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: faqs.map((faq) => ({
        '@type': 'Question',
        name: faq.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: faq.answer,
        },
      })),
    };

    this.logInfo('Vietnamese FAQ schema generated', { faqCount: faqs.length });
    return schema;
  }

  /**
   * Generate Vietnamese breadcrumb schema
   */
  generateVietnameseBreadcrumbSchema(
    breadcrumbs: Array<{ name: string; url: string }>
  ): VietnameseBreadcrumbSchema {
    const schema: VietnameseBreadcrumbSchema = {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: breadcrumbs.map((breadcrumb, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: breadcrumb.name,
        item: breadcrumb.url,
      })),
    };

    this.logInfo('Vietnamese breadcrumb schema generated', { breadcrumbCount: breadcrumbs.length });
    return schema;
  }

  /**
   * Generate Vietnamese course schema
   */
  generateVietnameseCourseSchema(config: {
    name: string;
    description: string;
    educationalLevel?: string;
    teaches?: string;
  }): VietnameseCourseSchema {
    const schema: VietnameseCourseSchema = {
      '@context': 'https://schema.org',
      '@type': 'Course',
      name: config.name,
      description: config.description,
      provider: {
        '@type': 'Organization',
        name: 'Daily English',
        sameAs: 'https://dailyenglish.qzz.io',
      },
      inLanguage: 'vi',
    };

    if (config.educationalLevel) {
      schema.educationalLevel = config.educationalLevel;
    }

    if (config.teaches) {
      schema.teaches = config.teaches;
    }

    this.logInfo('Vietnamese course schema generated', { courseName: config.name });
    return schema;
  }

  /**
   * Generate Vietnamese aggregate rating schema
   */
  generateVietnameseAggregateRatingSchema(config: {
    name: string;
    type: 'Product' | 'Course';
    ratingValue: number;
    reviewCount: number;
    reviews?: Array<{
      author: string;
      reviewBody: string;
      ratingValue: number;
    }>;
  }): VietnameseAggregateRatingSchema {
    const schema: VietnameseAggregateRatingSchema = {
      '@context': 'https://schema.org',
      '@type': config.type,
      name: config.name,
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: config.ratingValue,
        reviewCount: config.reviewCount,
        bestRating: 5,
        worstRating: 1,
      },
    };

    if (config.reviews && config.reviews.length > 0) {
      schema.review = config.reviews.map((review) => ({
        '@type': 'Review',
        author: {
          '@type': 'Person',
          name: review.author,
        },
        reviewBody: review.reviewBody,
        reviewRating: {
          '@type': 'Rating',
          ratingValue: review.ratingValue,
        },
      }));
    }

    this.logInfo('Vietnamese aggregate rating schema generated', {
      name: config.name,
      rating: config.ratingValue,
    });
    return schema;
  }

  /**
   * Set Vietnamese structured data in document head
   */
  setVietnameseStructuredData(
    schema: VietnameseFAQSchema | VietnameseBreadcrumbSchema | VietnameseCourseSchema | VietnameseAggregateRatingSchema,
    id?: string
  ): void {
    try {
      // Validate schema has required properties
      if (!schema['@context'] || !schema['@type']) {
        this.logWarning('Invalid schema: missing @context or @type');
        return;
      }

      // Create unique ID for the script element
      const scriptId = id || `vietnamese-schema-${schema['@type'].toLowerCase()}`;

      // Remove existing schema with same ID
      const existingScript = this.document.getElementById(scriptId);
      if (existingScript) {
        existingScript.remove();
      }

      // Create and inject new schema
      const script = this.document.createElement('script');
      script.type = 'application/ld+json';
      script.id = scriptId;
      script.text = JSON.stringify(schema);
      this.document.head.appendChild(script);

      this.logInfo('Vietnamese structured data injected', { type: schema['@type'], id: scriptId });
    } catch (error) {
      this.logError('Failed to set Vietnamese structured data', error);
    }
  }

  /**
   * Set Zalo meta tags for sharing optimization
   */
  setZaloTags(config: ZaloMetaTags): void {
    if (!this.configLoaded || !this.vietnameseConfig) {
      this.logWarning('Vietnamese configuration not loaded');
      return;
    }

    // Set standard Open Graph tags optimized for Zalo
    this.meta.updateTag({ property: 'og:title', content: config.title });
    this.meta.updateTag({ property: 'og:description', content: config.description });
    this.meta.updateTag({ property: 'og:image', content: config.image });
    this.meta.updateTag({ property: 'og:locale', content: 'vi_VN' });

    if (config.url) {
      this.meta.updateTag({ property: 'og:url', content: config.url });
    }

    // Add Zalo-specific tags
    this.meta.updateTag({ name: 'zalo:title', content: config.title });
    this.meta.updateTag({ name: 'zalo:description', content: config.description });
    this.meta.updateTag({ name: 'zalo:image', content: config.image });

    // Optimize image dimensions for Zalo (recommended: 1200x630)
    this.meta.updateTag({ property: 'og:image:width', content: '1200' });
    this.meta.updateTag({ property: 'og:image:height', content: '630' });

    this.logInfo('Zalo meta tags set', {
      title: config.title,
      image: config.image,
    });
  }

  /**
   * Optimize Open Graph tags for Facebook Vietnam
   */
  optimizeForFacebookVietnam(config: {
    title: string;
    description: string;
    image: string;
    url?: string;
    appId?: string;
  }): void {
    // Set Facebook-specific Open Graph tags
    this.meta.updateTag({ property: 'og:title', content: config.title });
    this.meta.updateTag({ property: 'og:description', content: config.description });
    this.meta.updateTag({ property: 'og:image', content: config.image });
    this.meta.updateTag({ property: 'og:locale', content: 'vi_VN' });
    this.meta.updateTag({ property: 'og:type', content: 'website' });

    if (config.url) {
      this.meta.updateTag({ property: 'og:url', content: config.url });
    }

    if (config.appId) {
      this.meta.updateTag({ property: 'fb:app_id', content: config.appId });
    }

    // Optimize image for Facebook
    this.meta.updateTag({ property: 'og:image:width', content: '1200' });
    this.meta.updateTag({ property: 'og:image:height', content: '630' });
    this.meta.updateTag({ property: 'og:image:alt', content: config.title });

    this.logInfo('Facebook Vietnam Open Graph tags optimized');
  }

  /**
   * Get optimized social description for Vietnamese platforms
   */
  getOptimizedSocialDescription(description: string, maxLength: number = 200): string {
    // Vietnamese social platforms prefer shorter descriptions
    if (description.length <= maxLength) {
      return description;
    }

    // Truncate at word boundary
    const truncated = description.substring(0, maxLength);
    const lastSpace = truncated.lastIndexOf(' ');

    if (lastSpace > 0) {
      return truncated.substring(0, lastSpace) + '...';
    }

    return truncated + '...';
  }

  /**
   * Validate social media image dimensions for Vietnamese platforms
   */
  validateSocialImageDimensions(width: number, height: number): {
    isValid: boolean;
    platform: string;
    recommendation: string;
  } {
    // Recommended dimensions for Vietnamese social platforms
    const recommendations = [
      {
        platform: 'Zalo',
        width: 1200,
        height: 630,
        isValid: width === 1200 && height === 630,
      },
      {
        platform: 'Facebook Vietnam',
        width: 1200,
        height: 630,
        isValid: width === 1200 && height === 630,
      },
    ];

    const validPlatform = recommendations.find((rec) => rec.isValid);

    if (validPlatform) {
      return {
        isValid: true,
        platform: validPlatform.platform,
        recommendation: `Image dimensions are optimal for ${validPlatform.platform}`,
      };
    }

    return {
      isValid: false,
      platform: 'All',
      recommendation: 'Recommended dimensions: 1200x630 pixels for optimal display on Zalo and Facebook Vietnam',
    };
  }

  /**
   * Validate social media tag completeness
   */
  validateSocialMediaTags(): {
    isComplete: boolean;
    missing: string[];
  } {
    const requiredTags = [
      'og:title',
      'og:description',
      'og:image',
      'og:url',
      'og:locale',
    ];

    const missing: string[] = [];

    requiredTags.forEach((tag) => {
      const tagElement = this.meta.getTag(`property="${tag}"`);
      if (!tagElement) {
        missing.push(tag);
      }
    });

    const isComplete = missing.length === 0;

    if (!isComplete) {
      this.logWarning(`Social media tags incomplete: ${missing.join(', ')}`);
    } else {
      this.logInfo('Social media tags validation passed');
    }

    return { isComplete, missing };
  }

  /**
   * Validate schema against Schema.org standards
   */
  validateSchema(
    schema: VietnameseFAQSchema | VietnameseBreadcrumbSchema | VietnameseCourseSchema | VietnameseAggregateRatingSchema
  ): boolean {
    try {
      // Basic validation
      if (!schema['@context'] || schema['@context'] !== 'https://schema.org') {
        this.logWarning('Schema validation failed: invalid @context');
        return false;
      }

      if (!schema['@type']) {
        this.logWarning('Schema validation failed: missing @type');
        return false;
      }

      // Type-specific validation
      switch (schema['@type']) {
        case 'FAQPage':
          const faqSchema = schema as VietnameseFAQSchema;
          if (!faqSchema.mainEntity || faqSchema.mainEntity.length === 0) {
            this.logWarning('FAQ schema validation failed: no questions');
            return false;
          }
          break;

        case 'BreadcrumbList':
          const breadcrumbSchema = schema as VietnameseBreadcrumbSchema;
          if (!breadcrumbSchema.itemListElement || breadcrumbSchema.itemListElement.length === 0) {
            this.logWarning('Breadcrumb schema validation failed: no items');
            return false;
          }
          break;

        case 'Course':
          const courseSchema = schema as VietnameseCourseSchema;
          if (!courseSchema.name || !courseSchema.description) {
            this.logWarning('Course schema validation failed: missing name or description');
            return false;
          }
          break;

        case 'Product':
          const ratingSchema = schema as VietnameseAggregateRatingSchema;
          if (!ratingSchema.aggregateRating) {
            this.logWarning('Rating schema validation failed: missing aggregateRating');
            return false;
          }
          break;
      }

      this.logInfo('Schema validation passed', { type: schema['@type'] });
      return true;
    } catch (error) {
      this.logError('Schema validation error', error);
      return false;
    }
  }

  /**
   * Track Vietnamese search query for analytics
   */
  trackVietnameseSearchQuery(query: string, source: 'google' | 'coccoc' | 'other' = 'other'): void {
    const trackingData = {
      query,
      source,
      timestamp: new Date().toISOString(),
      language: 'vi',
    };

    this.logInfo('Vietnamese search query tracked', trackingData);

    // Store in localStorage for basic tracking
    try {
      const existingData = localStorage.getItem('vietnamese_search_queries');
      const queries = existingData ? JSON.parse(existingData) : [];
      queries.push(trackingData);

      // Keep only last 100 queries
      if (queries.length > 100) {
        queries.shift();
      }

      localStorage.setItem('vietnamese_search_queries', JSON.stringify(queries));
    } catch (error) {
      this.logError('Failed to track search query', error);
    }
  }

  /**
   * Get Vietnamese keyword performance metrics
   */
  getVietnameseKeywordPerformance(): Array<{
    keyword: string;
    count: number;
    lastUsed: string;
  }> {
    try {
      const existingData = localStorage.getItem('vietnamese_search_queries');
      if (!existingData) {
        return [];
      }

      const queries = JSON.parse(existingData);
      const keywordMap = new Map<string, { count: number; lastUsed: string }>();

      queries.forEach((item: any) => {
        const existing = keywordMap.get(item.query);
        if (existing) {
          existing.count++;
          existing.lastUsed = item.timestamp;
        } else {
          keywordMap.set(item.query, {
            count: 1,
            lastUsed: item.timestamp,
          });
        }
      });

      const performance = Array.from(keywordMap.entries()).map(([keyword, data]) => ({
        keyword,
        count: data.count,
        lastUsed: data.lastUsed,
      }));

      // Sort by count descending
      performance.sort((a, b) => b.count - a.count);

      return performance;
    } catch (error) {
      this.logError('Failed to get keyword performance', error);
      return [];
    }
  }

  /**
   * Track Cốc Cốc vs Google.vn traffic
   */
  trackSearchEngineTraffic(): {
    cocCoc: number;
    google: number;
    other: number;
  } {
    try {
      const existingData = localStorage.getItem('vietnamese_search_queries');
      if (!existingData) {
        return { cocCoc: 0, google: 0, other: 0 };
      }

      const queries = JSON.parse(existingData);
      const traffic = {
        cocCoc: 0,
        google: 0,
        other: 0,
      };

      queries.forEach((item: any) => {
        if (item.source === 'coccoc') {
          traffic.cocCoc++;
        } else if (item.source === 'google') {
          traffic.google++;
        } else {
          traffic.other++;
        }
      });

      return traffic;
    } catch (error) {
      this.logError('Failed to track search engine traffic', error);
      return { cocCoc: 0, google: 0, other: 0 };
    }
  }

  /**
   * Track Vietnamese social media referrals
   */
  trackSocialMediaReferral(platform: 'zalo' | 'facebook' | 'other', url: string): void {
    const referralData = {
      platform,
      url,
      timestamp: new Date().toISOString(),
    };

    this.logInfo('Social media referral tracked', referralData);

    try {
      const existingData = localStorage.getItem('vietnamese_social_referrals');
      const referrals = existingData ? JSON.parse(existingData) : [];
      referrals.push(referralData);

      // Keep only last 100 referrals
      if (referrals.length > 100) {
        referrals.shift();
      }

      localStorage.setItem('vietnamese_social_referrals', JSON.stringify(referrals));
    } catch (error) {
      this.logError('Failed to track social media referral', error);
    }
  }

  /**
   * Get Vietnamese user engagement metrics
   */
  getVietnameseUserEngagement(): {
    totalSearches: number;
    totalSocialReferrals: number;
    topKeywords: string[];
    topSocialPlatform: string;
  } {
    try {
      const searchData = localStorage.getItem('vietnamese_search_queries');
      const socialData = localStorage.getItem('vietnamese_social_referrals');

      const searches = searchData ? JSON.parse(searchData) : [];
      const referrals = socialData ? JSON.parse(socialData) : [];

      // Get top keywords
      const keywordPerformance = this.getVietnameseKeywordPerformance();
      const topKeywords = keywordPerformance.slice(0, 5).map((k) => k.keyword);

      // Get top social platform
      const platformCounts = new Map<string, number>();
      referrals.forEach((ref: any) => {
        platformCounts.set(ref.platform, (platformCounts.get(ref.platform) || 0) + 1);
      });

      let topSocialPlatform = 'none';
      let maxCount = 0;
      platformCounts.forEach((count, platform) => {
        if (count > maxCount) {
          maxCount = count;
          topSocialPlatform = platform;
        }
      });

      return {
        totalSearches: searches.length,
        totalSocialReferrals: referrals.length,
        topKeywords,
        topSocialPlatform,
      };
    } catch (error) {
      this.logError('Failed to get user engagement metrics', error);
      return {
        totalSearches: 0,
        totalSocialReferrals: 0,
        topKeywords: [],
        topSocialPlatform: 'none',
      };
    }
  }

  /**
   * Clear Vietnamese SEO tracking data
   */
  clearTrackingData(): void {
    try {
      localStorage.removeItem('vietnamese_search_queries');
      localStorage.removeItem('vietnamese_social_referrals');
      this.logInfo('Vietnamese SEO tracking data cleared');
    } catch (error) {
      this.logError('Failed to clear tracking data', error);
    }
  }

  /**
   * Log info message
   */
  private logInfo(message: string, data?: any): void {
    if (data) {
      console.log(`[Vietnamese SEO]: ${message}`, data);
    } else {
      console.log(`[Vietnamese SEO]: ${message}`);
    }
  }

  /**
   * Log warning message
   */
  private logWarning(message: string): void {
    console.warn(`[Vietnamese SEO Warning]: ${message}`);
  }

  /**
   * Log error message
   */
  private logError(message: string, error?: any): void {
    console.error(`[Vietnamese SEO Error]: ${message}`, error);
  }
}
