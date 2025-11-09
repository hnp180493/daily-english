# Database Abstraction Layer

Thư mục này chứa abstraction layer cho tất cả các database operations trong ứng dụng.

## Cấu trúc

```
database/
├── database.interface.ts       # Interface định nghĩa các operations
├── database.service.ts         # Service chính (facade pattern)
├── firebase-database.service.ts # Firebase implementation
└── README.md                   # Tài liệu này
```

## Kiến trúc

### 1. Database Interface (`database.interface.ts`)
Định nghĩa contract cho tất cả database operations:
- User Profile operations
- Progress tracking operations
- Favorites management
- Custom exercises CRUD

### 2. Database Service (`database.service.ts`)
- Facade pattern - điểm truy cập duy nhất cho tất cả database operations
- Tự động lấy userId từ AuthService
- Cung cấp cả phương thức thủ công (với userId) và tự động (Auto suffix)

### 3. Firebase Implementation (`firebase-database.service.ts`)
- Implement IDatabase interface
- Xử lý tất cả Firebase-specific logic
- Chuyển đổi Firestore timestamps sang JavaScript Date

## Cách sử dụng

### Trong Services
```typescript
import { DatabaseService } from './database/database.service';

@Injectable({ providedIn: 'root' })
export class MyService {
  private databaseService = inject(DatabaseService);

  saveData() {
    // Tự động lấy userId từ AuthService
    this.databaseService.saveProgressAuto(progress).subscribe();
    
    // Hoặc truyền userId thủ công
    this.databaseService.saveProgress(userId, progress).subscribe();
  }
}
```

### Real-time Subscriptions
```typescript
// Subscribe to real-time updates
const unsubscribe = this.databaseService.subscribeToProgressAuto((progress) => {
  console.log('Progress updated:', progress);
});

// Cleanup khi không cần nữa
unsubscribe();
```

## Thay đổi Database Backend

Để chuyển sang database khác (ví dụ: Supabase, MongoDB, PostgreSQL):

### Bước 1: Tạo Implementation mới
```typescript
// supabase-database.service.ts
import { IDatabase } from './database.interface';

@Injectable({ providedIn: 'root' })
export class SupabaseDatabase implements IDatabase {
  // Implement tất cả methods từ IDatabase
  saveUserProfile(userId: string, profile: UserProfile): Observable<void> {
    // Supabase implementation
  }
  // ... các methods khác
}
```

### Bước 2: Thay đổi Provider trong DatabaseService
```typescript
// database.service.ts
import { SupabaseDatabase } from './supabase-database.service';

export class DatabaseService implements IDatabase {
  // Thay đổi dòng này:
  private database = inject(SupabaseDatabase); // Thay vì FirebaseDatabase
}
```

### Bước 3: Cập nhật app.config.ts
```typescript
// Xóa Firebase providers
// Thêm Supabase providers
```

Tất cả services khác (ProgressService, FavoriteService, etc.) sẽ tự động sử dụng database mới mà không cần thay đổi code!

## Lợi ích

1. **Separation of Concerns**: Database logic tách biệt khỏi business logic
2. **Easy Testing**: Mock IDatabase interface dễ dàng cho unit tests
3. **Flexibility**: Thay đổi database backend chỉ cần sửa 1 file
4. **Type Safety**: TypeScript interface đảm bảo type safety
5. **Maintainability**: Code dễ đọc, dễ maintain hơn

## Migration Path

Hiện tại:
- `FirestoreSyncService` vẫn tồn tại để backward compatibility
- Nó đã được refactor để sử dụng `DatabaseService` bên trong
- Đánh dấu `@deprecated` để khuyến khích sử dụng `DatabaseService` trực tiếp

Tương lai:
- Có thể xóa `FirestoreSyncService` khi tất cả code đã migrate
- Hoặc giữ lại như một wrapper nếu cần

## Best Practices

1. **Luôn sử dụng DatabaseService**: Không import trực tiếp FirebaseDatabase
2. **Sử dụng Auto methods**: Ưu tiên các methods có suffix `Auto` để tự động lấy userId
3. **Handle errors**: Luôn subscribe với error handler
4. **Cleanup subscriptions**: Gọi unsubscribe() khi component destroy
5. **Type safety**: Sử dụng interfaces từ `database.interface.ts`

## Troubleshooting

### Lỗi "User not authenticated"
- Đảm bảo user đã login trước khi gọi database operations
- Kiểm tra AuthService.isAuthenticated()

### Lỗi "Failed to sync to database"
- Kiểm tra network connection
- Kiểm tra database permissions/rules
- Xem console logs để biết chi tiết lỗi

### Real-time updates không hoạt động
- Đảm bảo đã gọi subscribe method
- Kiểm tra unsubscribe có được gọi đúng lúc không
- Verify database rules cho phép read real-time
