# SEO Optimization Design Document

## Overview

This design document outlines the comprehensive SEO implementation for the Daily English application. The solution includes a centralized Meta Service for managing SEO tags, static files for search engine crawlers (sitemap.xml, robots.txt), structured data implementation, and route-specific meta tag configurations. The design follows Angular best practices using signals, standalone components, and the inject() function for dependency injection.

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Angular Application                      │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐         ┌─────────────────────────────┐  │
│  │   Router     │────────▶│    SeoService               │  │
│  │  Navigation  │         │  - updateMetaTags()         │  │
│  └──────────────┘         │  - setStructuredData()      │  │
│                            │  - updateSocialTags()       │  │
│                            └─────────────┬───────────────┘  │
│                                          │                   │
│                                          ▼                   │
│                            ┌─────────────────────────────┐  │
│                            │   Angular Meta & Title      │  │
│                            │   Services                  │  │
│                            └─────────────────────────────┘  │
│                                                               │
└─────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
                    ┌──────────────────────────────┐
                    │      HTML <head> Tags        │
                    │  - Meta tags                 │
                    │  - Open Graph tags           │
                    │  - JSON-LD structured data   │
                    └──────────────────────────────┘
                                   │
                                   ▼
                    ┌──────────────────────────────┐
                    │   Search Engine Crawlers     │
                    │  - Google                    │
                    │  - Bing                      │
                    │  - Social media bots         │
                    └──────────────────────────────┘

Static Files:
├── public/sitemap.xml
├── public/robots.txt
└── public/og-image.png (1200x630)
```

### Component Integration

The SEO system integrates with the existing Angular application through:

1. **App Initialization**: SeoService initializes in app.config.ts using APP_INITIALIZER
2. **Router Events**: Listens to NavigationEnd events to update meta tags on route changes
3. **Component Integration**: Components can inject SeoService to set page-specific meta data
4. **Static Assets**: Sitemap and robots.txt served from the public directory

## Components and Interfaces

### 1. SeoService

**Location**: `src/app/services/seo.service.ts`

**Purpose**: Centralized service for managing all SEO-related functionality including meta tags, Open Graph tags, Twitter Cards, and structured data.

**Interface**:

```typescript
interface SeoConfig {
  title: string;
  description: string;
  keywords?: string[];
  image?: string;
  url?: string;
  type?: 'website' | 'article' | 'profile';
  locale?: string;
  author?: string;
}

interface StructuredData {
  '@context': string;
  '@type': string;
  [key: string]: any;
}

@Injectable({ providedIn: 'root' })
export class SeoService {
  // Core methods
  updateTags(config: SeoConfig): void;
  setTitle(title: string): void;
  setDescription(description: string): void;
  setKeywords(keywords: string[]): void;
  setCanonicalUrl(url?: string): void;
  
  // Social media methods
  setOpenGraphTags(config: SeoConfig): void;
  setTwitterCardTags(config: SeoConfig): void;
  
  // Structured data methods
  setStructuredData(data: StructuredData): void;
  removeStructuredData(): void;
  
  // Route-based updates
  updateMetaForRoute(route: string, params?: any): void;
}
```

**Dependencies**:
- Angular Meta service (for meta tag manipulation)
- Angular Title service (for title updates)
- Router (for route change detection)
- DOCUMENT token (for DOM manipulation)

**Key Features**:
- Automatic meta tag updates on route navigation
- Support for dynamic content (exercise-specific meta tags)
- Vietnamese language support
- Validation and error logging for missing required tags

### 2. Route Configuration Enhancement

**Location**: `src/app/app.routes.ts`

**Enhancement**: Add SEO metadata to route data

```typescript
interface RouteSeoData {
  title: string;
  description: string;
  keywords?: string[];
  structuredDataType?: 'WebSite' | 'EducationalOrganization' | 'LearningResource';
}

// Example route with SEO data
{
  path: 'home',
  loadComponent: () => import('./components/home/home').then((m) => m.HomeComponent),
  data: {
    seo: {
      title: 'Trang chủ - Daily English',
      description: 'Học tiếng Anh mỗi ngày với bài tập dịch câu, phản hồi AI, và theo dõi tiến độ',
      keywords: ['học tiếng anh', 'luyện dịch', 'AI feedback', 'học tiếng anh online'],
      structuredDataType: 'WebSite'
    }
  }
}
```

### 3. Static Files

#### sitemap.xml

**Location**: `public/sitemap.xml`

**Structure**:
```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>http://dailyenglish.qzz.io/</loc>
    <lastmod>2025-11-09</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>http://dailyenglish.qzz.io/home</loc>
    <lastmod>2025-11-09</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
  <!-- Additional URLs for exercises, guide, etc. -->
