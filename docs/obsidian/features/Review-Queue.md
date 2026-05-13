# Review Queue

> **Tags:** #feature/review #status/active  
> **Route:** `/review-queue`

## Tổng quan

Hàng đợi các bài cần ôn dựa trên [[Spaced-Repetition]]. Mỗi bài có **urgency level** (HIGH/MEDIUM/LOW) tính từ `nextReviewDate`, `lastScore`, `incorrectSentenceIndices`. Người dùng sắp xếp theo urgency / date / difficulty để chọn ôn.

## Trải nghiệm người dùng

1. Vào `/review-queue`.
2. Thấy danh sách `ReviewQueueItem[]` cùng:
   - Urgency badge (HIGH/MEDIUM/LOW).
   - `lastScore` lần trước.
   - `estimatedTime` (phút).
   - `incorrectQuestionCount` (câu sai lần trước).
3. Xem **Review Stats** ở đầu trang: `reviewsThisWeek`, `weakPointsImproved`, `currentStreak`, `totalReviewsCompleted`.
4. Click 1 bài → vào [[Translation-Practice]] với chế độ "quick review" — chỉ ôn các câu sai (`incorrectSentenceIndices`) thay vì làm lại toàn bài.
5. Sau khi xong, `ReviewData` được cập nhật bằng `getPerformanceGrade` + `adjustEasinessFactor` → bài có thể biến mất khỏi queue (nếu `nextReviewDate > hôm nay`).

## Component chính

- [src/app/components/review-queue/](../../src/app/components/review-queue/) — trang chính.
- [src/app/components/review-stats/review-stats.ts](../../src/app/components/review-stats/review-stats.ts) — widget thống kê tuần.

## Service liên quan

- [services/review.service.ts](../../src/app/services/review.service.ts) — xây queue, tính urgency, cập nhật ReviewData.
- [services/spaced-repetition.algorithm.ts](../../src/app/services/spaced-repetition.algorithm.ts) — thuật toán SM-2.
- [services/error-pattern-analyzer.ts](../../src/app/services/error-pattern-analyzer.ts) — bóc tách lỗi để xác định weak points.
- [services/exercise-quick-review.service.ts](../../src/app/services/exercise-quick-review.service.ts) — chế độ ôn nhanh chỉ câu sai.
- [services/review-migration.utility.ts](../../src/app/services/review-migration.utility.ts) — migrate dữ liệu review cũ.

## Data Model

- `ReviewData` — xem [[Spaced-Repetition]].
- `ReviewQueueItem` — `exerciseId`, `exercise`, `urgency: UrgencyLevel`, `nextReviewDate`, `lastScore`, `estimatedTime`, `incorrectQuestionCount`, `reviewData`.
- `UrgencyLevel`: `HIGH | MEDIUM | LOW`.
- `ReviewStatus`: `PENDING | IN_PROGRESS | COMPLETED | SKIPPED`.
- `ReviewStats` — `reviewsThisWeek`, `weakPointsImproved`, `currentStreak`, `totalReviewsCompleted`.

Định nghĩa: [src/app/models/review.model.ts](../../src/app/models/review.model.ts).

## Route

- `/review-queue` → `ReviewQueueComponent`

## Liên kết

- **Engine:** [[Spaced-Repetition]]
- **Nguồn lỗi:** [[Error-Patterns]] (`WeakPoint`, `ErrorPattern`)
- **Làm bài qua:** [[Translation-Practice]]
- **Hiển thị trong:** Header (badge số bài cần ôn), [[Dashboard-Analytics]]
- **Phụ thuộc:** [[Storage-Sync]]
