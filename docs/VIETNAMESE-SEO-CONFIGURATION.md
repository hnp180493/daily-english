# Vietnamese SEO Configuration Guide

## Overview

This guide explains how to configure Vietnamese SEO features for Daily English, including Cốc Cốc verification, Zalo integration, and Vietnamese keyword optimization.

## Environment Configuration

### Development Environment (`src/environments/environment.ts`)

```typescript
seo: {
  googleSiteVerification: 'YOUR_GOOGLE_CODE',
  bingWebmasterVerification: 'YOUR_BING_CODE',
  cocCocVerification: 'YOUR_COCCOC_CODE',
  vietnameseKeywordsEnabled: true,
  zaloAppId: 'YOUR_ZALO_APP_ID',
}
```

### Production Environment (`src/environments/environment.prod.ts`)

Same structure as development, but with production values.

## Cốc Cốc Verification

### What is Cốc Cốc?

Cốc Cốc is a popular Vietnamese web browser and search engine with significant market share in Vietnam.

### How to Obtain Cốc Cốc Verification Code

1. **Visit Cốc Cốc Webmaster Tools**
   - Go to: https://webmaster.coccoc.com/
   - Sign in or create an account

2. **Add Your Website**
   - Click "Add Website" or "Thêm website"
   - Enter your website URL: `https://dailyenglish.qzz.io`

3. **Choose Verification Method**
   - Select "Meta Tag" verification method
   - Copy the verification code from the meta tag
   - Example: `<meta name="coccoc-verification" content="YOUR_CODE_HERE" />`

4. **Add Code to Environment**
   - Copy the content value (YOUR_CODE_HERE)
   - Add it to `cocCocVerification` in environment files

5. **Verify**
   - Deploy your changes
   - Return to Cốc Cốc Webmaster Tools
   - Click "Verify" button

### Benefits of Cốc Cốc Verification

- Improved visibility in Cốc Cốc search results
- Access to Cốc Cốc search analytics
- Better indexing of Vietnamese content
- Cốc Cốc-specific SEO recommendations

## Zalo Integration

### What is Zalo?

Zalo is Vietnam's most popular messaging app, similar to WhatsApp or WeChat.

### How to Obtain Zalo App ID

1. **Visit Zalo Developers**
   - Go to: https://developers.zalo.me/
   - Sign in with your Zalo account

2. **Create an Application**
   - Click "Create App" or "Tạo ứng dụng"
   - Fill in application details:
     - App Name: Daily English
     - Category: Education
     - Description: English learning platform

3. **Get App ID**
   - After creation, find your App ID in the dashboard
   - Copy the App ID

4. **Add to Environment**
   - Add the App ID to `zaloAppId` in environment files

5. **Configure Sharing**
   - Set up OAuth redirect URLs if needed
   - Configure sharing permissions

### Benefits of Zalo Integration

- Optimized link previews when sharing on Zalo
- Better engagement with Vietnamese users
- Zalo-specific meta tags for improved sharing
- Analytics on Zalo referral traffic

## Vietnamese Keywords Configuration

### Enabling Vietnamese Keywords

Set `vietnameseKeywordsEnabled: true` in environment configuration.

### How It Works

When enabled, the application will:
- Load Vietnamese keyword configuration from `vietnamese-seo-config.json`
- Generate Vietnamese meta tags automatically
- Optimize content for Vietnamese search engines
- Track Vietnamese keyword performance

### Customizing Keywords

Edit `src/assets/vietnamese-seo-config.json` to customize:
- Primary keywords (high volume)
- Secondary keywords (medium volume)
- Long-tail keywords (low competition)
- Category-specific keywords
- Level-specific keywords

## Verification Checklist

After configuration, verify the following:

### Cốc Cốc Verification
- [ ] Verification code added to environment
- [ ] Application deployed
- [ ] Verification successful in Cốc Cốc Webmaster Tools
- [ ] Sitemap submitted to Cốc Cốc
- [ ] Vietnamese pages indexed

### Zalo Integration
- [ ] App ID added to environment
- [ ] Test link sharing in Zalo app
- [ ] Verify preview image displays correctly
- [ ] Verify Vietnamese text displays correctly
- [ ] Check mobile preview

### Vietnamese Keywords
- [ ] Keywords enabled in environment
- [ ] Configuration file loaded successfully
- [ ] Vietnamese meta tags generated
- [ ] Test search with Vietnamese keywords
- [ ] Monitor keyword performance

## Testing

### Test Cốc Cốc Optimization

1. Open your site in Cốc Cốc browser
2. Check browser console for Cốc Cốc detection logs
3. Verify Cốc Cốc-specific meta tags in page source
4. Test search functionality

### Test Zalo Sharing

1. Share a link in Zalo chat
2. Verify preview image appears
3. Check Vietnamese title and description
4. Test on both mobile and desktop Zalo

### Test Vietnamese Keywords

1. Search for Vietnamese keywords on Google.vn
2. Check if your pages appear in results
3. Verify Vietnamese meta descriptions
4. Test rich snippets display

## Troubleshooting

### Cốc Cốc Verification Fails

**Problem**: Verification code not detected

**Solutions**:
- Ensure code is in environment file
- Check application is deployed
- Verify meta tag is in HTML head
- Wait 24-48 hours for indexing
- Clear Cốc Cốc cache

### Zalo Preview Not Showing

**Problem**: Link preview doesn't appear in Zalo

**Solutions**:
- Verify Zalo App ID is correct
- Check og:image URL is accessible
- Ensure image is 1200x630 pixels
- Test with Zalo's link debugger (if available)
- Check Vietnamese characters display correctly

### Vietnamese Keywords Not Working

**Problem**: Vietnamese meta tags not generated

**Solutions**:
- Verify `vietnameseKeywordsEnabled` is true
- Check configuration file exists and is valid JSON
- Look for errors in browser console
- Verify VietnameseSeoService is initialized
- Check route has Vietnamese SEO data

## Monitoring

### Cốc Cốc Analytics

Monitor in Cốc Cốc Webmaster Tools:
- Search impressions
- Click-through rates
- Top Vietnamese keywords
- Indexing status

### Zalo Referrals

Track in application analytics:
- Zalo referral traffic
- Engagement from Zalo users
- Popular shared pages
- Conversion rates

### Vietnamese Keywords

Monitor using built-in tracking:
```typescript
// Get keyword performance
const performance = vietnameseSeoService.getVietnameseKeywordPerformance();

// Get user engagement
const engagement = vietnameseSeoService.getVietnameseUserEngagement();

// Track search engine traffic
const traffic = vietnameseSeoService.trackSearchEngineTraffic();
```

## Best Practices

1. **Keep Keywords Updated**
   - Review Vietnamese keywords quarterly
   - Add trending Vietnamese search terms
   - Remove underperforming keywords

2. **Monitor Cốc Cốc Performance**
   - Check Cốc Cốc Webmaster Tools weekly
   - Respond to indexing issues promptly
   - Submit new content to Cốc Cốc

3. **Optimize for Zalo**
   - Use Vietnamese-friendly images
   - Keep descriptions concise
   - Test sharing regularly

4. **Test on Vietnamese Networks**
   - Test on 3G/4G Vietnamese networks
   - Optimize for mobile users
   - Monitor Core Web Vitals

## Support

For issues or questions:
- Check browser console for error messages
- Review application logs
- Test in incognito/private mode
- Contact Cốc Cốc support: https://webmaster.coccoc.com/support
- Contact Zalo developers: https://developers.zalo.me/support