</urlset>
```

**Content Strategy**:
- Homepage: Priority 1.0, daily updates
- Main pages (exercises, guide): Priority 0.9, weekly updates
- Exercise detail pages: Priority 0.7, monthly updates
- User-specific pages (profile, dashboard): Excluded (require auth)

#### robots.txt

**Location**: `public/robots.txt`

**Content**:
```
User-agent: *
Allow: /
Allow: /home
Allow: /exercises
Allow: /guide
Disallow: /login
Disallow: /profile
Disallow: /dashboard
Disallow: /favorites
Disallow: /achievements

Sitemap: http://dailyenglish.qzz.io/sitemap.xml
```

**Strategy**: Allow public pages, disallow authenticated pages

#### Open Graph Image

**Location**: `public/og-image.png`

**Specifications**:
- Dimensions: 1200x630 pixels
- Format: PNG or JPG
- Content: Daily English logo, tagline, and visual elements
- File size: < 300KB for fast loading

### 4. Index.html Enhancements

**Location**: `src/index.html`

**Static Meta Tags** (added to <head>):

```html
<!-- Basic Meta Tags -->
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="theme-color" content="#4F46E5">
<meta name="language" content="Vietnamese">
<meta name="author" content="Daily English">

<!-- Default SEO Tags (will be overridden by SeoService) -->
<title>Daily English - Học tiếng Anh mỗi ngày</title>
<meta name="description" content="Nền tảng học tiếng Anh với bài tập dịch câu, phản hồi AI thông minh, và theo dõi tiến độ học tập">
<meta name="keywords" content="học tiếng anh, luyện dịch, AI feedback, học tiếng anh online, daily english">

<!-- Open Graph Default Tags -->
<meta property="og:site_name" content="Daily English">
<meta property="og:locale" content="vi_VN">

<!-- Preconnect for Performance -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>

<!-- Canonical URL (will be updated by SeoService) -->
<link rel="canonical" href="http://dailyenglish.qzz.io/">
```

## Data Models

### SeoConfig Interface

```typescript
export interface SeoConfig {
  // Required fields
  title: string;
  description: string;
  
  // Optional fields
  keywords?: string[];
  image?: string;
  url?: string;
  type?: 'website' | 'article' | 'profile';
  locale?: string;
  author?: string;
  
  // Social media specific
  twitterCard?: 'summary' | 'summary_large_image' | 'app' | 'player';
  twitterSite?: string;
  twitterCreator?: string;
}
```

### StructuredData Types

```typescript
// Website Schema
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

// Educational Organization Schema
export interface EducationalOrganizationSchema {
  '@context': 'https://schema.org';
  '@type': 'EducationalOrganization';
  name: string;
  url: string;
  description: string;
  logo?: string;
  sameAs?: string[];
}

// Learning Resource Schema (for exercises)
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
```

### Route SEO Configuration

```typescript
export interface RouteSeoData {
  title: string;
  description: string;
  keywords?: string[];
  image?: string;
  structuredDataType?: 'WebSite' | 'EducationalOrganization' | 'LearningResource';
  noindex?: boolean; // For pages that shouldn't be indexed
}
```

## Error Handling

### Validation Strategy

1. **Required Field Validation**:
   - Log console warnings when title or description is missing
   - Provide default fallback values for critical fields
   - Validate description length (150-160 characters recommended)

2. **URL Validation**:
   - Ensure canonical URLs are absolute
   - Validate image URLs for Open Graph tags
   - Handle relative vs absolute URL conversion

3. **Structured Data Validation**:
   - Validate JSON-LD syntax before injection
   - Log errors for malformed structured data
   - Provide schema validation against schema.org types

### Error Logging

```typescript
export class SeoService {
  private logWarning(message: string): void {
    console.warn(`[SEO Warning]: ${message}`);
  }
  
  private logError(message: string, error?: any): void {
    console.error(`[SEO Error]: ${message}`, error);
  }
  
