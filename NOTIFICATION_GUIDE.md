# Hướng Dẫn Sử Dụng Hệ Thống Notification

## Tổng Quan

Hệ thống notification đã được tích hợp hoàn chỉnh với giao diện toast hiện đại, thay thế việc log ra console.

## Các Tính Năng

### 1. Toast Notification UI
- **Vị trí**: Góc trên bên phải màn hình
- **Animation**: Trượt vào từ phải, mượt mà
- **Responsive**: Tự động điều chỉnh trên mobile
- **Accessibility**: Hỗ trợ screen reader với ARIA labels

### 2. Các Loại Notification

#### Success (Thành công)
- Màu xanh lá (#10B981)
- Icon: ✓
- Dùng cho: Thao tác thành công

#### Error (Lỗi)
- Màu đỏ (#EF4444)
- Icon: ✕
- Dùng cho: Thông báo lỗi

#### Warning (Cảnh báo)
- Màu vàng cam (#F59E0B)
- Icon: ⚠
- Dùng cho: Cảnh báo quan trọng, review khẩn cấp

#### Info (Thông tin)
- Màu xanh dương (#3B82F6)
- Icon: ℹ
- Dùng cho: Thông tin chung, review thường

### 3. Review Notifications

Hệ thống tự động kiểm tra và hiển thị thông báo:

#### Khi nào hiển thị?
- **Ngay khi đăng nhập**: Kiểm tra bài cần ôn tập
- **Mỗi giờ**: Kiểm tra định kỳ trong khi sử dụng app

#### Loại thông báo review:

**Urgent Review (Khẩn cấp)**
- Hiển thị khi có bài điểm < 60%
- Màu warning (vàng cam)
- Thời gian hiển thị: 10 giây
- Button: "Xem ngay" → Chuyển đến /review-queue

**Due Review (Sắp đến hạn)**
- Hiển thị khi có bài cần ôn trong 24h tới
- Màu info (xanh dương)
- Thời gian hiển thị: 8 giây
- Button: "Xem danh sách" → Chuyển đến /review-queue

### 4. Tương Tác

#### Đóng notification
- Click nút X ở góc phải
- Tự động đóng sau thời gian quy định

#### Action button
- Click button để thực hiện hành động
- Ví dụ: "Xem ngay" sẽ chuyển đến trang review queue
- Notification tự động đóng sau khi click action

## Test Notification (Development)

Khi chạy app ở chế độ development, bạn có thể test notification bằng browser console:

### Test các loại notification cơ bản:

```javascript
// Test success notification
window.testNotification('success')

// Test error notification
window.testNotification('error')

// Test warning notification
window.testNotification('warning')

// Test info notification
window.testNotification('info')
```

### Test review notification:

```javascript
// Test với 3 bài due, 1 bài urgent
window.testReviewNotification(3, 1)

// Test với 5 bài due, 0 bài urgent
window.testReviewNotification(5, 0)

// Test với 0 bài due, 2 bài urgent
window.testReviewNotification(0, 2)
```

## Sử Dụng Trong Code

### Import ToastService

```typescript
import { ToastService } from './services/toast.service';

export class MyComponent {
  private toastService = inject(ToastService);
  
  showSuccess() {
    this.toastService.success('Thao tác thành công!');
  }
  
  showError() {
    this.toastService.error('Đã xảy ra lỗi!');
  }
  
  showWithAction() {
    this.toastService.show(
      'Bạn có tin nhắn mới',
      'info',
      5000,
      {
        label: 'Xem ngay',
        callback: () => this.router.navigate(['/messages'])
      }
    );
  }
}
```

### API Methods

```typescript
// Show notification với tùy chọn đầy đủ
show(message: string, type: 'success' | 'error' | 'warning' | 'info', duration?: number, action?: { label: string, callback: () => void }): string

// Shortcuts
success(message: string, duration?: number): string
error(message: string, duration?: number): string
warning(message: string, duration?: number): string
info(message: string, duration?: number): string

// Đóng notification theo ID
dismiss(id: string): void

// Đóng tất cả notifications
clear(): void
```

## Cấu Trúc Files

```
src/app/
├── services/
│   ├── toast.service.ts              # Toast service chính
│   ├── review.service.ts             # Tích hợp notification
│   └── notification-test.utility.ts  # Test utilities
├── components/
│   └── toast-container/
│       ├── toast-container.ts        # Toast container component
│       ├── toast-container.html      # Template
│       └── toast-container.scss      # Styles
└── app.ts                            # Toast container được render ở đây
```

## Tùy Chỉnh

### Thay đổi vị trí
Chỉnh sửa trong `toast-container.scss`:
```scss
.toast-container {
  position: fixed;
  top: 80px;      // Thay đổi vị trí top
  right: 20px;    // Thay đổi vị trí right
}
```

### Thay đổi thời gian hiển thị mặc định
Chỉnh sửa trong `toast.service.ts`:
```typescript
show(message: string, type: Toast['type'] = 'info', duration: number = 5000)
//                                                              ^^^^ Thay đổi ở đây
```

### Thay đổi màu sắc
Chỉnh sửa trong `toast-container.scss`:
```scss
.toast-success {
  border-left-color: #10B981;  // Màu viền
  background: #F0FDF4;         // Màu nền
}
```

## Lưu Ý

1. **Performance**: Toast sử dụng Angular signals và OnPush change detection để tối ưu hiệu suất
2. **Accessibility**: Tất cả toast có ARIA labels và keyboard support
3. **Mobile**: Toast tự động responsive trên mobile
4. **Animation**: Sử dụng Angular animations cho hiệu ứng mượt mà
5. **Auto-dismiss**: Toast tự động đóng sau thời gian quy định (có thể tắt bằng duration = 0)

## Troubleshooting

### Notification không hiển thị?
1. Kiểm tra `<app-toast-container>` đã được thêm vào `app.html`
2. Kiểm tra ToastService đã được inject đúng
3. Mở browser console xem có lỗi không

### Notification bị che khuất?
1. Kiểm tra z-index trong `toast-container.scss` (hiện tại: 9999)
2. Đảm bảo không có element nào có z-index cao hơn

### Test functions không hoạt động?
1. Đảm bảo đang chạy ở development mode
2. Kiểm tra browser console có thông báo "Notification test functions loaded!"
3. Thử reload lại trang
