# Vietnamese SEO Integration Testing Guide

## Overview

This document provides comprehensive testing procedures for Vietnamese SEO features. Follow these steps to ensure all Vietnamese SEO functionality works correctly.

## Prerequisites

- Application deployed to staging or production
- Access to testing tools
- Vietnamese language support enabled
- Test accounts created

## Testing Checklist

### 1. Vietnamese Meta Tags Update on Route Navigation

**Objective**: Verify Vietnamese meta tags update correctly when navigating between routes.

**Steps**:
1. Navigate to home page (`/`)
2. Open browser DevTools > Elements
3. Inspect `<head>` section
4. Verify Vietnamese meta tags:
   - `<meta property="og:title">` contains Vietnamese text
   - `<meta property="og:description">` contains Vietnamese text
   - `<meta property="og:locale" content="vi_VN">`
   - `<meta name="keywords">` contains Vietnamese keywords

5. Navigate to exercises page (`/exercises`)
6. Verify meta tags update with new Vietnamese content
7. Navigate to guide page (`/guide`)
8. Verify meta tags update again

**Expected Results**:
- Meta tags update on each route change
- Vietnamese diacritics display correctly
- No console errors
- Tags contain appropriate Vietnamese content

**Test Status**: ⬜ Not Started | ⬜ In Progress | ⬜ Passed | ⬜ Failed

---

### 2. Vietnamese Exercise Page Meta Tags with Dynamic Content

**Objective**: Verify exercise pages generate Vietnamese meta tags dynamically.

**Steps**:
1. Navigate to any exercise page (`/exercise/{id}`)
2. Inspect `<head>` section
3. Verify Vietnamese meta tags include:
   - Exercise title in Vietnamese
   - Category in Vietnamese (e.g., "Dịch câu")
   - Level in Vietnamese (e.g., "Sơ cấp")
   - Vietnamese keywords related to exercise

4. Check structured data:
   - Look for `<script type="application/ld+json">`
   - Verify Vietnamese breadcrumb schema
   - Verify Vietnamese course schema

5. Test with different exercises:
   - Beginner level exercise
   - Intermediate level exercise
   - Advanced level exercise

**Expected Results**:
- Vietnamese title follows template format
- Category and level translated correctly
- Structured data includes Vietnamese properties
- Keywords relevant to exercise content

**Test Status**: ⬜ Not Started | ⬜ In Progress | ⬜ Passed | ⬜ Failed

---

### 3. Cốc Cốc Meta Tags in Cốc Cốc Browser

**Objective**: Verify Cốc Cốc-specific meta tags and optimizations.

**Steps**:
1. Download and install Cốc Cốc browser from https://coccoc.com/
2. Open application in Cốc Cốc browser
3. Open DevTools > Console
4. Look for log: `[Cốc Cốc SEO]: Cốc Cốc browser detected`
5. Inspect `<head>` section
6. Verify Cốc Cốc meta tags:
   - `<meta name="coccoc:title">`
   - `<meta name="coccoc:description">`
   - `<meta name="coccoc:keywords">`
   - `<meta name="coccoc:optimized" content="true">`

7. Check `<body>` has class `coccoc-browser`
8. Verify sitemap link:
   - `<link rel="sitemap" href="/sitemap-vi.xml">`

**Expected Results**:
- Cốc Cốc browser detected automatically
- Cốc Cốc-specific tags present
- Body class added
- Sitemap reference present
- No console errors

**Test Status**: ⬜ Not Started | ⬜ In Progress | ⬜ Passed | ⬜ Failed

---

### 4. Zalo Link Sharing Preview

**Objective**: Test link preview when sharing on Zalo.

**Steps**:
1. Open Zalo app on mobile device
2. Share application URL in a chat
3. Verify preview displays:
   - Vietnamese title
   - Vietnamese description
   - Vietnamese OG image (og-image-vi.png)

4. Test different pages:
   - Home page
   - Exercises page
   - Individual exercise page

5. Check preview on:
   - Zalo mobile app (iOS)
   - Zalo mobile app (Android)
   - Zalo web version

**Expected Results**:
- Preview appears immediately
- Image displays correctly (1200x630)
- Vietnamese text readable
- No broken images
- Description not truncated

**Test Status**: ⬜ Not Started | ⬜ In Progress | ⬜ Passed | ⬜ Failed

**Notes**:
- If preview doesn't appear, check Zalo cache
- May need to wait 24 hours for Zalo to cache new URLs
- Use Zalo's link debugger if available

---

### 5. Facebook Vietnam Sharing

