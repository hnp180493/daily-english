# Google Re-crawl Guide - Xóa "DigitalPlat"

## Vấn đề

Google đang hiển thị "DigitalPlat" thay vì "Daily English" trong search results.

## Nguyên nhân

1. Google cache cũ từ lần crawl trước
2. Thiếu structured data rõ ràng về tên site
3. Thiếu manifest.json với site name

## Giải pháp đã thực hiện

### 1. Thêm Web App Manifest
✅ Tạo `public/manifest.json` với:
- `"name": "Daily English - Học tiếng Anh với AI"`
- `"short_name": "Daily English"`

### 2. Cập nhật Structured Data
✅ Thêm `publisher` trong WebSite schema
✅ Thêm `alternateName` rõ ràng
✅ Thêm logo ImageObject

### 3. Tối ưu Meta Tags
✅ Title: "Daily English - Học tiếng Anh với AI | 250+ bài tập miễn phí"
✅ OG tags với site_name: "Daily English"

## Các bước để Google cập nhật

### Bước 1: Deploy code mới
```bash
npm run build
# Deploy lên server
```

### Bước 2: Request re-crawl trong Google Search Console

1. Truy cập: https://search.google.com/search-console
2. Chọn property: `dailyenglish.qzz.io`
3. Vào **URL Inspection** (Kiểm tra URL)
4. Nhập URL: `https://dailyenglish.qzz.io/`
5. Click **Request Indexing** (Yêu cầu lập chỉ mục)
6. Đợi Google crawl lại (1-2 ngày)

### Bước 3: Clear Google Cache

1. Truy cập: https://search.google.com/search-console/remove-outdated-content
2. Nhập URL cũ cần xóa cache
3. Submit request

### Bước 4: Test Structured Data

1. Truy cập: https://search.google.com/test/rich-results
2. Nhập URL: `https://dailyenglish.qzz.io/`
3. Click **Test URL**
4. Verify:
   - ✅ WebSite schema có `name: "Daily English"`
   - ✅ Organization schema có `name: "Daily English"`
   - ✅ Không có lỗi

### Bước 5: Verify Manifest

1. Mở site: https://dailyenglish.qzz.io/
2. Mở DevTools (F12)
3. Tab **Application** > **Manifest**
4. Verify:
   - ✅ Name: "Daily English - Học tiếng Anh với AI"
   - ✅ Short name: "Daily English"

## Timeline

- **Ngay lập tức**: Manifest và structured data có hiệu lực
- **1-2 ngày**: Google re-crawl sau khi request
- **3-7 ngày**: Search results cập nhật
- **1-2 tuần**: Hoàn toàn thay thế cache cũ

## Kiểm tra tiến độ

### Cách 1: Google Search
```
site:dailyenglish.qzz.io
```
Xem title hiển thị có còn "DigitalPlat" không

### Cách 2: Search Console
1. Vào **Performance** (Hiệu suất)
2. Xem **Impressions** (Lượt hiển thị)
3. Check query nào đang rank

### Cách 3: Rich Results Test
Chạy lại test sau 2-3 ngày để verify

## Nếu vẫn chưa thay đổi sau 1 tuần

### Option 1: Submit Feedback to Google
1. Truy cập: https://support.google.com/webmasters/contact/search_results_feedback
2. Chọn issue: "Incorrect site name in search results"
3. Provide URL và screenshot

### Option 2: Thêm Organization schema vào mọi page
Thêm vào `app.component.ts`:
```typescript
ngOnInit() {
  this.seoService.setStructuredData({
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "Daily English",
    "url": "https://dailyenglish.qzz.io/"
  });
}
```

### Option 3: Thêm meta tag explicit
```html
<meta property="og:site_name" content="Daily English">
<meta name="application-name" content="Daily English">
```

## Monitoring

### Week 1
- [ ] Deploy code mới
- [ ] Request indexing
- [ ] Test structured data
- [ ] Verify manifest

### Week 2
- [ ] Check search results
- [ ] Monitor Search Console
- [ ] Verify cache cleared

### Week 3
- [ ] Confirm "DigitalPlat" gone
- [ ] Check all pages indexed correctly
- [ ] Monitor impressions/clicks

## Notes

- Google cache có thể mất 2-4 tuần để hoàn toàn cập nhật
- Structured data là yếu tố quan trọng nhất
- Manifest.json giúp PWA và mobile
- Request indexing chỉ là "gợi ý" - Google quyết định khi nào crawl

## Contact

Nếu cần hỗ trợ: phuochnsw@gmail.com
