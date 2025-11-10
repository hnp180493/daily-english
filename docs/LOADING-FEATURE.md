# Loading Spinner Feature

## Tổng quan

Đã thêm loading indicators cho tất cả các màn hình chính để cải thiện trải nghiệm người dùng khi load dữ liệu.

## Component mới

### LoadingSpinnerComponent

Component có thể tái sử dụng với các tùy chọn:

- `size`: 'small' | 'medium' | 'large' (mặc định: 'medium')
- `message`: Thông báo hiển thị dưới spinner (tùy chọn)
- `fullscreen`: Hiển thị loading toàn màn hình (mặc định: false)

**Ví dụ sử dụng:**

```html
<app-loading-spinner [message]="'Đang tải...'" />
<app-loading-spinner [fullscreen]="true" [message]="'Đang tải bài tập...'" />
<app-loading-spinner [size]="'small'" />
```

## Các màn hình đã được cập nhật

### 1. Home Component
- Hiển thị loading khi tải custom exercises
- Thời gian loading: 300ms sau khi data được load

### 2. Exercise List Component
- Hiển thị loading khi tải danh sách bài tập
- Loading tự động ẩn sau khi exercises được load

### 3. Exercise Detail Component
- Hiển thị loading fullscreen khi tải chi tiết bài tập
- Loading ẩn sau khi exercise data và SEO được cập nhật

### 4. Favorites Component
- Hiển thị loading khi tải danh sách bài tập yêu thích
- Loading ẩn sau khi exercises được load

### 5. Custom Exercise Library Component
- Hiển thị loading khi tải custom exercises
- Loading ẩn sau khi data được load

## Cải tiến UX

- **Giảm cảm giác lag**: Người dùng thấy feedback ngay lập tức khi chuyển trang
- **Loading mượt mà**: Sử dụng animation CSS để tạo hiệu ứng xoay mượt
- **Thông báo rõ ràng**: Hiển thị message tiếng Việt để người dùng biết đang load gì
- **Responsive**: Loading spinner hoạt động tốt trên mọi kích thước màn hình

## Technical Details

- Sử dụng Angular signals để quản lý loading state
- Loading state được set sau 300ms để tránh flash nếu data load nhanh
- Component sử dụng OnPush change detection để tối ưu performance
