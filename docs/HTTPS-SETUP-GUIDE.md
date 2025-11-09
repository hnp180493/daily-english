# HTTPS Setup Guide - Daily English

## ✅ Tin Tốt: GitHub Pages Hỗ Trợ HTTPS Miễn Phí!

GitHub Pages tự động cung cấp HTTPS cho custom domains thông qua **Let's Encrypt** SSL certificate.

---

## 🔒 Bước 1: Enable HTTPS trên GitHub Pages

### 1.1 Vào Repository Settings
1. Mở repository: https://github.com/YOUR_USERNAME/daily-english
2. Click tab **"Settings"**
3. Scroll xuống section **"Pages"** (bên trái sidebar)

### 1.2 Check Custom Domain
- Trong "Custom domain", bạn sẽ thấy: `dailyenglish.qzz.io`
- Status phải là: ✅ **"DNS check successful"**

### 1.3 Enable HTTPS
- Tìm checkbox: **"Enforce HTTPS"**
- ✅ **Check vào box này**
- Nếu checkbox bị disabled (xám), đợi vài phút để GitHub provision SSL certificate

### 1.4 Đợi SSL Certificate
- GitHub sẽ tự động request SSL certificate từ Let's Encrypt
- Thời gian: **5-30 phút**
- Sau khi xong, checkbox "Enforce HTTPS" sẽ enable

---

## 🔐 Bước 2: Add GitHub Secrets cho SEO Verification

Sau khi có verification codes từ Google & Bing, thêm vào GitHub Secrets:

### 2.1 Vào Secrets Settings
1. Mở repository settings
2. Click **"Secrets and variables"** → **"Actions"** (bên trái)
3. Click **"New repository secret"**

### 2.2 Add Google Verification Secret
- **Name**: `GOOGLE_SITE_VERIFICATION`
- **Secret**: Paste code từ Google Search Console (ví dụ: `ABC123XYZ...`)
- Click **"Add secret"**

### 2.3 Add Bing Verification Secret
- **Name**: `BING_WEBMASTER_VERIFICATION`
- **Secret**: Paste code từ Bing Webmaster (ví dụ: `DEF456UVW...`)
- Click **"Add secret"**

### 2.4 Verify Secrets
Sau khi add, bạn sẽ thấy trong danh sách:
```
SUPABASE_URL
SUPABASE_ANON_KEY
GOOGLE_SITE_VERIFICATION      ← New
BING_WEBMASTER_VERIFICATION   ← New
```

---

## 🚀 Bước 3: Deploy với HTTPS

### 3.1 Commit Changes
```bash
git add .
git commit -m "Update to HTTPS URLs and add SEO verification"
git push origin main
```

### 3.2 Wait for Deployment
- GitHub Actions sẽ tự động build và deploy
- Xem progress: Tab "Actions" trong repository
- Thời gian: 2-5 phút

### 3.3 Verify HTTPS Works
1. Mở: https://dailyenglish.qzz.io/ (với HTTPS)
2. Check browser address bar có icon 🔒 (padlock)
3. Click vào icon → Xem certificate details
4. Certificate phải được issued bởi "Let's Encrypt"

---

## ✅ Bước 4: Test Redirects

### 4.1 Test HTTP → HTTPS Redirect
```bash
# Mở HTTP URL (không có S)
http://dailyenglish.qzz.io/

# Phải tự động redirect sang:
https://dailyenglish.qzz.io/
```

### 4.2 Test trong Browser
1. Mở browser
2. Gõ: `dailyenglish.qzz.io` (không có http/https)
3. Browser sẽ tự động dùng HTTPS
4. Check address bar có 🔒

---

## 🔍 Bước 5: Verify SEO Implementation

### 5.1 Check Meta Tags
```bash
# View page source
curl https://dailyenglish.qzz.io/ | grep "verification"

# Phải thấy:
# <meta name="google-site-verification" content="ABC123...">
# <meta name="msvalidate.01" content="DEF456...">
```

### 5.2 Check Sitemap
```bash
# Mở trong browser
https://dailyenglish.qzz.io/sitemap.xml

# Tất cả URLs phải là HTTPS
```

### 5.3 Check Robots.txt
```bash
# Mở trong browser
https://dailyenglish.qzz.io/robots.txt

# Sitemap URL phải là HTTPS
```

---

## 📊 Bước 6: Update Search Console

### 6.1 Google Search Console
1. Vào: https://search.google.com/search-console
2. **Add new property** với HTTPS URL:
   ```
   https://dailyenglish.qzz.io
   ```
3. Verify ownership (dùng HTML tag method)
4. Submit sitemap: `https://dailyenglish.qzz.io/sitemap.xml`

**Lưu ý**: Nếu đã có property với HTTP, nên tạo property mới với HTTPS. Google coi HTTP và HTTPS là 2 sites khác nhau.

### 6.2 Bing Webmaster Tools
1. Vào: https://www.bing.com/webmasters
2. Add site với HTTPS URL:
   ```
   https://dailyenglish.qzz.io
   ```
3. Verify ownership
4. Submit sitemap: `https://dailyenglish.qzz.io/sitemap.xml`

---

## 🎯 Checklist Hoàn Chỉnh

