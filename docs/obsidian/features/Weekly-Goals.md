# Weekly Goals

> **Tags:** #feature/gamification #status/active  
> **Vị trí:** widget tại home + tab trong [[Learning-Path]]

## Tổng quan

Mục tiêu số lượng bài tập hoàn thành trong tuần (Mon → Sun). Đạt mục tiêu → nhận `bonusPointsEarned`. Có lịch sử `GoalHistory` theo dõi tỉ lệ đạt mục tiêu nhiều tuần.

## Trải nghiệm người dùng

1. Mở home hoặc tab Goals trong [[Learning-Path]].
2. Widget hiển thị:
   - `targetExercises` — số bài mục tiêu trong tuần.
   - `completedExercises` — đã hoàn thành.
   - Progress ring + % đạt được.
3. Hoàn thành bài tập trong tuần → tăng `completedExercises`.
4. Đạt `targetExercises` → `isAchieved = true`, cộng `bonusPointsEarned`.
5. Tuần mới (`weekStartDate` đổi sang Monday tiếp theo) → tạo `WeeklyGoal` mới.

## Component chính

- [src/app/components/learning-path/goal-tracker/goal-tracker.ts](../../src/app/components/learning-path/goal-tracker/goal-tracker.ts) — widget chính.

## Service liên quan

- [services/weekly-goal.service.ts](../../src/app/services/weekly-goal.service.ts) — quản lý CRUD `WeeklyGoal`, kiểm tra `isAchieved`.

## Data Model

- `WeeklyGoal` — `userId`, `weekStartDate` (Monday ISO), `targetExercises`, `completedExercises`, `isAchieved`, `bonusPointsEarned`.
- `GoalHistory` — `userId`, `goals: WeeklyGoal[]`, `totalGoalsAchieved`, `achievementRate` (%).

Định nghĩa: [src/app/models/weekly-goal.model.ts](../../src/app/models/weekly-goal.model.ts).

## Liên kết

- **Hiển thị trong:** [[Learning-Path]] (tab Goals), home page
- **Đếm từ:** [[Translation-Practice]], [[Dictation-Practice]] (mỗi attempt thành công)
- **Sinh dữ liệu cho:** [[Achievements]] (qua tracking tuần liên tục đạt mục tiêu)
- **Lưu trữ:** [[Storage-Sync]] (Supabase tracking DB)
