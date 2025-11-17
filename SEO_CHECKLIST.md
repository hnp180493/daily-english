# SEO Checklist - Daily English

## ✅ Đã hoàn thành

### 1. Meta Tags & Structured Data
- ✅ Thêm meta description chi tiết với keywords
- ✅ Thêm Open Graph tags (Facebook, LinkedIn)
- ✅ Thêm Twitter Card tags
- ✅ Thêm JSON-LD structured data (WebSite, EducationalOrganization, WebApplication)
- ✅ Thêm robots meta tags
- ✅ Thêm hreflang tags

### 2. Sitemap
- ✅ Cập nhật sitemap.xml với lastmod mới (2025-11-17)
- ✅ Cập nhật sitemap-vi.xml với tất cả routes
- ✅ Thêm các trang mới vào sitemap (dashboard, favorites, achievements, review-queue, error-patterns, learning-path)

### 3. Robots.txt
- ✅ Đã có robots.txt cho phép Google crawl
- ✅ Đã link đến sitemap trong robots.txt

### 4. Verification
- ✅ Google Search Console verification meta tag
- ✅ Bing Webmaster Tools verification meta tag
- ✅ Tạo BingSiteAuth.xml

## 📋 Cần làm thêm (Manual Steps)

### 1. Submit to Search Engines
**Google Search Console:**
1. Truy cập: https://search.google.com/search-console
2. Thêm property: `dailyenglish.qzz.io`
3. Verify bằng meta tag (đã có trong index.html)
4. Submit sitemap: `https://dailyenglish.qzz.io/sitemap.xml`
5. Submit sitemap tiếng Việt: `https://dailyenglish.qzz.io/sitemap-vi.xml`
6. Request indexing cho các trang chính:
   - https://dailyenglish.qzz.io/
   - https://dailyenglish.qzz.io/home
   - https://dailyenglish.qzz.io/exercises
   - https://dailyenglish.qzz.io/guide

**Bing Webmaster Tools:**
1. Truy cập: https://www.bing.com/webmasters
2. Thêm site: `dailyenglish.qzz.io`
3. Verify bằng meta tag (đã có)
4. Submit sitemap

**Cốc Cốc:**
1. Truy cập: https://webmaster.coccoc.com/
2. Đăng ký và verify website
3. Submit sitemap

### 2. Build & Deploy
```bash
# Build production
npm run build

# Deploy lên GitHub Pages
# (Copy nội dung từ dist/daily-english/browser/ lên branch gh-pages)
```

### 3. Kiểm tra sau khi deploy
- [ ] Test với Google Rich Results Test: https://search.google.com/test/rich-results
- [ ] Test với Google Mobile-Friendly Test: https://search.google.com/test/mobile-friendly
- [ ] Test với PageSpeed Insights: https://pagespeed.web.dev/
- [ ] Kiểm tra sitemap: https://dailyenglish.qzz.io/sitemap.xml
- [ ] Kiểm tra robots.txt: https://dailyenglish.qzz.io/robots.txt

### 4. Tối ưu hóa thêm (Optional)
- [ ] Tạo blog/content marketing để có backlinks
- [ ] Thêm FAQ schema cho các trang chính
- [ ] Tạo breadcrumb schema
- [ ] Thêm video tutorials (nếu có)
- [ ] Tối ưu hóa Core Web Vitals

## 🔍 Lý do Google chưa index

### Vấn đề chính: Client-Side Rendering (CSR)
Angular render hoàn toàn ở client-side, Google bot có thể không thấy nội dung ngay lập tức.

### Giải pháp đã áp dụng:
1. **Structured Data**: Thêm JSON-LD để Google hiểu rõ nội dung
2. **Meta Tags**: Cải thiện meta description, keywords, OG tags
3. **Sitemap**: Cập nhật và submit sitemap mới
4. **Robots.txt**: Đảm bảo Google có thể crawl

### Thời gian chờ đợi:
- Google thường mất **3-7 ngày** để index trang mới
- Có thể mất **2-4 tuần** để xuất hiện trong kết quả tìm kiếm
- Sử dụng "Request Indexing" trong Google Search Console để tăng tốc

## 📊 Theo dõi tiến độ

### Tools để kiểm tra:
1. **Google Search Console**: Xem coverage, performance
2. **site:dailyenglish.qzz.io** trên Google: Xem các trang đã được index
3. **Google Analytics**: Theo dõi organic traffic

### Metrics quan trọng:
- Pages indexed
- Click-through rate (CTR)
- Average position
- Impressions
- Organic traffic

## 🚀 Next Steps

1. **Ngay bây giờ**: Build và deploy code mới
2. **Sau khi deploy**: Submit sitemap lên Google Search Console
3. **Sau 24h**: Request indexing cho các trang chính
4. **Sau 1 tuần**: Kiểm tra lại với `site:dailyenglish.qzz.io`
5. **Sau 2 tuần**: Phân tích performance trong Search Console

## 💡 Tips

- Tạo nội dung chất lượng và cập nhật thường xuyên
- Chia sẻ website trên social media để có backlinks
- Tối ưu hóa tốc độ tải trang
- Đảm bảo mobile-friendly
- Sử dụng HTTPS (đã có)
