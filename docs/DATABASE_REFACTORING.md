# Database Refactoring - Centralized Database Layer

## Tổng quan

Đã refactor toàn bộ cơ chế gọi Firebase thành một abstraction layer tập trung, giúp dễ dàng thay đổi database backend trong tương lai.

## Cấu trúc mới

```
src/app/services/database/
├── database.interface.ts          # Interface định nghĩa contract
├── database.service.ts            # Service chính (facade)
├── firebase-database.service.ts   # Firebase implementation
└── README.md                      # Tài liệu chi tiết
```

## Các thay đổi chính

### 1. Tạo Database Abstraction Layer

#### `database.interface.ts`
- Định nghĩa `IDatabase` interface với tất cả database operations
- Các types: `FavoriteData`, `UserProfile`, `UnsubscribeFunction`
- Operations:
  - User Profile: save, load
  - Progress: save, load, subscribe
  - Favorites: save, load, subscribe
  - Custom Exercises: save, load, delete, subscribe

#### `firebase-database.service.ts`
- Implement `IDatabase` interface
- Chứa tất cả Firebase-specific logic
- Xử lý Firestore timestamp conversions
- Không phụ thuộc vào AuthService (nhận userId qua parameters)

#### `database.service.ts`
- Facade pattern - điểm truy cập duy nhất
- Inject `FirebaseDatabase` (dễ dàng thay đổi implementation)
- Cung cấp 2 loại methods:
  - Manual: Truyền userId trực tiếp
  - Auto: Tự động lấy userId từ AuthService (suffix `Auto`)

### 2. Refactor các Services hiện có

#### `firestore-sync.service.ts`
- Đánh dấu `@deprecated`
- Giữ lại để backward compatibility
- Refactor để sử dụng `DatabaseService` bên trong
- Export types để các services khác vẫn dùng được

#### `auth.service.ts`
- Thay `FirestoreSyncService` → `DatabaseService`
- Sử dụng `saveUserProfileAuto()`

#### `progress.service.ts`
- Thay `FirestoreSyncService` → `DatabaseService`
- Thay `Unsubscribe` từ Firebase → `UnsubscribeFunction`
- Sử dụng các Auto methods
- Cập nhật log messages: "Firestore" → "database"

#### `favorite.service.ts`
- Thay `FirestoreSyncService` → `DatabaseService`
- Thay `Unsubscribe` từ Firebase → `UnsubscribeFunction`
- Sử dụng các Auto methods
- Cập nhật log messages

#### `custom-exercise.service.ts`
- Thay `FirestoreSyncService` → `DatabaseService`
- Sử dụng các Auto methods
- Cập nhật log messages và method names

## Lợi ích

### 1. Separation of Concerns
- Database logic tách biệt khỏi business logic
- Mỗi service chỉ quan tâm đến business rules
- Firebase details được encapsulate trong `FirebaseDatabase`

### 2. Easy Database Migration
Để chuyển sang database khác (Supabase, MongoDB, PostgreSQL):
1. Tạo class implement `IDatabase` (ví dụ: `SupabaseDatabase`)
2. Thay đổi 1 dòng trong `database.service.ts`:
   ```typescript
   private database = inject(SupabaseDatabase); // Thay vì FirebaseDatabase
   ```
3. Tất cả services khác tự động sử dụng database mới!

### 3. Better Testing
- Mock `IDatabase` interface dễ dàng
- Unit test không cần Firebase emulator
- Test business logic độc lập với database

### 4. Type Safety
- TypeScript interface đảm bảo type safety
- Compile-time checks cho tất cả operations
- IntelliSense support tốt hơn

### 5. Maintainability
- Code dễ đọc, dễ hiểu
- Centralized error handling
- Consistent logging patterns

## Cách sử dụng

### Trong Services mới
```typescript
import { DatabaseService } from './database/database.service';

@Injectable({ providedIn: 'root' })
export class MyService {
  private databaseService = inject(DatabaseService);

  saveData(data: any) {
    // Tự động lấy userId
    this.databaseService.saveProgressAuto(data).subscribe({
      next: () => console.log('Saved'),
      error: (err) => console.error('Error:', err)
    });
  }

  loadData() {
    // Real-time subscription
    const unsubscribe = this.databaseService.subscribeToProgressAuto((data) => {
      console.log('Data updated:', data);
    });

    // Cleanup
    return unsubscribe;
  }
}
```

### Migration từ FirestoreSyncService
```typescript
// Cũ
private firestoreSync = inject(FirestoreSyncService);
this.firestoreSync.saveProgress(progress).subscribe();

// Mới
private databaseService = inject(DatabaseService);
this.databaseService.saveProgressAuto(progress).subscribe();
```

## Backward Compatibility

- `FirestoreSyncService` vẫn hoạt động bình thường
- Tất cả existing code không bị break
- Có thể migrate dần dần sang `DatabaseService`
- Hoặc giữ nguyên nếu không cần thiết

## Testing

Tất cả services đã pass diagnostics:
- ✅ `database.interface.ts`
- ✅ `database.service.ts`
- ✅ `firebase-database.service.ts`
- ✅ `firestore-sync.service.ts`
- ✅ `auth.service.ts`
- ✅ `progress.service.ts`
- ✅ `favorite.service.ts`
- ✅ `custom-exercise.service.ts`

## Tài liệu

Chi tiết hơn xem: `src/app/services/database/README.md`

## Ví dụ: Migrate sang Supabase

```typescript
// 1. Tạo supabase-database.service.ts
import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { IDatabase, UserProfile, FavoriteData } from './database.interface';

@Injectable({ providedIn: 'root' })
export class SupabaseDatabase implements IDatabase {
  private supabase: SupabaseClient;

  constructor() {
    this.supabase = createClient(
      'YOUR_SUPABASE_URL',
      'YOUR_SUPABASE_KEY'
    );
  }

  saveUserProfile(userId: string, profile: UserProfile): Observable<void> {
    return from(
      this.supabase
        .from('user_profiles')
        .upsert({ user_id: userId, ...profile })
        .then(() => {})
    );
  }

  // Implement các methods khác...
}

// 2. Thay đổi trong database.service.ts
import { SupabaseDatabase } from './supabase-database.service';

export class DatabaseService implements IDatabase {
  private database = inject(SupabaseDatabase); // Chỉ thay dòng này!
}

// 3. Cập nhật app.config.ts
// Xóa Firebase providers, thêm Supabase config
```

## Best Practices

1. **Luôn sử dụng DatabaseService**: Không import trực tiếp implementation
2. **Ưu tiên Auto methods**: Tự động lấy userId, ít lỗi hơn
3. **Handle errors**: Luôn có error handler trong subscribe
4. **Cleanup subscriptions**: Gọi unsubscribe() khi destroy
5. **Type safety**: Sử dụng interfaces, không dùng `any`

## Kết luận

Refactoring này tạo nền tảng vững chắc cho việc:
- Thay đổi database backend dễ dàng
- Maintain code tốt hơn
- Test dễ dàng hơn
- Scale ứng dụng trong tương lai

Tất cả Firebase operations giờ đã được centralize tại một chỗ, và có thể thay đổi sang database khác chỉ bằng cách tạo một implementation mới của `IDatabase` interface!