**Objective**: Test link sharing on Facebook Vietnam.

**Steps**:
1. Go to Facebook Sharing Debugger: https://developers.facebook.com/tools/debug/
2. Enter application URL
3. Click "Debug"
4. Verify:
   - `og:title` in Vietnamese
   - `og:description` in Vietnamese
   - `og:image` shows Vietnamese image
   - `og:locale` is `vi_VN`
   - No errors or warnings

5. Click "Scrape Again" to refresh
6. Test sharing on Facebook:
   - Create a post with application link
   - Verify preview matches debugger
   - Check on mobile and desktop

**Expected Results**:
- No errors in debugger
- All OG tags present
- Image displays correctly
- Vietnamese text displays properly
- Preview looks professional

**Test Status**: ⬜ Not Started | ⬜ In Progress | ⬜ Passed | ⬜ Failed

---

### 6. Validate Vietnamese Structured Data

**Objective**: Validate structured data with Google Rich Results Test.

**Steps**:
1. Go to Google Rich Results Test: https://search.google.com/test/rich-results
2. Enter application URL
3. Click "Test URL"
4. Wait for results
5. Verify structured data detected:
   - FAQPage schema (if applicable)
   - BreadcrumbList schema
   - Course/LearningResource schema

6. Check for errors or warnings
7. Verify Vietnamese properties:
   - `inLanguage: "vi"`
   - Vietnamese text in name/description fields

8. Test multiple pages:
   - Home page
   - Exercises page
   - Individual exercise page

**Expected Results**:
- All schemas valid
- No errors
- Vietnamese properties present
- Rich results eligible

**Test Status**: ⬜ Not Started | ⬜ In Progress | ⬜ Passed | ⬜ Failed

---

### 7. Vietnamese Sitemap Accessibility

**Objective**: Verify Vietnamese sitemap is accessible and valid.

**Steps**:
1. Navigate to: https://dailyenglish.qzz.io/sitemap-vi.xml
2. Verify sitemap loads without errors
3. Check XML structure is valid
4. Verify all URLs are accessible
5. Check hreflang annotations:
   - `<xhtml:link rel="alternate" hreflang="vi">`

6. Validate with XML validator
7. Submit to Google Search Console:
   - Go to Sitemaps section
   - Add sitemap-vi.xml
   - Verify submission successful

8. Submit to Cốc Cốc Webmaster:
   - Go to https://webmaster.coccoc.com/
   - Submit sitemap-vi.xml
   - Wait for indexing

**Expected Results**:
- Sitemap accessible
- Valid XML structure
- All URLs return 200 status
- Hreflang tags correct
- Successfully submitted to search engines

**Test Status**: ⬜ Not Started | ⬜ In Progress | ⬜ Passed | ⬜ Failed

---

### 8. Mobile Performance on Vietnamese Networks

**Objective**: Test performance on simulated Vietnamese 3G/4G networks.

**Steps**:
1. Open Chrome DevTools
2. Go to Network tab
3. Select "Slow 3G" throttling
4. Navigate to application
5. Measure:
   - Time to First Byte (TTFB)
   - First Contentful Paint (FCP)
   - Largest Contentful Paint (LCP)
   - Total page load time

6. Test on "Fast 3G" throttling
7. Test on "4G" throttling
8. Run Lighthouse audit:
   - Performance score
   - Accessibility score
   - Best Practices score
   - SEO score

**Expected Results**:
- TTFB < 1s on 3G
- FCP < 2s on 3G
- LCP < 4s on 3G
- Performance score > 80
- SEO score > 90

**Test Status**: ⬜ Not Started | ⬜ In Progress | ⬜ Passed | ⬜ Failed

---

### 9. Vietnamese Diacritics Display

**Objective**: Verify Vietnamese diacritics display correctly across browsers.

**Steps**:
1. Test in Chrome:
   - Check all Vietnamese text
   - Verify diacritics render correctly
   - Check meta tags in DevTools

2. Test in Firefox:
   - Same checks as Chrome

3. Test in Safari:
   - Same checks as Chrome

4. Test in Edge:
   - Same checks as Chrome

5. Test in Cốc Cốc:
   - Same checks as Chrome

6. Test on mobile browsers:
   - Chrome Mobile
   - Safari Mobile
   - Cốc Cốc Mobile

**Expected Results**:
- All diacritics display correctly
- No boxes or question marks
- Consistent across browsers
- Readable on all screen sizes

**Test Status**: ⬜ Not Started | ⬜ In Progress | ⬜ Passed | ⬜ Failed