### GitHub Pages HTTPS:
- [ ] Custom domain configured: `dailyenglish.qzz.io`
- [ ] DNS check successful
- [ ] "Enforce HTTPS" checkbox enabled
- [ ] SSL certificate provisioned (Let's Encrypt)
- [ ] HTTPS works: https://dailyenglish.qzz.io/
- [ ] HTTP redirects to HTTPS automatically

### GitHub Secrets:
- [ ] `GOOGLE_SITE_VERIFICATION` added
- [ ] `BING_WEBMASTER_VERIFICATION` added
- [ ] Secrets visible in Settings → Secrets and variables → Actions

### Code Updates:
- [ ] `seo.service.ts` uses HTTPS BASE_URL
- [ ] `index.html` canonical URL is HTTPS
- [ ] `sitemap.xml` all URLs are HTTPS
- [ ] `robots.txt` sitemap URL is HTTPS
- [ ] `.github/workflows/deploy.yml` includes SEO secrets

### Deployment:
- [ ] Code committed and pushed
- [ ] GitHub Actions deployment successful
- [ ] Website accessible via HTTPS
- [ ] Verification meta tags present in HTML
- [ ] Sitemap accessible via HTTPS
- [ ] Robots.txt accessible via HTTPS

### Search Engines:
- [ ] Google Search Console property created (HTTPS)
- [ ] Google ownership verified
- [ ] Google sitemap submitted
- [ ] Bing Webmaster site added (HTTPS)
- [ ] Bing ownership verified
- [ ] Bing sitemap submitted

---

## ❓ Troubleshooting

### "Enforce HTTPS" Checkbox Disabled

**Nguyên nhân:**
- SSL certificate chưa được provision
- DNS configuration chưa đúng

**Giải pháp:**
1. Đợi 10-30 phút
2. Check DNS settings:
   ```bash
   nslookup dailyenglish.qzz.io
   ```
3. Ensure CNAME points to: `YOUR_USERNAME.github.io`
4. Clear GitHub Pages cache:
   - Uncheck "Enforce HTTPS"
   - Remove custom domain
   - Save
   - Add custom domain lại
   - Wait for DNS check
   - Enable "Enforce HTTPS"

### HTTPS Not Working (Certificate Error)

**Nguyên nhân:**
- SSL certificate chưa được issued
- Browser cache

**Giải pháp:**
```bash
# 1. Clear browser cache
Ctrl + Shift + Delete (Windows)
Cmd + Shift + Delete (Mac)

# 2. Try incognito/private mode

# 3. Check certificate status
openssl s_client -connect dailyenglish.qzz.io:443 -servername dailyenglish.qzz.io

# 4. Wait 24 hours for DNS propagation
```

### Verification Codes Not Showing

**Nguyên nhân:**
- GitHub Secrets chưa được add
- Deployment chưa chạy sau khi add secrets

**Giải pháp:**
```bash
# 1. Check secrets exist
# Settings → Secrets and variables → Actions

# 2. Trigger new deployment
git commit --allow-empty -m "Trigger deployment"
git push

# 3. Check deployment logs
# Tab "Actions" → Latest workflow → View logs

# 4. Verify in HTML
curl https://dailyenglish.qzz.io/ | grep "google-site-verification"
```

### Mixed Content Warnings

**Nguyên nhân:**
- Some resources loaded via HTTP instead of HTTPS

**Giải pháp:**
```typescript
// Check all external resources use HTTPS:
// - API calls
// - Images
// - Scripts
// - Stylesheets

// Example fix:
// ❌ http://example.com/api
// ✅ https://example.com/api
```

---

## 🔐 Security Best Practices

### 1. Always Use HTTPS
```typescript
// In code, always use HTTPS URLs
const API_URL = 'https://api.example.com'; // ✅
const API_URL = 'http://api.example.com';  // ❌
```

### 2. Set Secure Headers
GitHub Pages automatically sets:
- `Strict-Transport-Security` (HSTS)
- `X-Frame-Options`
- `X-Content-Type-Options`

### 3. Update External Links
```html
<!-- Update all external links to HTTPS -->
<a href="https://example.com">Link</a>  ✅
<a href="http://example.com">Link</a>   ❌
```

### 4. Check Third-Party Resources
```html
<!-- Ensure all CDN resources use HTTPS -->
<script src="https://cdn.example.com/script.js"></script>  ✅
<script src="http://cdn.example.com/script.js"></script>   ❌
```

---

## 📈 Benefits of HTTPS

### SEO Benefits:
✅ **Google ranking boost** - HTTPS is a ranking signal
✅ **Better indexing** - Google prefers HTTPS sites
✅ **Referrer data** - Full referrer data preserved
✅ **Trust signals** - Green padlock in browser

### Security Benefits:
✅ **Data encryption** - User data protected in transit
✅ **Authentication** - Verify site identity
✅ **Data integrity** - Prevent tampering
✅ **Modern features** - Required for PWA, Service Workers, etc.

### User Trust:
✅ **Professional appearance** - 🔒 padlock icon
✅ **No warnings** - No "Not Secure" warnings
✅ **Compliance** - Meet security standards
✅ **Privacy** - Protect user privacy

---

## 🎉 After HTTPS Setup

Your website now has:
- ✅ Secure HTTPS connection
- ✅ Free SSL certificate (auto-renewed)
- ✅ SEO verification codes
- ✅ Proper sitemap with HTTPS URLs
- ✅ Ready for search engine indexing

**Next steps:**
1. Submit sitemap to Google & Bing
2. Monitor Search Console for indexing
3. Check for any mixed content warnings
4. Update any external links to HTTPS

---

## 📞 Support Resources

- **GitHub Pages HTTPS**: https://docs.github.com/en/pages/getting-started-with-github-pages/securing-your-github-pages-site-with-https
- **Let's Encrypt**: https://letsencrypt.org/
- **SSL Labs Test**: https://www.ssllabs.com/ssltest/
- **Security Headers**: https://securityheaders.com/

Good luck! 🚀🔒
