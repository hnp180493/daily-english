# Adaptive Learning

> **Tags:** #feature/ai #feature/recommendation #status/active  
> **Engine:** `AdaptiveEngineService`

## Tổng quan

Engine đề xuất bài tập tiếp theo dựa trên hiệu suất gần đây của người dùng — kết hợp [[Error-Patterns]], `UserProgress`, [[Spaced-Repetition]] schedule và [[Learning-Path]] hiện tại. Mục tiêu: cá nhân hoá độ khó để giữ "zone of proximal development".

## Cách hoạt động

`AdaptiveEngineService.recommend(...)` xét:

1. **Performance trend** — average score 10–20 attempt gần nhất, theo category.
2. **Weak categories** — từ `WeakPoint[]` (xem [[Error-Patterns]]).
3. **Review urgency** — bài đã quá hạn ôn từ [[Review-Queue]].
4. **Learning path constraint** — nếu user đang trong [[Learning-Path]], chỉ chọn trong `LearningModule.exerciseIds`.
5. **Difficulty hint** — score cao → đề xuất level cao hơn; score thấp → giảm level / quay về category quen.

Output: `AdaptiveRecommendation` chứa `exerciseIds[]` ưu tiên + lý do (`reason: string`) hiển thị cho user ("Bạn cần ôn lại 'vocabulary-structure' trong category 'travel'").

## Component chính

- Không có page riêng — widget xuất hiện trong:
  - [[Dashboard-Analytics]] (recommendations panel).
  - [src/app/components/dashboard/learning-velocity/learning-velocity.ts](../../src/app/components/dashboard/learning-velocity/learning-velocity.ts) — phân tích tốc độ học để feed recommendation.
  - [src/app/components/dashboard/most-practiced/most-practiced.ts](../../src/app/components/dashboard/most-practiced/most-practiced.ts) — tránh đề xuất category đã làm quá nhiều.

## Service liên quan

- [services/adaptive-engine.service.ts](../../src/app/services/adaptive-engine.service.ts) — engine chính.
- Phụ thuộc:
  - [services/progress.service.ts](../../src/app/services/progress.service.ts) — lấy `UserProgress`.
  - [services/exercise.service.ts](../../src/app/services/exercise.service.ts) — pool bài.
  - [services/curriculum.service.ts](../../src/app/services/curriculum.service.ts) — module constraint.
  - [services/database.service.ts](../../src/app/services/database.service.ts) — lưu recommendation cache.

## Data Model

- `AdaptiveRecommendation` — `exerciseIds[]`, `reason`, `confidence`, `generatedAt`.
- `PerformanceAnalysis` — `averageScore`, `weakCategories[]`, `strongCategories[]`, `recentTrend`.

Định nghĩa: [src/app/models/adaptive-learning.model.ts](../../src/app/models/adaptive-learning.model.ts).

## Liên kết

- **Đầu vào:**
  - [[Translation-Practice]] (history attempts)
  - [[Error-Patterns]] (weak points)
  - [[Review-Queue]] (overdue items)
  - [[Learning-Path]] (current module constraint)
- **Hiển thị trong:** [[Dashboard-Analytics]]
- **Sử dụng AI cho hint:** [[AI-Providers]]
- **Phụ thuộc:** [[Storage-Sync]]
