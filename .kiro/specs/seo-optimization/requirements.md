# Requirements Document

## Introduction

This document outlines the requirements for implementing comprehensive SEO (Search Engine Optimization) for the Daily English web application at http://dailyenglish.qzz.io/. The goal is to improve search engine visibility, increase organic traffic, and help more users discover the platform through search engines like Google, Bing, and other search platforms.

## Glossary

- **SEO System**: The collection of meta tags, structured data, sitemaps, and configuration files that enable search engines to discover, crawl, index, and rank the Daily English application
- **Meta Service**: An Angular service responsible for dynamically updating HTML meta tags based on the current route and content
- **Structured Data**: JSON-LD formatted data that provides explicit information about page content to search engines
- **Sitemap**: An XML file that lists all important URLs in the application to help search engines discover content
- **Open Graph**: A protocol that enables web pages to become rich objects in social networks
- **Robots.txt**: A file that instructs search engine crawlers which pages they can or cannot access

## Requirements

### Requirement 1

**User Story:** As a potential user searching for English learning resources, I want the Daily English website to appear in search results with accurate title and description, so that I can discover the platform and understand what it offers.

#### Acceptance Criteria

1. THE SEO System SHALL include a descriptive title tag with the format "Daily English - [Page Name]" for all routes
2. THE SEO System SHALL include a meta description tag between 150-160 characters that accurately describes the page content
3. THE SEO System SHALL include meta keywords tag with relevant English learning terms
4. THE SEO System SHALL include canonical URL tags to prevent duplicate content issues
5. THE SEO System SHALL update meta tags dynamically when the user navigates between routes

### Requirement 2

**User Story:** As a user sharing Daily English on social media, I want the shared link to display an attractive preview with image and description, so that my friends can see what the platform offers before clicking.

#### Acceptance Criteria

1. THE SEO System SHALL include Open Graph meta tags (og:title, og:description, og:image, og:url, og:type) for all pages
2. THE SEO System SHALL include Twitter Card meta tags (twitter:card, twitter:title, twitter:description, twitter:image) for all pages
3. THE SEO System SHALL provide a default Open Graph image at least 1200x630 pixels for social sharing
4. WHEN a user shares a specific exercise page, THEN THE SEO System SHALL include exercise-specific title and description in social meta tags
5. THE SEO System SHALL include og:locale tag set to "vi_VN" for Vietnamese audience

### Requirement 3

**User Story:** As a search engine crawler, I want to access a sitemap and robots.txt file, so that I can efficiently discover and index all important pages on the Daily English website.

#### Acceptance Criteria

1. THE SEO System SHALL provide a sitemap.xml file listing all public routes and exercise pages
2. THE SEO System SHALL include lastmod, changefreq, and priority attributes for each URL in the sitemap
3. THE SEO System SHALL provide a robots.txt file that allows crawling of all public content
4. THE SEO System SHALL reference the sitemap.xml location in the robots.txt file
5. THE SEO System SHALL exclude admin or private routes from the sitemap

### Requirement 4

**User Story:** As a search engine, I want to understand the structured content of Daily English pages, so that I can display rich snippets in search results and improve click-through rates.

#### Acceptance Criteria

1. THE SEO System SHALL include JSON-LD structured data with @type "WebSite" on the homepage
2. THE SEO System SHALL include JSON-LD structured data with @type "EducationalOrganization" describing Daily English
3. WHEN displaying an exercise page, THEN THE SEO System SHALL include JSON-LD structured data with @type "LearningResource"
4. THE SEO System SHALL include searchAction schema markup to enable site search in search results
5. THE SEO System SHALL validate all structured data against Google's Structured Data Testing Tool requirements

### Requirement 5

**User Story:** As a website owner, I want the application to be optimized for Core Web Vitals and performance metrics, so that search engines rank the site higher based on user experience signals.

#### Acceptance Criteria

1. THE SEO System SHALL ensure the index.html includes viewport meta tag for mobile responsiveness
2. THE SEO System SHALL include theme-color meta tag for browser UI customization
3. THE SEO System SHALL preconnect to external domains (Azure OpenAI, Google Gemini) to reduce latency
4. THE SEO System SHALL include language attribute (lang="vi") in the HTML tag for Vietnamese content
5. THE SEO System SHALL ensure all images have alt attributes for accessibility and SEO

### Requirement 6

**User Story:** As a developer, I want a centralized Meta Service to manage all SEO-related tags, so that I can easily update meta information throughout the application without duplicating code.

#### Acceptance Criteria

1. THE Meta Service SHALL provide methods to update title, description, keywords, and canonical URL
2. THE Meta Service SHALL provide methods to update Open Graph and Twitter Card tags
3. THE Meta Service SHALL provide methods to inject JSON-LD structured data into the page
4. WHEN a route changes, THEN THE Meta Service SHALL automatically update relevant meta tags based on route configuration
5. THE Meta Service SHALL use Angular's Meta and Title services for DOM manipulation

### Requirement 7

**User Story:** As a Vietnamese user searching in Vietnamese, I want the website to appear in Vietnamese search results with Vietnamese content, so that I can find relevant English learning resources in my native language.

#### Acceptance Criteria

1. THE SEO System SHALL include hreflang tags indicating Vietnamese (vi) as the primary language
2. THE SEO System SHALL include Vietnamese keywords and descriptions in meta tags
3. THE SEO System SHALL use Vietnamese text in structured data where appropriate
4. THE SEO System SHALL set the HTML lang attribute to "vi" for Vietnamese content
5. THE SEO System SHALL include alternate language tags if English version is available

### Requirement 8

**User Story:** As a website administrator, I want to track SEO performance and verify proper implementation, so that I can measure the impact of SEO improvements and identify issues.

#### Acceptance Criteria

1. THE SEO System SHALL be compatible with Google Search Console verification methods
2. THE SEO System SHALL include meta tags for Google Analytics integration
3. THE SEO System SHALL support adding verification meta tags for Bing Webmaster Tools
4. THE SEO System SHALL log warnings to console when required meta tags are missing
5. THE SEO System SHALL provide documentation on how to verify SEO implementation
