# Implementation Plan

- [x] 1. Create SeoService with core meta tag functionality


  - Create `src/app/services/seo.service.ts` with Injectable decorator and providedIn: 'root'
  - Inject Angular Meta, Title, Router, and DOCUMENT services using inject() function
  - Implement SeoConfig interface for type-safe configuration
  - Implement setTitle() method to update page title with "Daily English" suffix
  - Implement setDescription() method to update meta description tag
  - Implement setKeywords() method to update meta keywords tag
  - Implement setCanonicalUrl() method to set/update canonical link tag
  - Add validation logic with console warnings for missing required fields
  - Add fallback values for title and description
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 6.1, 6.2_

- [x] 2. Implement Open Graph and Twitter Card tag generation

  - Create setOpenGraphTags() method in SeoService
  - Implement og:title, og:description, og:image, og:url, og:type, og:locale meta tags
  - Create setTwitterCardTags() method in SeoService
  - Implement twitter:card, twitter:title, twitter:description, twitter:image meta tags
  - Add default og-image path fallback to /og-image.png
  - Implement updateTags() method that calls both Open Graph and Twitter Card methods
  - Set og:locale to "vi_VN" for Vietnamese audience
  - _Requirements: 2.1, 2.2, 2.4, 2.5, 7.1_

- [x] 3. Implement JSON-LD structured data functionality


  - Create StructuredData interface for type-safe schema definitions
  - Create WebSiteSchema, EducationalOrganizationSchema, and LearningResourceSchema interfaces
  - Implement setStructuredData() method to inject JSON-LD script into document head
  - Implement removeStructuredData() method to clean up existing structured data
  - Create helper method to generate WebSite schema with searchAction
  - Create helper method to generate EducationalOrganization schema
  - Create helper method to generate LearningResource schema for exercises
  - Add JSON validation and error logging for malformed structured data
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 6.3_

- [x] 4. Implement route-based meta tag updates


  - Create RouteSeoData interface for route configuration
  - Implement updateMetaForRoute() method that reads route data and updates meta tags
  - Subscribe to Router NavigationEnd events in SeoService constructor
  - Extract SEO data from activated route snapshot
  - Call updateTags() with route-specific configuration on navigation
  - Handle dynamic route parameters (e.g., exercise/:id) for exercise-specific meta tags
  - Add logic to update structured data based on route type
  - _Requirements: 1.5, 6.4_

- [x] 5. Update index.html with static meta tags and optimizations


  - Add theme-color meta tag with value "#4F46E5"
  - Add language meta tag with value "Vietnamese"
  - Add author meta tag with value "Daily English"
  - Update default title to "Daily English - Học tiếng Anh mỗi ngày"
  - Update default meta description with Vietnamese content
  - Add default meta keywords with Vietnamese search terms
  - Add og:site_name meta tag with value "Daily English"
  - Add og:locale meta tag with value "vi_VN"
  - Add preconnect link tags for external domains (fonts.googleapis.com, fonts.gstatic.com)
  - Add default canonical link tag pointing to base URL
  - Set HTML lang attribute to "vi" for Vietnamese
  - _Requirements: 5.1, 5.2, 5.3, 7.2, 7.4_

- [x] 6. Create static SEO files (sitemap.xml, robots.txt, og-image)


  - Create `public/sitemap.xml` with XML declaration and urlset namespace
  - Add homepage URL with priority 1.0 and daily changefreq
  - Add /home URL with priority 0.9 and daily changefreq
  - Add /exercises URL with priority 0.9 and weekly changefreq
  - Add /guide URL with priority 0.8 and weekly changefreq
  - Add lastmod dates to all URLs (current date)
  - Create `public/robots.txt` file
  - Add User-agent: * directive
  - Add Allow directives for public pages (/home, /exercises, /guide)
  - Add Disallow directives for authenticated pages (/login, /profile, /dashboard, /favorites, /achievements)
  - Add Sitemap reference pointing to http://dailyenglish.qzz.io/sitemap.xml
  - Create or obtain og-image.png (1200x630 pixels) with Daily English branding
  - Place og-image.png in `public/` directory
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 2.3_

