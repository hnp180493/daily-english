# Bắt buộc Đăng nhập Google - Giải pháp Đơn giản & An toàn

## Tại sao bỏ Anonymous Login?

### Vấn đề với Anonymous
- ❌ User ID thay đổi mỗi khi clear cache
- ❌ Không thể khôi phục dữ liệu sau khi mất user ID
- ❌ Khó đồng bộ giữa các thiết bị
- ❌ User dễ nhầm lẫn về cách hoạt động

### Ưu điểm của Google Login Only
- ✅ User ID gắn với tài khoản Google, **KHÔNG BAO GIỜ thay đổi**
- ✅ Clear cache bao nhiêu lần cũng không mất dữ liệu
- ✅ Đồng bộ tự động giữa mọi thiết bị
- ✅ Đơn giản, dễ hiểu cho user
- ✅ An toàn hơn (Google authentication)

## Cách hoạt động mới

### 1. Luồng đăng nhập

```
User mở app
    ↓
Chưa đăng nhập?
    ↓
Redirect → /login
    ↓
Click "Đăng nhập với Google"
    ↓
Chọn tài khoản Google
    ↓
Redirect → /home
    ↓
Load dữ liệu từ Firestore
    ↓
Sử dụng app bình thường
```

### 2. Đồng bộ dữ liệu

```
User A (Máy 1):
- Đăng nhập: user@gmail.com
- User ID: abc123xyz (gắn với Google account)
- Thêm favorites → Lưu vào Firestore

User A (Máy 2):
- Đăng nhập: user@gmail.com
- User ID: abc123xyz (CÙNG ID)
- Load favorites từ Firestore
- ✅ Thấy tất cả favorites từ máy 1
```

### 3. Clear cache

```
User clear cache
    ↓
Mở app lại
    ↓
Redirect → /login
    ↓
Đăng nhập lại với Google
    ↓
User ID: abc123xyz (KHÔNG ĐỔI)
    ↓
Load dữ liệu từ Firestore
    ↓
✅ Tất cả dữ liệu vẫn còn!
```

## Thay đổi kỹ thuật

### 1. Xóa Auto Anonymous Sign-in

**Trước:**
```typescript
// app.ts
constructor() {
  effect(() => {
    if (!isAuthenticated) {
      this.authService.signInAnonymously().subscribe();
    }
  });
}
```

**Sau:**
```typescript
// app.ts
export class App {
  title = 'English Practice Platform';
  // Không còn auto sign-in
}
```

### 2. Thêm Auth Guard

```typescript
// guards/auth.guard.ts
export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated()) {
    return true;
  }

  router.navigate(['/login']);
  return false;
};
```

### 3. Tạo Login Page

```typescript
// components/login/login.ts
export class LoginComponent {
  signInWithGoogle(): void {
    this.authService.signInWithGoogle().subscribe({
      next: () => this.router.navigate(['/home']),
      error: (error) => alert('Đăng nhập thất bại')
    });
  }
}
```

### 4. Cập nhật Routes

```typescript
// app.routes.ts
export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'home', component: HomeComponent, canActivate: [authGuard] },
  { path: 'exercises', component: ExerciseListComponent, canActivate: [authGuard] },
  // ... tất cả routes khác đều có authGuard
];
```

## User Experience

### Lần đầu sử dụng

1. User mở app
2. Thấy trang login đẹp với:
   - Logo và giới thiệu app
   - Danh sách tính năng
   - Nút "Đăng nhập với Google"
3. Click đăng nhập → Chọn tài khoản Google
4. Vào app và bắt đầu sử dụng

### Lần sau

1. User mở app
2. Nếu đã đăng nhập (cookie còn):
   - Vào thẳng /home
   - Load dữ liệu từ Firestore
3. Nếu chưa đăng nhập (clear cache):
   - Redirect → /login
   - Đăng nhập lại
   - Dữ liệu vẫn còn nguyên

