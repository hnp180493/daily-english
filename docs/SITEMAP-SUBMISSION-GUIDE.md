# Hướng Dẫn Submit Sitemap lên Google Search Console và Bing

## Bước 1: Lấy Verification Codes

### Google Search Console

1. Truy cập [Google Search Console](https://search.google.com/search-console)
2. Đăng nhập bằng tài khoản Google
3. Click **Add Property** → chọn **URL prefix**
4. Nhập domain của bạn (ví dụ: `https://yourdomain.com`)
5. Chọn phương thức xác minh **HTML tag**
6. Copy mã verification từ thẻ meta tag:
   ```html
   <meta name="google-site-verification" content="YOUR_CODE_HERE" />
   ```
7. Lấy phần `YOUR_CODE_HERE` (không lấy toàn bộ thẻ meta)

### Bing Webmaster Tools

1. Truy cập [Bing Webmaster Tools](https://www.bing.com/webmasters)
2. Đăng nhập bằng tài khoản Microsoft
3. Click **Add a site**
4. Nhập URL của bạn
5. Chọn phương thức xác minh **Add a meta tag to your site**
6. Copy mã verification từ thẻ meta tag:
   ```html
   <meta name="msvalidate.01" content="YOUR_CODE_HERE" />
   ```
7. Lấy phần `YOUR_CODE_HERE`

## Bước 2: Thêm Verification Codes vào Environment

Mở file `src/environments/environment.prod.ts` và thêm mã verification:

```typescript
export const environment = {
  production: true,
  aiProvider: 'azure' as 'azure' | 'gemini' | 'openai',
  supabase: {
    url: 'YOUR_SUPABASE_URL',
    anonKey: 'YOUR_SUPABASE_KEY'
  },
  seo: {
    googleSiteVerification: 'abc123xyz...', // Mã từ Google
    bingWebmasterVerification: 'def456uvw...', // Mã từ Bing
  }
};
```

## Bước 3: Build và Deploy

```bash
# Build production
npm run build

# Deploy lên hosting của bạn (GitHub Pages, Firebase, etc.)
```

Sau khi deploy, các meta tag sẽ tự động được thêm vào `<head>` của trang web.

## Bước 4: Xác Minh Ownership

### Google Search Console

1. Quay lại Google Search Console
2. Click **Verify** để xác minh
3. Nếu thành công, bạn sẽ thấy thông báo "Ownership verified"

### Bing Webmaster Tools

1. Quay lại Bing Webmaster Tools
2. Click **Verify** để xác minh
3. Nếu thành công, site của bạn sẽ được thêm vào dashboard

## Bước 5: Submit Sitemap

### Google Search Console

1. Trong Google Search Console, chọn property của bạn
2. Vào menu **Sitemaps** (bên trái)
3. Nhập URL sitemap: `sitemap.xml`
4. Click **Submit**
5. Đợi vài phút để Google xử lý

### Bing Webmaster Tools

1. Trong Bing Webmaster Tools, chọn site của bạn
2. Vào **Sitemaps** trong menu
3. Click **Submit a sitemap**
4. Nhập URL đầy đủ: `https://yourdomain.com/sitemap.xml`
5. Click **Submit**

## Kiểm Tra Sitemap

Trước khi submit, hãy kiểm tra sitemap hoạt động:

1. Truy cập: `https://yourdomain.com/sitemap.xml`
2. Bạn sẽ thấy danh sách các URL trong XML format
3. Đảm bảo không có lỗi 404 hoặc XML syntax error

## Theo Dõi Index Status

### Google Search Console

- Vào **Coverage** để xem các trang đã được index
- Vào **Performance** để xem traffic từ Google Search
- Thường mất 1-7 ngày để Google index các trang mới

### Bing Webmaster Tools

- Vào **Site Explorer** để xem các trang đã được index
- Vào **Search Performance** để xem traffic từ Bing
- Thường mất 2-7 ngày để Bing index các trang mới

## Troubleshooting

### Verification Failed

- Đảm bảo bạn đã deploy code mới với verification codes
- Clear cache trình duyệt và thử lại
- Kiểm tra source code của trang (View Page Source) để đảm bảo meta tags có mặt

### Sitemap Not Found

- Kiểm tra file `sitemap.xml` có trong thư mục `public/`
- Đảm bảo file được copy vào `dist/` khi build
- Kiểm tra `angular.json` có cấu hình assets đúng

### Sitemap Errors

- Validate sitemap tại [XML Sitemap Validator](https://www.xml-sitemaps.com/validate-xml-sitemap.html)
- Đảm bảo tất cả URLs đều accessible (không 404)
- Kiểm tra lastmod dates hợp lệ

## Lưu Ý Quan Trọng

1. **Không commit verification codes vào Git** nếu repository là public
2. Sử dụng environment variables hoặc GitHub Secrets cho production
3. Sitemap sẽ tự động update khi bạn thêm/xóa exercises
4. Nên submit lại sitemap sau mỗi lần update lớn
5. Monitor coverage reports thường xuyên để phát hiện vấn đề sớm

## Tài Nguyên Bổ Sung

- [Google Search Console Help](https://support.google.com/webmasters)
- [Bing Webmaster Guidelines](https://www.bing.com/webmasters/help/webmasters-guidelines-30fba23a)
- [Sitemap Protocol](https://www.sitemaps.org/protocol.html)