---

### 10. Vietnamese Breadcrumbs and FAQ Display

**Objective**: Verify Vietnamese breadcrumbs and FAQs display correctly.

**Steps**:
1. Navigate to pages with breadcrumbs
2. Verify breadcrumb component displays:
   - Vietnamese labels
   - Correct navigation links
   - Proper styling

3. Navigate to pages with FAQs
4. Verify FAQ component displays:
   - Vietnamese questions
   - Vietnamese answers
   - Expand/collapse functionality

5. Check structured data:
   - Breadcrumb schema in `<head>`
   - FAQ schema in `<head>`

6. Test on mobile devices

**Expected Results**:
- Breadcrumbs display correctly
- FAQs expand/collapse properly
- Vietnamese text readable
- Structured data present
- Mobile-friendly

**Test Status**: ⬜ Not Started | ⬜ In Progress | ⬜ Passed | ⬜ Failed

---

## Automated Testing

### Unit Tests

Run unit tests:
```bash
npm test
```

Verify:
- VietnameseSeoService tests pass
- CocCocSeoService tests pass
- All test suites pass

### E2E Tests (Optional)

Create E2E tests for critical flows:
1. Navigate to exercise page
2. Verify Vietnamese meta tags
3. Check structured data
4. Verify Zalo tags

## Performance Testing

### Core Web Vitals

Test on Vietnamese networks:
1. Use Chrome DevTools Network throttling
2. Simulate "Slow 3G" (Vietnam typical)
3. Measure Core Web Vitals:
   - LCP < 2.5s (Good)
   - FID < 100ms (Good)
   - CLS < 0.1 (Good)

### Lighthouse Audit

Run Lighthouse audit:
```bash
npm run lighthouse
```

Target scores:
- Performance: > 90
- Accessibility: > 95
- Best Practices: > 95
- SEO: > 95

## Troubleshooting

### Meta Tags Not Updating

**Problem**: Vietnamese meta tags don't update on route change

**Solutions**:
1. Check VietnameseSeoService is initialized
2. Verify configuration loaded successfully
3. Check browser console for errors
4. Clear browser cache
5. Verify route has Vietnamese SEO data

### Cốc Cốc Not Detecting

**Problem**: Cốc Cốc browser not detected

**Solutions**:
1. Verify using actual Cốc Cốc browser
2. Check user agent string
3. Look for console logs
4. Verify browser detection logic

### Zalo Preview Not Showing

**Problem**: Link preview doesn't appear in Zalo

**Solutions**:
1. Wait 24 hours for Zalo to cache
2. Check og:image URL is accessible
3. Verify image dimensions (1200x630)
4. Check Vietnamese text encoding
5. Test with different URLs

### Structured Data Errors

**Problem**: Google Rich Results Test shows errors

**Solutions**:
1. Validate JSON-LD syntax
2. Check required properties present
3. Verify Vietnamese properties
4. Test with Schema.org validator
5. Check for duplicate schemas

## Test Report Template

```markdown
# Vietnamese SEO Test Report

**Date**: [Date]
**Tester**: [Name]
**Environment**: [Staging/Production]

## Test Results Summary

- Total Tests: 10
- Passed: [X]
- Failed: [X]
- Not Tested: [X]

## Detailed Results

### 1. Meta Tags Update
- Status: [Pass/Fail]
- Notes: [Any issues or observations]

### 2. Exercise Page Meta Tags
- Status: [Pass/Fail]
- Notes: [Any issues or observations]

[Continue for all tests...]

## Issues Found

1. [Issue description]
   - Severity: [High/Medium/Low]
   - Steps to reproduce: [Steps]
   - Expected: [Expected behavior]
   - Actual: [Actual behavior]

## Recommendations

1. [Recommendation 1]
2. [Recommendation 2]

## Sign-off

Tested by: [Name]
Date: [Date]
Approved by: [Name]
```

## Continuous Testing

### Daily Checks
- Verify sitemap accessible
- Check Google Search Console for errors
- Monitor Cốc Cốc Webmaster Tools

### Weekly Checks
- Run Lighthouse audit
- Check Vietnamese keyword rankings
- Review analytics data

### Monthly Checks
- Full integration test suite
- Performance benchmarking
- Competitor analysis

## Contact

For testing issues or questions:
- Email: phuochnsw@gmail.com
- Review documentation: `/docs/VIETNAMESE-SEO-GUIDE.md`
- Check troubleshooting: `/docs/VIETNAMESE-SEO-CONFIGURATION.md`
