# Daily Challenge

> **Tags:** #feature/gamification #feature/streak #status/active  
> **Vị trí:** widget tại home + tab trong [[Learning-Path]]

## Tổng quan

Mỗi ngày, hệ thống chọn 1 bài tập làm "thử thách hôm nay". Người dùng hoàn thành → cộng `bonusPoints` + duy trì **streak** (chuỗi ngày liên tiếp). Streak là nền tảng cho nhiều achievement.

## Trải nghiệm người dùng

1. Mở home (`/`) hoặc vào tab Daily Challenge trong [[Learning-Path]].
2. Widget hiển thị:
   - Bài tập của ngày (icon 🔥 nếu streak ≥ 7).
   - Chỉ báo `currentStreak` + `longestStreak`.
   - Bonus điểm nếu hoàn thành.
3. Click → vào [[Translation-Practice]] với bài đã chọn.
4. Hoàn thành → `isCompleted = true`, `streakMultiplier` áp 1.5x nếu duy trì.
5. Cuối tuần: `isWeekendChallenge = true` với bonus cao hơn.

## Logic streak

- `lastActivityDate` so với hôm nay:
  - Cùng ngày → giữ nguyên.
  - Hôm qua → `currentStreak++`.
  - Cách >1 ngày → reset `currentStreak = 1` (lưu lại `streakHistory[].maintained = false`).
- `longestStreak = max(currentStreak, longestStreak)`.
- `streakMultiplier = currentStreak >= 7 ? 1.5 : 1.0`.

## Component chính

- [src/app/components/learning-path/daily-challenge/daily-challenge.ts](../../src/app/components/learning-path/daily-challenge/daily-challenge.ts) — widget chính (dùng được cả ở home + learning-path).

## Service liên quan

- [services/daily-challenge.service.ts](../../src/app/services/daily-challenge.service.ts) (nếu có) — sinh & chấm challenge.
- [services/progress.service.ts](../../src/app/services/progress.service.ts) — cập nhật `currentStreak`, `longestStreak`, `lastStreakDate` trong `UserProgress`.

## Data Model

- `DailyChallenge` — `id`, `userId`, `date` (YYYY-MM-DD), `exerciseId`, `isCompleted`, `completedAt?`, `score?`, `bonusPoints`, `isWeekendChallenge`.
- `StreakData` — `userId`, `currentStreak`, `longestStreak`, `lastActivityDate`, `streakMultiplier` (1.0 hoặc 1.5), `streakHistory: StreakHistoryEntry[]`.
- `StreakHistoryEntry` — `date`, `maintained`.

Định nghĩa: [src/app/models/daily-challenge.model.ts](../../src/app/models/daily-challenge.model.ts).

## Liên kết

- **Bài cho thử thách:** [[Exercise-Library]]
- **Làm bài qua:** [[Translation-Practice]]
- **Streak feed:** [[Achievements]] (`week-warrior`, `month-master`, `unstoppable`, `year-champion`, `comeback-streak`, ...)
- **Hiển thị trong:** [[Learning-Path]] (tab Daily Challenge), home page
- **Lưu trữ:** [[Storage-Sync]] (Supabase tracking DB)
