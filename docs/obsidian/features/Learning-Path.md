# Learning Path

> **Tags:** #feature/curriculum #status/active  
> **Route:** `/learning-path`

## Tổng quan

Lộ trình học có cấu trúc theo tuần: 3 lộ trình (Beginner / Intermediate / Advanced), mỗi lộ trình gồm nhiều **module** với danh sách `exerciseIds` cố định, level translation support (`full | partial | minimal | none`), điểm yêu cầu tối thiểu. Hoàn thành lộ trình → nhận **certificate**.

## Trải nghiệm người dùng

1. Vào `/learning-path` → màn hình có **5 tab:**
   - **Overview** — lộ trình hiện tại, module đang học, % hoàn thành.
   - **Daily Challenge** — widget [[Daily-Challenge]] nhúng.
   - **Progress** — `progress-dashboard` tổng quan module/path.
   - **Goals** — [[Weekly-Goals]] tracker.
   - **Certificate** — danh sách `PathCompletion[]` đã đạt + chứng chỉ in được.
2. Chọn `path-selector` để đổi lộ trình (Beginner → Intermediate → Advanced).
3. Trong module, làm các bài tập trong `exerciseIds[]` → đạt `requiredScore` → unlock module tiếp theo.
4. Hoàn thành toàn bộ module → sinh `PathCompletion` + `certificateId`.

## Component chính

- [src/app/components/learning-path/learning-path.ts](../../src/app/components/learning-path/learning-path.ts) — container 5-tab.
- [src/app/components/learning-path/path-selector/path-selector.ts](../../src/app/components/learning-path/path-selector/path-selector.ts) — chọn lộ trình.
- [src/app/components/learning-path/progress-dashboard/progress-dashboard.ts](../../src/app/components/learning-path/progress-dashboard/progress-dashboard.ts) — tab Progress.
- [src/app/components/learning-path/daily-challenge/daily-challenge.ts](../../src/app/components/learning-path/daily-challenge/daily-challenge.ts) — tab Daily Challenge.
- [src/app/components/learning-path/goal-tracker/goal-tracker.ts](../../src/app/components/learning-path/goal-tracker/goal-tracker.ts) — tab Goals.
- [src/app/components/learning-path/certificate/certificate.ts](../../src/app/components/learning-path/certificate/certificate.ts) — sinh & in chứng chỉ.
- [src/app/components/learning-path/exercise-list/exercise-list.ts](../../src/app/components/learning-path/exercise-list/exercise-list.ts) — danh sách bài trong module.

## Service liên quan

- [services/curriculum.service.ts](../../src/app/services/curriculum.service.ts) — load `LearningPath[]` từ `public/data/learning-paths/*-path.json`.
- [services/progress.service.ts](../../src/app/services/progress.service.ts) — tính `ModuleProgress`.
- [services/weekly-goal.service.ts](../../src/app/services/weekly-goal.service.ts) — quản lý `WeeklyGoal`.

## Data Model

- `LearningPath` — `id`, `name`, `level`, `duration`, `durationWeeks`, `modules: LearningModule[]`, `unlockRequirement?`.
- `LearningModule` — `id`, `name`, `weekRange`, `startWeek`, `endWeek`, `topics`, `exerciseIds`, `translationSupport`, `requiredScore?`.
- `UserPathProgress` — `userId`, `currentPathId`, `currentModuleId`, `completedModules`, `moduleProgress`, `pathCompletions[]`.
- `ModuleProgress` — `completedExercises`, `averageScore`, `totalExercises`, `completionPercentage`, `unlocked`, `totalPoints`.
- `PathCompletion` — `pathId`, `pathName`, `completedAt`, `finalScore`, `certificateId`, `modulesCompleted`, `totalPoints`.

Định nghĩa: [src/app/models/learning-path.model.ts](../../src/app/models/learning-path.model.ts).

## Nguồn dữ liệu

JSON tĩnh trong [public/data/learning-paths/](../../public/data/learning-paths/):
- `beginner-path.json`, `intermediate-path.json`, `advanced-path.json`.

## Route

- `/learning-path` → `LearningPath` (preload: high). Hiện không bật `authGuard` (cho phép xem khi chưa đăng nhập).

## Liên kết

- **Chứa:** [[Daily-Challenge]], [[Weekly-Goals]]
- **Bài tập trong module:** [[Exercise-Library]]
- **Sinh dữ liệu cho:** [[Achievements]] (path completion → milestone)
- **Phụ thuộc:** [[Storage-Sync]] (UserPathProgress lưu Supabase main DB)