- [x] 7. Add SEO data to route configurations


  - Update `src/app/app.routes.ts` to import RouteSeoData interface
  - Add SEO data to home route with Vietnamese title, description, and keywords
  - Add SEO data to exercises route with relevant Vietnamese content
  - Add SEO data to guide route with helpful Vietnamese description
  - Add SEO data to login route with noindex flag (should not be indexed)
  - Set structuredDataType to 'WebSite' for homepage
  - Set structuredDataType to 'EducationalOrganization' for main pages
  - Include Vietnamese keywords: "học tiếng anh", "luyện dịch", "AI feedback", "học tiếng anh online"
  - _Requirements: 7.2, 7.3_

- [x] 8. Initialize SeoService in application bootstrap


  - Update `src/app/app.config.ts` to import SeoService
  - Add APP_INITIALIZER provider to initialize SeoService on app startup
  - Create initialization function that sets default structured data for homepage
  - Ensure SeoService starts listening to router events immediately
  - _Requirements: 6.4_

- [x] 9. Add exercise-specific meta tag generation


  - Update ExerciseDetailComponent to inject SeoService
  - In ngOnInit or effect, call SeoService.updateTags() with exercise-specific data
  - Generate title using exercise title: "[Exercise Title] - Daily English"
  - Generate description using exercise description or first sentence
  - Add LearningResource structured data with exercise details
  - Include exercise difficulty level in structured data
  - Set og:type to "article" for exercise pages
  - _Requirements: 2.4, 4.3_

- [x] 10. Add hreflang tags for Vietnamese localization


  - Implement setHreflangTags() method in SeoService
  - Add hreflang="vi" tag pointing to current Vietnamese page
  - Add hreflang="x-default" tag pointing to default language version
  - Call setHreflangTags() in updateMetaForRoute() method
  - _Requirements: 7.1, 7.5_

- [x] 11. Add verification meta tags support


  - Implement addVerificationTag() method in SeoService
  - Support Google Search Console verification meta tag
  - Support Bing Webmaster Tools verification meta tag
  - Add configuration option in environment files for verification codes
  - Document how to add verification codes in implementation notes
  - _Requirements: 8.1, 8.3_

- [x] 12. Write unit tests for SeoService


  - Create `src/app/services/seo.service.spec.ts` test file
  - Write test for service initialization and dependency injection
  - Write test for setTitle() method verifying Title service is called
  - Write test for setDescription() method verifying Meta service is called
  - Write test for setKeywords() method verifying meta keywords tag creation
  - Write test for setCanonicalUrl() method verifying link tag creation
  - Write test for setOpenGraphTags() verifying all og: tags are created
  - Write test for setTwitterCardTags() verifying all twitter: tags are created
  - Write test for setStructuredData() verifying JSON-LD script injection
  - Write test for removeStructuredData() verifying script removal
  - Write test for validation warnings when required fields are missing
  - Write test for fallback values when title or description is empty
  - Write test for route navigation triggering meta tag updates
  - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [x] 13. Perform integration testing and validation



  - Test navigation between routes and verify meta tags update correctly
  - Test exercise detail page and verify exercise-specific meta tags
  - Access /sitemap.xml in browser and verify XML structure
  - Access /robots.txt in browser and verify directives
  - Test Open Graph tags using Facebook Sharing Debugger
  - Test Twitter Cards using Twitter Card Validator
  - Validate structured data using Google Rich Results Test
  - Validate schema markup using Schema.org validator
  - Check browser DevTools to inspect head tags after navigation
  - Verify no console errors or warnings related to SEO
  - _Requirements: 4.5, 8.5_


- [x] 14. Create SEO documentation and setup guide


  - Create documentation file explaining SEO implementation
  - Document how to add verification codes for Google Search Console
  - Document how to submit sitemap to search engines
  - Document how to test Open Graph tags with social media debuggers
  - Document how to monitor SEO performance with Google Search Console
  - Document how to update og-image.png for different campaigns
  - Document Vietnamese keyword strategy and recommendations
  - _Requirements: 8.5_
