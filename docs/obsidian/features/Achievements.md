# Achievements

> **Tags:** #feature/gamification #status/active  
> **Route:** `/achievements` + showcase trong `/profile`

## Tổng quan

Hệ thống huy hiệu (60+ achievement) gamify việc học. Chia làm **4 loại** với 4 cấp độ rarity (Common / Rare / Epic / Legendary). Mỗi achievement có `criteria`, `rewards` (credits, theme, hints, avatar frame), và progress bar khi đang tiến đến.

## 4 loại achievement

| Loại | Ví dụ | Trigger |
|---|---|---|
| **Milestone** | `first-step` (1 bài), `dedicated-learner` (50 bài), `legend` (500 bài), `grand-master` (1000 bài), `eternal-learner` (2000 bài), `diversity-champion` (10+ trong cả 8 category) | Tổng số bài hoàn thành / đa dạng category |
| **Streak** | `week-warrior` (7 ngày), `month-master` (30), `unstoppable` (100), `year-champion` (365), `weekend-warrior`, `comeback-streak` | Chuỗi ngày liên tiếp ([[Daily-Challenge]]) |
| **Performance** | `perfect-score` (100% accuracy), `grammar-guru` (0 lỗi grammar), `speed-demon` (<60s & >90%), `marathon-runner` (10 bài/ngày), `early-bird` (<8AM, 10 days), `night-owl` (>10PM, 10 days), `consistency-king` (85%+ x20 liên tiếp), `error-free-streak` | Chất lượng / hành vi luyện tập |
| **Category Master** | `master-daily-life`, `master-travel-transportation`, ... (8 category) + `triple-category-master`, `half-master`, `category-perfectionist`, `ultimate-master` (toàn category) | Mastery theo chủ đề |

## Trải nghiệm người dùng

1. Vào `/achievements` hoặc tab "Achievements Showcase" trong `/profile`.
2. Xem grid `AchievementCard` chia 2 nhóm: **Unlocked** vs **In Progress**.
3. Lọc qua `AchievementFilters`: type, rarity, status.
4. Click 1 card → mở `AchievementDetailModal` với mô tả, criteria, tips, rewards, progress bar.
5. Khi đạt criteria → `AchievementNotification` toast bật lên, ghi vào `UserProgress.achievements[]` + `UserAchievementData.unlockedAchievements`.

## Component chính

- [src/app/components/achievements/achievements.ts](../../src/app/components/achievements/achievements.ts) — trang chính.
- [src/app/components/achievements/achievement-card/achievement-card.ts](../../src/app/components/achievements/achievement-card/achievement-card.ts) — card.
- [src/app/components/achievements/achievement-detail-modal/achievement-detail-modal.ts](../../src/app/components/achievements/achievement-detail-modal/achievement-detail-modal.ts) — modal chi tiết.
- [src/app/components/achievements/achievement-filters/achievement-filters.ts](../../src/app/components/achievements/achievement-filters/achievement-filters.ts) — bộ lọc.
- [src/app/components/achievements/achievement-notification/achievement-notification.ts](../../src/app/components/achievements/achievement-notification/achievement-notification.ts) — toast unlock.
- [src/app/components/achievements/achievement-showcase/achievement-showcase.ts](../../src/app/components/achievements/achievement-showcase/achievement-showcase.ts) — showcase trong profile.

## Service liên quan

- [services/achievement.service.ts](../../src/app/services/achievement.service.ts) — orchestrator chính.
- [services/achievement-criteria.service.ts](../../src/app/services/achievement-criteria.service.ts) — evaluate điều kiện (xem `MILESTONE_ACHIEVEMENTS`, `STREAK_ACHIEVEMENTS`, ... trong model).
- [services/achievement-progress.service.ts](../../src/app/services/achievement-progress.service.ts) — tính progress đang tiến đến.
- [services/achievement-store.service.ts](../../src/app/services/achievement-store.service.ts) — persistence (Supabase + localStorage qua [[Storage-Sync]]).
- [services/reward.service.ts](../../src/app/services/reward.service.ts) — phát rewards (credits, themes, avatar frames).
- [services/points-animation.service.ts](../../src/app/services/points-animation.service.ts) — animation visual khi nhận điểm.

## Data Model

- `Achievement` — `id`, `name`, `description`, `type: AchievementType`, `rarity: RarityLevel`, `iconUrl`, `criteria[]`, `tips?[]`, `rewards: Reward[]`, `unlocked`, `unlockedAt?`, `progress?`, `rewardsClaimed?`.
- `AchievementType`: `MILESTONE | STREAK | PERFORMANCE | CATEGORY_MASTER`.
- `RarityLevel`: `COMMON | RARE | EPIC | LEGENDARY`.
- `RewardType`: `CREDITS | THEME | HINTS | AVATAR_FRAME`.
- `AchievementProgress` — `current`, `required`, `percentage`, `description`, `lastUpdated`.
- `UserAchievementData` — `userId`, `unlockedAchievements[]`, `progress: { [id]: AchievementProgress }`, `lastEvaluated`.
- `MILESTONE_ACHIEVEMENTS`, `STREAK_ACHIEVEMENTS`, `PERFORMANCE_ACHIEVEMENTS`, `CATEGORY_MASTER_ACHIEVEMENTS`, `SPECIAL_CATEGORY_ACHIEVEMENTS`, `ULTIMATE_MASTER_ACHIEVEMENT`, `ALL_ACHIEVEMENTS` — constants exported.

Định nghĩa: [src/app/models/achievement.model.ts](../../src/app/models/achievement.model.ts).

## Route

- `/achievements` → `Achievements` component

## Liên kết

- **Trigger từ:** [[Translation-Practice]], [[Dictation-Practice]], [[Daily-Challenge]], [[Weekly-Goals]], [[Learning-Path]] (path completion)
- **Hiển thị trong:** `/profile` (showcase tab), header (badge số unlock mới)
- **Lưu trữ:** [[Storage-Sync]] (Supabase main DB + local)
- **Sao lưu:** [[Export-Import]]
