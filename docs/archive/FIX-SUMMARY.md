# Tóm tắt Fix: Điểm số không cập nhật realtime

## Vấn đề

1. **Điểm số trong header không cập nhật** sau khi hoàn thành bài tập
2. **Trạng thái hoàn thành trong exercise-list không cập nhật** 
3. **recordAttempt() không được gọi** khi điểm số là 90-99%

## Nguyên nhân

### 1. Exercise-list không reactive với progress changes
- Component đang gọi `progressService.getExerciseStatus()` trực tiếp trong template
- Đây là function call, không phải signal/computed, nên không reactive

### 2. Header và Exercise-detail sử dụng toSignal() với pipe
- `toSignal()` với pipe có thể không trigger change detection đúng cách với OnPush strategy
- Cần sử dụng computed() để đảm bảo reactivity

### 3. recordAttempt() chỉ được gọi khi score = 100%
- Logic cũ: chỉ gọi `recordAttempt()` khi câu cuối cùng có điểm 100%
- Nếu điểm là 90-99%, người dùng phải nhấn "Next Sentence" nhưng `recordAttempt()` không được gọi

## Giải pháp

### 1. Sửa Exercise-list Component
**File: `src/app/components/exercise-list/exercise-list.ts`**

```typescript
// Thêm progressSignal để track progress changes
private progressSignal = toSignal(this.progress$, { initialValue: {...} });

// Tạo computed function để getExerciseStatus reactive
getExerciseStatus = computed(() => {
  const progress = this.progressSignal();
  const exercises = this.paginatedExercises();
  
  return (exerciseId: string) => {
    return this.progressService.getExerciseStatus(exerciseId);
  };
});
```

**Template: `src/app/components/exercise-list/exercise-list.html`**
```html
<!-- Thay đổi từ -->
[status]="progressService.getExerciseStatus(exercise.id)"

<!-- Sang -->
[status]="getExerciseStatus()(exercise.id)"
```

### 2. Sửa Header Component
**File: `src/app/components/header/header.ts`**

```typescript
// Thay đổi từ toSignal() với pipe sang computed()
private progressSignal = toSignal(this.progress$, { initialValue: {...} });

totalPoints = computed(() => this.progressSignal().totalPoints);
streak = computed(() => {
  this.progressSignal(); // Trigger reactivity
  return this.progressService.calculateStreak();
});
```

### 3. Sửa Exercise-detail Component
**File: `src/app/components/exercise-detail/exercise-detail.ts`**

#### 3a. Chuyển sang computed signals
```typescript
private progressSignal = toSignal(this.progress$, { initialValue: {...} });

credits = computed(() => this.progressSignal().totalCredits);
points = computed(() => this.progressSignal().totalPoints);
```

#### 3b. Gọi recordAttempt() khi hoàn thành câu cuối
```typescript
onNextSentence(): void {
  const currentIdx = this.currentSentenceIndex();
  const wasLastSentence = (currentIdx + 1) >= this.sentences().length;
  
  this.currentSentenceIndex.update(idx => idx + 1);
  // ... clear feedback ...
  
  // QUAN TRỌNG: Gọi recordAttempt() khi hoàn thành câu cuối
  if (wasLastSentence) {
    this.recordAttempt();
    this.clearInProgressState();
    this.isReviewMode.set(true);
  }
}
```

### 4. Thêm Debug Logging
**File: `src/app/services/progress.service.ts`**

```typescript
recordAttempt(attempt: ExerciseAttempt): void {
  console.log('=== RECORDING ATTEMPT ===');
  console.log('Current totalPoints:', current.totalPoints);
  console.log('Attempt accuracyScore:', attempt.accuracyScore);
  console.log('New totalPoints:', updated.totalPoints);
  
  this.progress$.next(updated);
  this.saveProgress(updated);
  
  console.log('Progress saved to localStorage');
  console.log('=== END RECORDING ATTEMPT ===');
}
```

## Cách kiểm tra

### 1. Mở Browser Console (F12)

### 2. Hoàn thành một bài tập

### 3. Quan sát logs:

```
=== RECORDING ATTEMPT ===
Current totalPoints: 0
Attempt accuracyScore: 95
New totalPoints: 95
Progress saved to localStorage
=== END RECORDING ATTEMPT ===

[Header] Progress signal updated: { totalPoints: 95, attempts: 1 }
[Header] totalPoints computed: 95

[ExerciseDetail] Points changed: 95
```

### 4. Kiểm tra localStorage:

```javascript
// Chạy trong console
const userId = localStorage.getItem('current_user_id');
const progress = JSON.parse(localStorage.getItem(`user_progress_${userId}`));
console.log('Total Points:', progress.totalPoints);
console.log('Attempts:', progress.attempts.length);
```

## Kết quả mong đợi

✅ Điểm số trong header cập nhật ngay lập tức sau khi hoàn thành bài tập
✅ Trạng thái "Completed" hiển thị trong exercise-list
✅ recordAttempt() được gọi cho tất cả bài tập hoàn thành (điểm >= 90%)
✅ Progress được lưu vào localStorage
✅ BehaviorSubject emit giá trị mới và tất cả components nhận được update

## Files đã sửa

1. `src/app/components/exercise-list/exercise-list.ts`
2. `src/app/components/exercise-list/exercise-list.html`
3. `src/app/components/header/header.ts`
4. `src/app/components/exercise-detail/exercise-detail.ts`
5. `src/app/services/progress.service.ts`

## Files debug hỗ trợ

1. `debug-progress.js` - Script để check localStorage
2. `DEBUG-INSTRUCTIONS.md` - Hướng dẫn debug chi tiết