  // Example usage
  updateTags(config: SeoConfig): void {
    if (!config.title) {
      this.logWarning('Title is required for SEO');
      config.title = 'Daily English'; // Fallback
    }
    
    if (config.description && config.description.length > 160) {
      this.logWarning(`Description too long (${config.description.length} chars). Recommended: 150-160 chars`);
    }
  }
}
```

### Fallback Strategies

1. **Missing Meta Tags**: Use default values from environment configuration
2. **Missing Images**: Use default og-image.png
3. **Invalid URLs**: Fall back to base URL (http://dailyenglish.qzz.io/)
4. **Route Without SEO Data**: Use generic page-level defaults

## Testing Strategy

### Unit Tests

**File**: `src/app/services/seo.service.spec.ts`

**Test Cases**:
1. Service initialization and dependency injection
2. Title updates via Title service
3. Meta tag creation and updates via Meta service
4. Open Graph tag generation
5. Twitter Card tag generation
6. Structured data injection and removal
7. Route-based meta tag updates
8. Validation and error logging
9. Fallback value handling
10. URL canonicalization

**Example Test Structure**:
```typescript
describe('SeoService', () => {
  let service: SeoService;
  let metaService: Meta;
  let titleService: Title;
  
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [SeoService]
    });
    service = TestBed.inject(SeoService);
    metaService = TestBed.inject(Meta);
    titleService = TestBed.inject(Title);
  });
  
  it('should update page title', () => {
    service.setTitle('Test Page');
    expect(titleService.getTitle()).toBe('Test Page - Daily English');
  });
  
  it('should create Open Graph tags', () => {
    service.setOpenGraphTags({
      title: 'Test',
      description: 'Test description',
      image: 'test.jpg'
    });
    expect(metaService.getTag('property="og:title"')).toBeTruthy();
  });
  
  // Additional test cases...
});
```

### Integration Tests

**Test Scenarios**:
1. **Route Navigation**: Verify meta tags update when navigating between routes
2. **Exercise Detail Page**: Verify exercise-specific meta tags are generated
3. **Social Sharing**: Verify Open Graph tags render correctly for social media crawlers
4. **Sitemap Accessibility**: Verify sitemap.xml is accessible at /sitemap.xml
5. **Robots.txt**: Verify robots.txt is accessible and contains correct directives

### Manual Testing Checklist

1. **Google Search Console**:
   - Submit sitemap
   - Verify URL indexing
   - Check for crawl errors
   - Validate structured data

2. **Social Media Debuggers**:
   - Facebook Sharing Debugger: https://developers.facebook.com/tools/debug/
   - Twitter Card Validator: https://cards-dev.twitter.com/validator
   - LinkedIn Post Inspector: https://www.linkedin.com/post-inspector/

3. **SEO Tools**:
   - Google Rich Results Test: https://search.google.com/test/rich-results
   - Schema Markup Validator: https://validator.schema.org/
   - PageSpeed Insights: https://pagespeed.web.dev/

4. **Browser DevTools**:
   - Inspect <head> tags after navigation
   - Verify JSON-LD structured data in DOM
   - Check console for SEO warnings/errors

### Performance Testing

**Metrics to Monitor**:
1. **Core Web Vitals**:
   - Largest Contentful Paint (LCP) < 2.5s
   - First Input Delay (FID) < 100ms
   - Cumulative Layout Shift (CLS) < 0.1

2. **SEO-Specific Metrics**:
   - Time to first meta tag render
   - Structured data injection time
   - Impact on initial page load

3. **Crawlability**:
   - Verify search engines can access all public pages
   - Check for broken links in sitemap
   - Validate robots.txt directives

## Implementation Notes

### Phase 1: Core Infrastructure
1. Create SeoService with basic meta tag functionality
2. Update index.html with static meta tags
3. Create sitemap.xml and robots.txt
4. Add Open Graph image asset

### Phase 2: Route Integration
1. Add SEO data to route configurations
2. Implement router event listener in SeoService
3. Create route-specific meta tag logic
4. Test navigation and meta tag updates

### Phase 3: Structured Data
1. Implement JSON-LD injection methods
2. Create schema templates for different page types
3. Add structured data to homepage and key pages
4. Validate with Google Rich Results Test

### Phase 4: Social Media Optimization
1. Implement Open Graph tag generation
2. Implement Twitter Card tag generation
3. Create and optimize og-image.png
4. Test with social media debuggers

### Phase 5: Testing & Validation
1. Write unit tests for SeoService
2. Perform integration testing
3. Submit sitemap to Google Search Console
4. Monitor indexing and search performance

### Vietnamese Language Considerations

1. **Meta Tags**: Use Vietnamese for title, description, and keywords
2. **Structured Data**: Include Vietnamese content in schema markup
3. **Hreflang Tags**: Set to "vi" for Vietnamese content
4. **Keywords**: Focus on Vietnamese search terms:
   - "học tiếng anh"
   - "luyện dịch tiếng anh"
   - "học tiếng anh online"
   - "bài tập tiếng anh"
   - "AI học tiếng anh"

### Performance Optimization

1. **Lazy Loading**: SeoService uses providedIn: 'root' for singleton pattern
2. **Minimal DOM Manipulation**: Batch meta tag updates when possible
3. **Caching**: Cache structured data templates to avoid regeneration
4. **Preconnect**: Add preconnect hints for external resources in index.html

### Accessibility Considerations

1. **Alt Text**: Ensure all images (including og-image) have descriptive alt text
2. **Language Attributes**: Set lang="vi" on HTML element
3. **Semantic HTML**: Use proper heading hierarchy for better SEO and accessibility
4. **ARIA Labels**: Maintain existing ARIA attributes for screen readers

## Future Enhancements

1. **Dynamic Sitemap Generation**: Generate sitemap.xml dynamically based on available exercises
2. **Multi-language Support**: Add hreflang tags for English version if created
3. **Blog/Content Section**: Add article schema for blog posts
4. **Video Schema**: If video content is added, implement VideoObject schema
5. **FAQ Schema**: Add FAQ schema for guide/help pages
6. **Breadcrumb Schema**: Implement breadcrumb navigation schema
7. **Analytics Integration**: Track SEO performance metrics in Google Analytics
8. **A/B Testing**: Test different meta descriptions and titles for better CTR
