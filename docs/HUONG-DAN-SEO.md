# Hướng dẫn để Google tìm thấy website với nhiều từ khóa

## Vấn đề
Hiện tại website chỉ xuất hiện khi search `site:dailyenglish.qzz.io`, không xuất hiện với các từ khóa như "học tiếng anh online", "bài tập tiếng anh", v.v.

## Nguyên nhân
1. Google chưa index đủ các trang
2. Thiếu sitemap đầy đủ (chỉ có 9 URLs, thiếu 250 exercise pages)
3. Thiếu content-rich pages với nhiều keywords
4. Thiếu backlinks từ các website khác

## Giải pháp đã làm ✅

### 1. Tạo Sitemap đầy đủ
- Đã tạo sitemap với **261 URLs** (250 exercises + 11 static pages)
- File: `public/sitemap.xml`
- Tự động generate khi build: `npm run build`

### 2. SEO-friendly URLs ⭐ MỚI
- Đổi từ `/exercise/ex-120` sang `/exercise/morning-coffee-ritual-intermediate-120`
- Google dễ hiểu nội dung từ URL
- Tăng khả năng rank với keywords trong title
- Ví dụ URLs mới:
  - `/exercise/the-little-joy-of-a-childs-laugh-beginner-001`
  - `/exercise/a-small-act-a-big-heart-beginner-002`
  - `/exercise/morning-coffee-ritual-intermediate-120`

### 3. Tạo robots.txt
- File: `public/robots.txt`
- Hướng dẫn Google crawl đúng cách

### 4. Tạo trang "Về chúng tôi"
- URL: `/about`
- Chứa 2000+ từ với nhiều keywords quan trọng
- Giải thích chi tiết về Daily English

### 5. Cải thiện internal links
- Thêm links trong footer
- Mỗi trang đều link với nhau

## Bước tiếp theo (QUAN TRỌNG) 🚨

### Bước 1: Submit Sitemap (BẮT BUỘC)
1. Vào https://search.google.com/search-console
2. Chọn property `dailyenglish.qzz.io`
3. Menu **Sitemaps** → Nhập: `https://dailyenglish.qzz.io/sitemap.xml`
4. Click **Submit**

### Bước 2: Request Indexing cho các trang quan trọng
Trong Google Search Console, request indexing cho:
- `https://dailyenglish.qzz.io/`
- `https://dailyenglish.qzz.io/about`
- `https://dailyenglish.qzz.io/exercises`
- `https://dailyenglish.qzz.io/learning-path`
- `https://dailyenglish.qzz.io/exercise/1`
- `https://dailyenglish.qzz.io/exercise/2`

**Cách làm:**
- Vào **URL Inspection** (thanh search ở đầu)
- Paste URL đầy đủ
- Click **Request Indexing**

### Bước 3: Tạo backlinks (Tăng authority)
Share website lên:
- ✅ Facebook groups về học tiếng Anh
- ✅ Zalo groups
- ✅ Reddit (r/learnenglish, r/learnvietnamese)
- ✅ Quora answers
- ✅ Facebook page riêng cho Daily English

### Bước 4: Kiên nhẫn chờ đợi
- **Tuần 1-2**: Google bắt đầu crawl
- **Tuần 3-4**: Xuất hiện với từ khóa dài (long-tail)
- **Tháng 2-3**: Xuất hiện với từ khóa phổ biến hơn

## Từ khóa mục tiêu

### Từ khóa chính:
- học tiếng anh
- học tiếng anh online
- học tiếng anh miễn phí
- bài tập tiếng anh
- luyện dịch tiếng anh

### Từ khóa dài (dễ rank hơn):
- học tiếng anh online miễn phí với AI
- bài tập dịch tiếng anh có đáp án
- luyện dịch câu tiếng anh cơ bản
- website học tiếng anh cho người mới bắt đầu

## Kiểm tra tiến độ

Vào Google Search Console → **Performance**:
- Xem có bao nhiêu pages đã được index
- Xem keywords nào đang có impressions
- Xem CTR (click-through rate)

## Lưu ý

⚠️ **SEO cần thời gian!** Không có kết quả ngay lập tức.
✅ **Quan trọng nhất**: Submit sitemap và request indexing NGAY HÔM NAY
🚀 **Tạo backlinks**: Share nhiều để tăng authority

## Checklist

- [x] Tạo sitemap đầy đủ
- [x] Tạo robots.txt
- [x] Tạo trang About
- [x] Cải thiện internal links
- [ ] **Submit sitemap lên Google Search Console** ← LÀM NGAY
- [ ] **Request indexing cho 5-10 trang quan trọng** ← LÀM NGAY
- [ ] Share lên Facebook/Zalo
- [ ] Tạo Facebook page
- [ ] Kiểm tra lại sau 1-2 tuần

---

**Tóm lại**: Đã chuẩn bị xong mọi thứ về mặt kỹ thuật. Bây giờ cần:
1. Submit sitemap lên Google Search Console (5 phút)
2. Request indexing cho các trang quan trọng (10 phút)
3. Share website lên social media (ongoing)
4. Chờ Google crawl và index (1-4 tuần)
