# Hướng dẫn Setup Firebase cho English Practice App

## Bước 1: Tạo Firebase Project

1. Truy cập [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project" hoặc "Thêm dự án"
3. Đặt tên project (ví dụ: "daily-english")
4. Tắt Google Analytics (không bắt buộc cho app này)
5. Click "Create project"

## Bước 2: Đăng ký Web App

1. Trong Firebase Console, click vào biểu tượng Web `</>`
2. Đặt tên app (ví dụ: "English Practice Web")
3. KHÔNG check "Firebase Hosting" (chưa cần)
4. Click "Register app"
5. Copy đoạn config có dạng:

```javascript
const firebaseConfig = {
  apiKey: "AIza...",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123"
};
```

## Bước 3: Cấu hình Firebase trong App

Mở file `src/environments/environment.ts` và điền thông tin:

```typescript
export const environment = {
  production: false,
  // ... các config khác
  firebase: {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT.appspot.com",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID"
  }
};
```

Làm tương tự cho `src/environments/environment.prod.ts`

## Bước 4: Bật Authentication

1. Trong Firebase Console, vào **Authentication**
2. Click "Get started"
3. Chọn tab "Sign-in method"
4. Bật **Anonymous** authentication:
   - Click vào "Anonymous"
   - Toggle "Enable"
   - Click "Save"

## Bước 5: Tạo Firestore Database

1. Trong Firebase Console, vào **Firestore Database**
2. Click "Create database"
3. Chọn **Start in test mode** (cho development)
4. Chọn location gần nhất (ví dụ: asia-southeast1)
5. Click "Enable"

## Bước 6: Cấu hình Security Rules (Quan trọng!)

### Cách 1: Deploy từ Firebase CLI (Khuyến khích)

1. Cài đặt Firebase CLI (nếu chưa có):
```bash
npm install -g firebase-tools
```

2. Login vào Firebase:
```bash
firebase login
```

3. Khởi tạo Firebase trong project:
```bash
firebase init firestore
```
- Chọn project của bạn
- Chọn file `firestore.rules` (đã có sẵn trong project)
- Nhấn Enter để giữ mặc định cho indexes

4. Deploy rules:
```bash
firebase deploy --only firestore:rules
```

### Cách 2: Copy/Paste trong Console

Trong Firestore Database, vào tab **Rules** và thay thế bằng:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // User data - only authenticated users can access their own data
    match /users/{userId}/data/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Deny all other access by default
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

Click "Publish" để áp dụng rules.

**Lưu ý**: Rules này cho phép mỗi user chỉ đọc/ghi dữ liệu của chính họ (progress, favorites, etc.)

## Bước 7: Test App

1. Chạy app: `npm start`
2. Mở browser tại `http://localhost:4200`
3. Click nút "Đồng bộ tiến độ" ở header
4. Kiểm tra Firebase Console > Authentication để thấy user mới
5. Kiểm tra Firestore Database để thấy data được lưu

## Bước 8: Test Cross-Device Sync

1. Làm một vài bài tập trên máy 1
2. Mở app trên máy 2 (hoặc browser khác)
3. Click "Đồng bộ tiến độ"
4. Tiến độ sẽ tự động sync!

## Lưu ý quan trọng

### Anonymous Authentication
- User ID được tạo tự động khi click "Đồng bộ tiến độ"
- Nếu xóa cache/cookies, user ID sẽ mất
- Để giữ tiến độ lâu dài, nên nâng cấp lên Email/Google login sau

### Firestore Limits (Free Tier)
- 50,000 reads/day
- 20,000 writes/day
- 20,000 deletes/day
- 1 GB storage
- Đủ cho app cá nhân hoặc nhóm nhỏ

### Security
- Test mode chỉ dùng cho development
- Sau 30 ngày, Firebase sẽ tự động khóa database
- Nhớ cập nhật security rules như hướng dẫn ở Bước 6

## Bước 9: Bật Google Sign-In (Optional nhưng khuyến khích)

### Trong Firebase Console:
1. Vào **Authentication** > **Sign-in method**
2. Click vào **Google**
3. Toggle **Enable**
4. Chọn email support (project support email)
5. Click **Save**

### Trong App:
Google login đã được tích hợp sẵn! Bạn sẽ thấy:
- Nút "Google" khi chưa đăng nhập
- Nút "Link Google" khi đang dùng anonymous account
- Hiển thị tên, email, và ảnh profile khi đã login Google

### Cách sử dụng:
1. **Login mới**: Click nút "Google" → Chọn tài khoản Google
2. **Link account**: Nếu đang dùng anonymous, click "Link Google" để giữ tiến độ và nâng cấp lên Google account
3. **Sync tự động**: Tiến độ sẽ tự động sync giữa các thiết bị khi dùng cùng Google account

## Nâng cấp sau này (Optional)

### 1. Thêm Email/Password Login
```typescript
// Trong auth.service.ts
signInWithEmail(email: string, password: string) {
  return from(signInWithEmailAndPassword(this.auth, email, password));
}
```

### 2. Thêm providers khác
- Facebook Login
- Apple Sign-In
- Microsoft Account
- GitHub

### 3. Account Linking
App đã hỗ trợ link anonymous account với Google. Tương tự có thể làm với providers khác.

## Troubleshooting

### Lỗi: "Firebase: Error (auth/operation-not-allowed)"
→ Chưa bật Anonymous authentication (xem Bước 4)

### Lỗi: "Missing or insufficient permissions"
→ Chưa cấu hình Firestore rules đúng (xem Bước 6)

### Data không sync
→ Kiểm tra console log, có thể do network hoặc Firebase config sai

### Lỗi CORS
→ Kiểm tra lại apiKey và authDomain trong environment.ts
