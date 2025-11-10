# Vietnamese SEO Guide for Daily English

## Table of Contents

1. [Overview](#overview)
2. [Vietnamese Keyword Strategy](#vietnamese-keyword-strategy)
3. [Cốc Cốc Optimization](#cốc-cốc-optimization)
4. [Zalo Sharing Optimization](#zalo-sharing-optimization)
5. [Vietnamese Meta Tags](#vietnamese-meta-tags)
6. [Structured Data](#structured-data)
7. [Mobile Optimization](#mobile-optimization)
8. [Monitoring and Analytics](#monitoring-and-analytics)
9. [Best Practices](#best-practices)
10. [Troubleshooting](#troubleshooting)

## Overview

This guide provides comprehensive information on implementing and maintaining Vietnamese SEO for Daily English. The Vietnamese market has unique characteristics that require specialized optimization strategies.

### Key Vietnamese Search Engines

1. **Google.vn** - Dominant search engine (~70% market share)
2. **Cốc Cốc** - Vietnamese search engine (~20% market share)
3. **Bing Vietnam** - Growing presence (~5% market share)

### Key Social Platforms

1. **Zalo** - #1 messaging app in Vietnam
2. **Facebook Vietnam** - Most popular social network
3. **TikTok Vietnam** - Growing video platform

## Vietnamese Keyword Strategy

### Primary Keywords (High Volume)

These keywords have the highest search volume and should be prioritized:

- **học tiếng anh** (learn English) - 100K+ monthly searches
- **học tiếng anh online** (learn English online) - 50K+ monthly searches
- **bài tập tiếng anh** (English exercises) - 40K+ monthly searches
- **luyện dịch tiếng anh** (practice English translation) - 20K+ monthly searches
- **học tiếng anh miễn phí** (learn English free) - 30K+ monthly searches

### Secondary Keywords (Medium Volume)

Support primary keywords with these terms:

- **học tiếng anh với AI** (learn English with AI)
- **phản hồi AI tiếng anh** (AI feedback English)
- **luyện nghe tiếng anh** (practice English listening)
- **luyện nói tiếng anh** (practice English speaking)
- **học từ vựng tiếng anh** (learn English vocabulary)

### Long-Tail Keywords (Low Competition)

Target specific user intents:

- **học tiếng anh giao tiếp cơ bản** (learn basic English conversation)
- **bài tập dịch tiếng anh có đáp án** (English translation exercises with answers)
- **học tiếng anh online miễn phí hiệu quả** (effective free online English learning)
- **ứng dụng học tiếng anh tốt nhất** (best English learning app)
- **website học tiếng anh cho người mới bắt đầu** (English learning website for beginners)

### Keyword Research Tools

1. **Google Keyword Planner** - https://ads.google.com/intl/vi_vn/home/tools/keyword-planner/
2. **Ahrefs** - Vietnamese keyword data
3. **SEMrush** - Vietnam-specific analysis
4. **Cốc Cốc Keyword Tool** - Native Vietnamese data

### Implementing Keywords

Keywords are configured in `src/assets/vietnamese-seo-config.json`:

```json
{
  "keywords": {
    "primary": ["học tiếng anh", "..."],
    "secondary": ["học tiếng anh với AI", "..."],
    "longTail": ["học tiếng anh giao tiếp cơ bản", "..."]
  }
}
```

## Cốc Cốc Optimization

### What is Cốc Cốc?

Cốc Cốc is Vietnam's homegrown browser and search engine, optimized for Vietnamese users with features like:
- Vietnamese language processing
- Local content prioritization
- Vietnamese character support
- Vietnam-specific search results

### Setting Up Cốc Cốc

1. **Register at Cốc Cốc Webmaster Tools**
   - URL: https://webmaster.coccoc.com/
   - Create account with email or phone

2. **Add Your Website**
   - Submit: https://dailyenglish.qzz.io
   - Choose verification method: Meta tag

3. **Verify Ownership**
   - Add verification code to environment configuration
   - Deploy changes
   - Click verify in Cốc Cốc dashboard

4. **Submit Sitemap**
   - Submit: https://dailyenglish.qzz.io/sitemap-vi.xml
   - Wait for indexing (24-48 hours)

### Cốc Cốc-Specific Meta Tags

The application automatically adds Cốc Cốc meta tags:

```html
<meta name="coccoc:title" content="Vietnamese Title">
<meta name="coccoc:description" content="Vietnamese Description">
<meta name="coccoc:keywords" content="keyword1, keyword2">
```

### Cốc Cốc Best Practices

1. **Prioritize Vietnamese Content**
   - Use natural Vietnamese language
   - Include Vietnamese diacritics
   - Avoid direct English translations

2. **Optimize for Vietnamese Users**
   - Use Vietnamese date formats
   - Include Vietnamese currency (VND)
   - Reference Vietnamese locations

3. **Mobile-First**
   - Cốc Cốc users are primarily mobile
   - Optimize for 3G/4G networks
   - Test on Cốc Cốc mobile browser

## Zalo Sharing Optimization

### What is Zalo?

Zalo is Vietnam's #1 messaging app with 100M+ users. Optimizing for Zalo sharing increases viral potential.

### Zalo Meta Tags

The application sets Zalo-specific tags:

```html
<meta name="zalo:title" content="Vietnamese Title">
<meta name="zalo:description" content="Vietnamese Description">
<meta name="zalo:image" content="https://dailyenglish.qzz.io/og-image-vi.png">
```

### Zalo Image Requirements

- **Dimensions**: 1200x630 pixels (exactly)
- **Format**: PNG or JPG
- **Size**: < 300KB
- **Content**: Vietnamese text, clear at small sizes
- **Colors**: High contrast for mobile viewing

### Testing Zalo Sharing

1. **Share Link in Zalo**
   - Open Zalo app
   - Share link in chat
   - Verify preview appears

2. **Check Preview**
   - Image displays correctly
   - Vietnamese text is readable
   - Title and description are complete

3. **Test on Mobile**
   - iOS Zalo app
   - Android Zalo app
   - Zalo web version

## Vietnamese Meta Tags

### Title Tags

Format: `{Content} - {Category} - Daily English`

Examples:
- `Bài tập dịch câu - Sơ cấp - Daily English`
- `Học từ vựng tiếng Anh - Trung cấp - Daily English`

Best practices:
- Keep under 60 characters
- Include primary keyword
- Use natural Vietnamese
- Add brand name

### Meta Descriptions

Format: Engaging description with keywords and call-to-action

Examples:
- `Luyện tập dịch câu tiếng Anh cấp độ sơ cấp với phản hồi AI chi tiết. Miễn phí và hiệu quả.`

Best practices:
- 150-160 characters
- Include 1-2 keywords naturally
- Add call-to-action
- Use Vietnamese diacritics
- Avoid keyword stuffing

### Keywords Meta Tag

Format: Comma-separated Vietnamese keywords

Example:
```html
<meta name="keywords" content="học tiếng anh, bài tập dịch, AI feedback, học online">
```

## Structured Data

### FAQ Schema (Vietnamese)

```json
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [{
    "@type": "Question",
    "name": "Làm thế nào để bắt đầu?",
    "acceptedAnswer": {
      "@type": "Answer",
      "text": "Đăng nhập và chọn bài tập phù hợp với trình độ của bạn."
    }
  }]
}
```

### Breadcrumb Schema (Vietnamese)

```json
{
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [{
    "@type": "ListItem",
    "position": 1,
    "name": "Trang chủ",
    "item": "https://dailyenglish.qzz.io/"
  }]
}
```

### Course Schema (Vietnamese)

```json
{
  "@context": "https://schema.org",
  "@type": "Course",
  "name": "Bài tập tiếng Anh sơ cấp",
  "description": "Khóa học tiếng Anh cho người mới bắt đầu",
  "provider": {
    "@type": "Organization",
    "name": "Daily English"
  },
  "inLanguage": "vi"
}
```

## Mobile Optimization

### Vietnamese Mobile Users

- 70%+ of Vietnamese users access via mobile
- Primary networks: 3G/4G (5G growing)
- Popular devices: Mid-range Android phones
- Screen sizes: 5-6.5 inches

### Optimization Strategies

1. **Font Optimization**
   - Use Vietnamese-friendly fonts (Inter, Roboto)
   - Implement font-display: swap
   - Subset fonts for Vietnamese characters only

2. **Image Optimization**
   - Compress images < 100KB
   - Use WebP format with fallbacks
   - Implement lazy loading
   - Optimize for 3G networks

3. **Performance**
   - Target < 3s load time on 3G
   - Minimize JavaScript bundles
   - Use service workers for caching
   - Implement critical CSS

4. **Vietnamese Character Support**
   - Test all diacritics display correctly
   - Ensure proper font rendering
   - Check on various devices

## Monitoring and Analytics

### Google Search Console (Vietnam)

Monitor:
- Vietnamese keyword rankings
- Click-through rates from Google.vn
- Impressions and clicks
- Mobile usability issues

### Cốc Cốc Webmaster Tools

Track:
- Cốc Cốc search performance
- Indexing status
- Vietnamese keyword rankings
- Crawl errors

### Built-in Analytics

Use VietnameseSeoService methods:

```typescript
// Get keyword performance
const performance = vietnameseSeoService.getVietnameseKeywordPerformance();

// Track search queries
vietnameseSeoService.trackVietnameseSearchQuery('học tiếng anh', 'google');

// Get engagement metrics
const engagement = vietnameseSeoService.getVietnameseUserEngagement();

// Track social referrals
vietnameseSeoService.trackSocialMediaReferral('zalo', '/exercises');
```

### Key Metrics to Monitor

1. **Search Performance**
   - Vietnamese keyword rankings
   - Organic traffic from Vietnam
   - Click-through rates
   - Bounce rates

2. **User Engagement**
   - Time on site
   - Pages per session
   - Conversion rates
   - Return visitor rate

3. **Technical Performance**
   - Core Web Vitals
   - Mobile page speed
   - Server response time
   - Error rates

## Best Practices

### Content Best Practices

1. **Use Natural Vietnamese**
   - Write for Vietnamese speakers
   - Avoid direct translations
   - Use local idioms and expressions
   - Include Vietnamese examples

2. **Include Diacritics**
   - Always use proper Vietnamese diacritics
   - Test rendering on all devices
   - Validate in meta tags

3. **Localize Content**
   - Use Vietnamese date formats (dd/mm/yyyy)
   - Reference Vietnamese holidays
   - Include Vietnamese cultural context

### Technical Best Practices

1. **Mobile-First**
   - Design for mobile screens first
   - Test on Vietnamese mobile networks
   - Optimize for touch interactions

2. **Performance**
   - Minimize page weight
   - Optimize images
   - Use CDN for Vietnamese users
   - Implement caching

3. **Accessibility**
   - Support Vietnamese screen readers
   - Ensure keyboard navigation
   - Maintain color contrast

### SEO Best Practices

1. **Regular Updates**
   - Update Vietnamese keywords quarterly
   - Refresh content regularly
   - Add new Vietnamese pages

2. **Link Building**
   - Get backlinks from Vietnamese sites
   - Partner with Vietnamese educators
   - Guest post on Vietnamese blogs

3. **Social Signals**
   - Encourage Zalo sharing
   - Engage on Facebook Vietnam
   - Create shareable Vietnamese content

## Troubleshooting

### Common Issues

#### Vietnamese Characters Not Displaying

**Symptoms**: Diacritics appear as boxes or question marks

**Solutions**:
- Check UTF-8 encoding in HTML
- Verify font supports Vietnamese
- Test on multiple browsers
- Check meta charset tag

#### Cốc Cốc Not Indexing

**Symptoms**: Pages not appearing in Cốc Cốc search

**Solutions**:
- Verify ownership in Cốc Cốc Webmaster
- Submit sitemap-vi.xml
- Check robots.txt allows Cốc Cốc
- Wait 48-72 hours for indexing

#### Zalo Preview Not Showing

**Symptoms**: No preview when sharing on Zalo

**Solutions**:
- Verify og:image URL is accessible
- Check image dimensions (1200x630)
- Ensure Vietnamese text in meta tags
- Test with different links

#### Low Vietnamese Traffic

**Symptoms**: Few visitors from Vietnamese search engines

**Solutions**:
- Review Vietnamese keyword strategy
- Improve content quality
- Build Vietnamese backlinks
- Optimize for mobile
- Check Core Web Vitals

### Getting Help

1. **Documentation**
   - Review this guide
   - Check configuration documentation
   - Read Angular SEO best practices

2. **Community**
   - Vietnamese SEO forums
   - Cốc Cốc support
   - Google Search Central

3. **Tools**
   - Google Search Console
   - Cốc Cốc Webmaster Tools
   - PageSpeed Insights
   - Mobile-Friendly Test

## Resources

### Vietnamese SEO Tools

- **Google Keyword Planner (Vietnam)**: https://ads.google.com/intl/vi_vn/
- **Cốc Cốc Webmaster**: https://webmaster.coccoc.com/
- **Zalo Developers**: https://developers.zalo.me/
- **Google Search Console**: https://search.google.com/search-console

### Learning Resources

- **Vietnamese SEO Blog**: https://seovietnamese.com/
- **Cốc Cốc SEO Guide**: https://webmaster.coccoc.com/guide
- **Google SEO Starter Guide (Vietnamese)**: https://developers.google.com/search/docs/beginner/seo-starter-guide?hl=vi

### Testing Tools

- **Google Mobile-Friendly Test**: https://search.google.com/test/mobile-friendly
- **PageSpeed Insights**: https://pagespeed.web.dev/
- **Rich Results Test**: https://search.google.com/test/rich-results
- **Facebook Sharing Debugger**: https://developers.facebook.com/tools/debug/

## Conclusion

Vietnamese SEO requires understanding the unique characteristics of the Vietnamese market, including local search engines (Cốc Cốc), social platforms (Zalo), and user behavior. By following this guide and implementing the strategies outlined, Daily English can achieve strong visibility in Vietnamese search results and provide an optimized experience for Vietnamese learners.

Remember to:
- Keep Vietnamese keywords updated
- Monitor performance regularly
- Test on Vietnamese networks
- Engage with Vietnamese users
- Continuously improve content quality

For questions or support, refer to the troubleshooting section or contact the development team.
