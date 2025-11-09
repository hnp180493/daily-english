# Database Optimization - Exercise History Structure

## Tổng quan

Đã tối ưu hóa cấu trúc dữ liệu `UserProgress` để tiết kiệm không gian database bằng cách:
- **Trước**: Lưu tất cả attempts trong mảng `attempts[]` (có thể có nhiều lần thử cho cùng một bài tập)
- **Sau**: Chỉ lưu attempt cuối cùng cho mỗi `exerciseId` trong object `exerciseHistory`

## Thay đổi cấu trúc dữ liệu

### Trước (Old Structure)
```typescript
interface UserProgress {
  attempts: ExerciseAttempt[];  // Mảng chứa TẤT CẢ attempts
  totalCredits: number;
  totalPoints: number;
  // ...
}
```

### Sau (New Structure)
```typescript
interface UserProgress {
  exerciseHistory: { [exerciseId: string]: ExerciseAttempt };  // Chỉ lưu attempt cuối cùng
  totalCredits: number;
  totalPoints: number;
  // ...
}
```

## Lợi ích

1. **Tiết kiệm không gian**: Thay vì lưu 9 attempts cho cùng một bài tập (như ví dụ), chỉ lưu 1 attempt cuối cùng
2. **Truy cập nhanh hơn**: O(1) lookup theo `exerciseId` thay vì O(n) search trong mảng
3. **Dễ cập nhật**: Chỉ cần set `exerciseHistory[exerciseId] = newAttempt`

## Migration tự động

Service đã được cập nhật để tự động migrate dữ liệu cũ:

```typescript
// Trong progress.service.ts
private migrateProgressData(progress: any): UserProgress {
  if (progress.attempts && Array.isArray(progress.attempts)) {
    const exerciseHistory: { [exerciseId: string]: ExerciseAttempt } = {};
    
    // Chỉ giữ attempt cuối cùng cho mỗi exerciseId
    progress.attempts.forEach((attempt: ExerciseAttempt) => {
      const existing = exerciseHistory[attempt.exerciseId];
      if (!existing || new Date(attempt.timestamp) > new Date(existing.timestamp)) {
        exerciseHistory[attempt.exerciseId] = attempt;
      }
    });
    
    progress.exerciseHistory = exerciseHistory;
    delete progress.attempts;
  }
  return progress;
}
```

## Helper Class

Đã tạo `UserProgressHelper` để hỗ trợ backward compatibility:

```typescript
export class UserProgressHelper {
  // Lấy tất cả attempts dưới dạng mảng (cho analytics)
  static getAllAttempts(progress: UserProgress): ExerciseAttempt[] {
    return Object.values(progress.exerciseHistory);
  }

  // Đếm số lượng exercises đã làm
  static getAttemptsCount(progress: UserProgress): number {
    return Object.keys(progress.exerciseHistory).length;
  }

  // Kiểm tra exercise đã tồn tại chưa
  static hasExercise(progress: UserProgress, exerciseId: string): boolean {
    return exerciseId in progress.exerciseHistory;
  }
}
```

## Files đã cập nhật

1. **Models**
   - `src/app/models/exercise.model.ts` - Cập nhật interface và thêm helper class

2. **Services**
   - `src/app/services/progress.service.ts` - Logic migration và record attempt
   - `src/app/services/analytics.service.ts` - Sử dụng helper để lấy attempts
   - `src/app/services/achievement.service.ts` - Cập nhật criteria checking
   - `src/app/services/achievement-progress.service.ts` - Sử dụng helper
   - `src/app/services/achievement-criteria.service.ts` - Sử dụng helper

## Ví dụ sử dụng

### Record attempt mới
```typescript
// Tự động ghi đè attempt cũ nếu cùng exerciseId
recordAttempt(attempt: ExerciseAttempt): void {
  const updatedHistory = {
    ...current.exerciseHistory,
    [attempt.exerciseId]: attempt  // Chỉ lưu attempt mới nhất
  };
}
```

### Lấy thông tin exercise
```typescript
// Truy cập trực tiếp O(1)
const attempt = progress.exerciseHistory['ex-014'];
if (attempt) {
  console.log('Last attempt:', attempt.accuracyScore);
}
```

### Lấy tất cả attempts (cho analytics)
```typescript
const allAttempts = UserProgressHelper.getAllAttempts(progress);
const avgScore = allAttempts.reduce((sum, a) => sum + a.accuracyScore, 0) / allAttempts.length;
```

## Tương thích ngược

- Migration tự động khi load dữ liệu từ localStorage hoặc Firestore
- Tất cả code hiện tại vẫn hoạt động thông qua `UserProgressHelper`
- Không cần thay đổi UI components

## Testing

Đã test với dữ liệu mẫu:
- 9 attempts cho cùng exerciseId → Chỉ giữ lại 1 (attempt cuối cùng)
- Tiết kiệm ~89% không gian cho trường hợp này
- Tất cả achievements và analytics vẫn hoạt động bình thường
