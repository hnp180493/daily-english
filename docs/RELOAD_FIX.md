# Fix: User Input Not Showing on Page Reload

## Vấn đề

Khi reload trang exercise detail, user input không hiển thị (hiển thị "Not translated yet"), mặc dù:
- Đi từ exercise-list vào thì có data
- Data đã được lưu trong Firestore với đầy đủ `sentenceAttempts`

## Nguyên nhân

**Timing Issue**: Khi reload trang, flow như sau:
1. `ngOnInit` được gọi
2. `loadExercise` được gọi
3. `checkAndLoadCompletedExercise` được gọi ngay lập tức
4. **Nhưng** `progressSignal()` vẫn là default value (empty `exerciseHistory`)
5. Firestore data chưa load xong → không tìm thấy attempt → không load user input

Khi đi từ exercise-list vào:
- Progress đã được load sẵn từ Firestore
- `progressSignal()` đã có data
- `checkAndLoadCompletedExercise` tìm thấy attempt → load thành công

## Giải pháp

### 1. Thêm Effect để monitor progress changes

```typescript
// Monitor progress changes to load completed exercise when data is ready
effect(() => {
  const progress = this.progressSignal();
  const ex = this.exercise();
  const user = this.authService.currentUser();
  
  // Only check if we have user, exercise, not in review mode, and progress has data
  if (user && ex && !this.isReviewMode() && Object.keys(progress.exerciseHistory || {}).length > 0) {
    const inProgressState = this.persistenceService.loadProgress(ex.id);
    if (!inProgressState) {
      console.log('[ExerciseDetail] Checking for completed exercise from progress effect');
      this.checkAndLoadCompletedExercise(ex.id);
    }
  }
});
```

**Logic**:
- Effect sẽ trigger khi `progressSignal()` thay đổi
- Đợi cho đến khi `exerciseHistory` có data (từ Firestore)
- Chỉ check completed exercise khi không có in-progress state
- Tránh gọi nhiều lần bằng cách check `isReviewMode()`

### 2. Sửa loadExercise để không gọi checkAndLoadCompletedExercise ngay

```typescript
private loadExercise(exercise: Exercise, isCustom: boolean, id: string): void {
  this.exercise.set(exercise);
  this.isCustomExercise.set(isCustom);
  this.stateService.initializeSentences(exercise.sourceText);
  
  if (this.isReviewMode()) {
    this.loadBestAttempt(id);
  } else {
    this.loadProgress(id);
    // Don't call checkAndLoadCompletedExercise here - let the effect handle it
    // when progress data is ready from Firestore
  }
}
```

### 3. Thêm logging để debug

```typescript
console.log('[ExerciseDetail] Progress effect triggered:', {
  hasUser: !!user,
  hasExercise: !!ex,
  exerciseHistoryCount: Object.keys(progress.exerciseHistory || {}).length,
  isReviewMode: this.isReviewMode()
});
```

## Flow mới

### Khi reload trang:
1. `ngOnInit` → `loadExercise` → `initializeSentences`
2. `loadProgress` (check localStorage)
3. **Đợi** Firestore load progress
4. Effect trigger khi `progressSignal()` có data
5. `checkAndLoadCompletedExercise` → `loadBestAttempt`
6. User input được hiển thị ✅

### Khi đi từ exercise-list:
1. Progress đã có sẵn
2. Effect trigger ngay với data
3. `checkAndLoadCompletedExercise` → `loadBestAttempt`
4. User input được hiển thị ✅

## Kết quả

- ✅ Reload trang: User input hiển thị đúng
- ✅ Đi từ exercise-list: User input hiển thị đúng
- ✅ Exercise chưa làm: Không có review mode
- ✅ Exercise đang làm dở: Load in-progress state
- ✅ Không có race condition

## Testing

1. **Reload trang với exercise đã hoàn thành**: User input hiển thị ✅
2. **Đi từ exercise-list**: User input hiển thị ✅
3. **Exercise mới**: Không có review mode ✅
4. **Exercise đang làm dở**: Load progress từ localStorage ✅

## Lưu ý

- Effect sẽ chỉ trigger khi `progressSignal()` thay đổi
- Check `exerciseHistory.length > 0` để đảm bảo data đã load
- Check `!isReviewMode()` để tránh gọi nhiều lần
- Check `!inProgressState` để ưu tiên in-progress state hơn completed state
