# Error Patterns

> **Tags:** #feature/analytics #feature/review #status/active  
> **Route:** `/error-patterns`

## Tổng quan

Phân tích các lỗi thường gặp qua tất cả `ExerciseAttempt`. Gom nhóm lỗi theo loại (`grammar | vocabulary | structure | spelling`), tần suất, các bài bị ảnh hưởng. Từ đó xác định **weak points** + đề xuất bài ôn / lesson.

## Trải nghiệm người dùng

1. Vào `/error-patterns`.
2. Thấy:
   - Danh sách **Error Pattern** sắp theo `frequency` giảm dần — mỗi pattern có `description`, ví dụ `FeedbackItem[]`, danh sách `affectedExercises[]`.
   - Danh sách **Weak Points** — `category`, `errorCount`, `lastOccurrence`, `improvementRate (%)`.
3. Click 1 pattern → mở detail với:
   - `grammarRule?` — quy tắc ngữ pháp liên quan.
   - `vocabularyWords?` — từ thường sai.
   - Đề xuất `GrammarLesson` hoặc `VocabularyDrill`.
4. Có thể click đề xuất → vào [[Translation-Practice]] / [[Review-Queue]] với bài targeted.

## Component chính

- [src/app/components/error-patterns/](../../src/app/components/error-patterns/) — trang chính.
- [src/app/components/dashboard/error-patterns-analysis/error-patterns-analysis.ts](../../src/app/components/dashboard/error-patterns-analysis/error-patterns-analysis.ts) — widget tóm tắt trong [[Dashboard-Analytics]].
- [src/app/components/dashboard/weak-areas-analysis/weak-areas-analysis.ts](../../src/app/components/dashboard/weak-areas-analysis/weak-areas-analysis.ts) — widget weak points.

## Service liên quan

- [services/error-pattern-analyzer.ts](../../src/app/services/error-pattern-analyzer.ts) — engine gom nhóm `FeedbackItem` từ `ExerciseAttempt[]`.

## Data Model

- `ErrorPattern` — `id`, `type: 'grammar' | 'vocabulary' | 'structure' | 'spelling'`, `description`, `frequency`, `affectedExercises[]`, `examples: FeedbackItem[]`, `grammarRule?`, `vocabularyWords?`.
- `WeakPoint` — `id`, `category`, `description`, `errorCount`, `lastOccurrence`, `improvementRate (%)`, `relatedPatterns[]`.
- `GrammarLesson` — `id`, `title`, `description`, `rule`, `examples`, `relatedErrorPattern`.
- `VocabularyDrill` — `id`, `words[]`, `exercises[]`, `targetWeakPoint`.

Định nghĩa: [src/app/models/review.model.ts](../../src/app/models/review.model.ts).

## Route

- `/error-patterns` → `ErrorPatternsComponent`

## Liên kết

- **Nguồn dữ liệu:** [[Translation-Practice]] (mỗi `FeedbackItem`)
- **Feed cho:** [[Review-Queue]] (xác định `incorrectSentenceIndices`), [[Adaptive-Learning]]
- **Hiển thị trong:** [[Dashboard-Analytics]]
- **Phụ thuộc:** [[Storage-Sync]]