### Đồng bộ đa thiết bị

1. Đăng nhập trên máy tính
2. Làm bài, thêm favorites
3. Mở app trên điện thoại
4. Đăng nhập cùng tài khoản Google
5. ✅ Tất cả dữ liệu đã sync

## Firestore Structure

```
users/
  {googleUserId}/  ← User ID từ Google, KHÔNG BAO GIỜ đổi
    data/
      favorites/
        favorites: [...]
      progress/
        attempts: [...]
        totalCredits: ...
        totalPoints: ...
        currentStreak: ...
```

## Security

### Firestore Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/data/{document=**} {
      // Chỉ cho phép user đọc/ghi dữ liệu của chính họ
      allow read, write: if request.auth != null 
                         && request.auth.uid == userId;
    }
  }
}
```

### Google Authentication

- User phải đăng nhập qua Google OAuth
- Firebase xác thực token
- Mỗi request đều có auth token
- Firestore rules kiểm tra auth.uid

## Migration từ Anonymous

### Cho users hiện tại đang dùng anonymous

**Vấn đề:**
- Dữ liệu đang lưu với anonymous user ID
- Không thể chuyển sang Google user ID

**Giải pháp:**

#### Option 1: Account Linking (Khuyến khích)
```typescript
// Giữ lại tính năng linkAnonymousWithGoogle()
// User click "Link Google" → Dữ liệu được chuyển sang Google account
```

#### Option 2: Manual Migration
```typescript
// Admin script để migrate dữ liệu
// Copy data từ anonymous UID sang Google UID
```

#### Option 3: Accept Data Loss
- User mới bắt đầu từ đầu
- Đơn giản nhất nhưng mất dữ liệu cũ

**Khuyến nghị:** Giữ lại tính năng "Link Google" trong 1-2 tháng để users có thể migrate.

## FAQ

### Q: Nếu user không có tài khoản Google?

**A:** Hầu hết mọi người đều có Gmail. Nếu không, có thể:
- Tạo tài khoản Google miễn phí
- Hoặc thêm providers khác (Facebook, Apple, Email/Password)

### Q: User có thể dùng nhiều tài khoản Google?

**A:** Có, mỗi tài khoản Google sẽ có dữ liệu riêng. User có thể đăng xuất và đăng nhập tài khoản khác.

### Q: Dữ liệu có bị mất khi đăng xuất?

**A:** KHÔNG. Dữ liệu lưu trên Firestore. Đăng nhập lại sẽ load về.

### Q: Clear cache có mất dữ liệu không?

**A:** KHÔNG. Chỉ cần đăng nhập lại cùng tài khoản Google.

### Q: Có thể offline không?

**A:** Có. localStorage vẫn cache dữ liệu. Khi online lại sẽ sync với Firestore.

### Q: Firestore có giới hạn gì không?

**A:** Free tier:
- 50,000 reads/day
- 20,000 writes/day
- 1 GB storage
- Đủ cho hàng trăm users

## Best Practices

### Cho Users

1. ✅ Luôn đăng nhập bằng cùng tài khoản Google
2. ✅ Không lo lắng về clear cache
3. ✅ Có thể dùng trên nhiều thiết bị
4. ✅ Dữ liệu luôn an toàn trên cloud

### Cho Developers

1. ✅ Đơn giản hóa authentication flow
2. ✅ Không cần xử lý anonymous user ID
3. ✅ Dễ dàng debug (user ID cố định)
4. ✅ Bảo mật tốt hơn với Google OAuth

## Kết luận

Bắt buộc Google Login là giải pháp:
- ✅ **Đơn giản** - Không phức tạp với anonymous
- ✅ **An toàn** - User ID không bao giờ đổi
- ✅ **Đáng tin cậy** - Không mất dữ liệu
- ✅ **Dễ sử dụng** - User hiểu rõ cách hoạt động

**Không còn lo lắng về clear cache hay mất dữ liệu!**
