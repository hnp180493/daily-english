# Exercise Library

> **Tags:** #feature/practice #status/active  
> **Route:** `/exercises`

## Tổng quan

Thư viện 250+ bài tập dịch câu, chia theo **3 cấp độ × 8 chủ đề**. Người dùng duyệt, lọc, sắp xếp và chọn bài để vào [[Translation-Practice]].

## Trải nghiệm người dùng

1. Vào `/exercises`.
2. Lọc theo cấp độ (Beginner / Intermediate / Advanced).
3. Lọc theo chủ đề (8 chủ đề).
4. Có thể lọc theo trạng thái: **mới** / **đã thử** (`new` / `attempted`).
5. Click vào card → vào trang [[Translation-Practice]] (`/exercise/:slug`).
6. Có thể bookmark → xuất hiện trong [[Favorites]].

## Component chính

- [src/app/components/exercise-list/exercise-list.ts](../../src/app/components/exercise-list/exercise-list.ts) — trang chính.
- [src/app/components/exercise-card/exercise-card.ts](../../src/app/components/exercise-card/exercise-card.ts) — card hiển thị 1 bài.
- [src/app/components/category-card/category-card.ts](../../src/app/components/category-card/category-card.ts) — card chủ đề.
- [src/app/components/level-card/level-card.ts](../../src/app/components/level-card/level-card.ts) — card cấp độ.
- [src/app/components/sentence-difficulty-badge/sentence-difficulty-badge.ts](../../src/app/components/sentence-difficulty-badge/sentence-difficulty-badge.ts) — huy hiệu độ khó.

## Service liên quan

- [services/exercise.service.ts](../../src/app/services/exercise.service.ts) — load danh sách, lọc.
- [services/custom-exercise.service.ts](../../src/app/services/custom-exercise.service.ts) — gộp custom exercises ([[Custom-Exercises]]).
- [services/exercise-seo.service.ts](../../src/app/services/exercise-seo.service.ts) — sinh SEO data cho từng bài (xem [[SEO]]).

## Data Model

- `Exercise` — `id`, `title`, `level`, `category`, `sourceText` (Vietnamese), `englishText` (đáp án), `highlightedSentences`, `hints`, `expectedKeywords`, `fullContext`.
- `DifficultyLevel`: `BEGINNER | INTERMEDIATE | ADVANCED`.
- `ExerciseCategory`: `DAILY_LIFE | TRAVEL_TRANSPORTATION | EDUCATION_WORK | HEALTH_WELLNESS | SOCIETY_SERVICES | CULTURE_ARTS | SCIENCE_ENVIRONMENT | PHILOSOPHY_BELIEFS`.
- `ExerciseStatus`: `'new' | 'attempted'`, `attemptCount`, `bestScore`, `perfectCompletions`.

Định nghĩa: [src/app/models/exercise.model.ts](../../src/app/models/exercise.model.ts).

## Nguồn dữ liệu

JSON tĩnh trong [public/data/exercises/](../../public/data/exercises/) gồm:
- `beginner/<category>.json`
- `intermediate/<category>.json`
- `advanced/<category>.json`

Build pipeline ([scripts/combine-exercises.js](../../scripts/combine-exercises.js)) gộp thành `all-exercises.json` cho SEO/sitemap.

## Route

- `/exercises` → `ExerciseListComponent` (preload: high)

## Liên kết

- **Bài chính:** [[Translation-Practice]]
- **Tạo thêm:** [[Custom-Exercises]]
- **Bookmark:** [[Favorites]]
- **Trong lộ trình:** [[Learning-Path]]
- **Tracking:** [[Dashboard-Analytics]]
- **Phụ thuộc:** [[Storage-Sync]], [[SEO]]
