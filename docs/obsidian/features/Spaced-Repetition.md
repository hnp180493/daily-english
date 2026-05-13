# Spaced Repetition

> **Tags:** #feature/review #system #status/active  
> **Engine:** [src/app/services/spaced-repetition.algorithm.ts](../../src/app/services/spaced-repetition.algorithm.ts)

## Tổng quan

Thuật toán **SuperMemo 2 (SM-2)** xếp lịch ôn tập bài đã làm để tối ưu ghi nhớ dài hạn. Mỗi `ExerciseAttempt` được map sang `performance grade` (1–5), từ đó tính `easinessFactor` (EF) và `interval` (ngày đến lần ôn tiếp theo).

## Cách hoạt động

### Performance grade

| Score (%) | Grade | Ý nghĩa |
|---|---|---|
| ≥ 95 | 5 | Perfect |
| ≥ 85 | 4 | Good |
| ≥ 75 | 3 | Pass |
| ≥ 60 | 2 | Fail |
| < 60 | 1 | Poor |

### Easiness Factor (EF)

- Mặc định: **2.5**.
- Min: **1.3**.
- Công thức cập nhật:
  ```
  EF' = EF + (0.1 - (5 - grade) * (0.08 + (5 - grade) * 0.02))
  ```
- Grade cao → EF tăng → khoảng cách ôn dài hơn.
- Grade thấp → EF giảm → ôn dày hơn.

### Interval progression

| Lần ôn | Interval |
|---|---|
| 1 | 1 ngày |
| 2 | 3 ngày |
| ≥ 3 | `previousInterval * EF` |

Nếu grade < 3 (fail/poor) → reset về **1 ngày**.

## Sử dụng trong app

Hai feature dùng thuật toán này:

1. **[[Review-Queue]]** — mỗi `ExerciseAttempt` được lưu kèm `ReviewData` ({`easinessFactor`, `interval`, `nextReviewDate`, `repetitionCount`, `lastScore`, `incorrectSentenceIndices`}). Bài có `nextReviewDate <= hôm nay` xếp vào queue.
2. **[[Flashcards]]** — mỗi flashcard có `easeFactor`, `interval`, `nextReviewDate`. Người dùng đánh dấu Know/Don't Know sau mỗi card, hệ thống dùng `SPACED_REPETITION_CONSTANTS` (xem [src/app/models/memory-retention.model.ts](../../src/app/models/memory-retention.model.ts)) — biến thể đơn giản hơn của SM-2 với multiplier 2.5 cho Know, reset 1 ngày cho Don't Know.

## Hàm chính

- `getPerformanceGrade(score: number): number` — map % → 1–5.
- `adjustEasinessFactor(currentEF: number, grade: number): number` — cập nhật EF theo SM-2.
- `calculateNextInterval(...)` — sinh interval tiếp theo.

Tất cả trong [src/app/services/spaced-repetition.algorithm.ts](../../src/app/services/spaced-repetition.algorithm.ts) — pure functions, có throw error cho input không hợp lệ.

## Data Model

- `ReviewData` — `easinessFactor`, `interval`, `nextReviewDate`, `repetitionCount`, `lastReviewDate`, `lastScore`, `incorrectSentenceIndices`.
- `ReviewSchedule` — `nextReviewDate`, `interval`, `easinessFactor` (kết quả tính).
- `SPACED_REPETITION_CONSTANTS` cho flashcards: `MIN_INTERVAL=1`, `MAX_INTERVAL=180`, `KNOW_MULTIPLIER=2.5`, `DONT_KNOW_INTERVAL=1`, `MIN_EASE_FACTOR=1.3`, `MAX_EASE_FACTOR=3.0`.

Định nghĩa: [src/app/models/review.model.ts](../../src/app/models/review.model.ts), [src/app/models/memory-retention.model.ts](../../src/app/models/memory-retention.model.ts).

## Liên kết

- **Tiêu thụ bởi:** [[Review-Queue]], [[Flashcards]]
- **Nguồn dữ liệu:** [[Translation-Practice]] (mỗi attempt sinh score)
- **Phụ thuộc:** [[Storage-Sync]]
