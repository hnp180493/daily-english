# Dashboard Analytics

> **Tags:** #feature/analytics #status/active  
> **Route:** `/dashboard`

## Tổng quan

Trang dashboard với **12+ widget** thống kê tiến độ học tập. Cho phép xuất dữ liệu JSON, xem hiệu suất theo nhiều chiều: thời gian, chủ đề, cấp độ, loại lỗi.

## Trải nghiệm người dùng

1. Vào `/dashboard`.
2. Xem các widget xếp grid responsive (xem section "Widget chính" phía dưới).
3. Lọc / range theo thời gian (7 ngày / 30 ngày / 90 ngày / all).
4. Click vào card chi tiết → mở modal hoặc điều hướng sâu (vd. [[Error-Patterns]], [[Review-Queue]]).
5. Bấm **Export** → mở [[Export-Import]] modal → xuất `UserProgress` ra JSON.

## Widget chính

| Widget | File | Mục đích |
|---|---|---|
| Progress Charts | [progress-charts/](../../src/app/components/dashboard/progress-charts/) | Biểu đồ xu hướng score theo thời gian (Chart.js) |
| Performance Analysis | [performance-analysis/](../../src/app/components/dashboard/performance-analysis/) | Accuracy theo category/level |
| Performance Trend Chart | [performance-trend-chart/](../../src/app/components/dashboard/performance-trend-chart/) | Time-series tổng quát |
| Vocabulary Stats | [vocabulary-stats/](../../src/app/components/dashboard/vocabulary-stats/) | Từ vựng đã học, mastery distribution |
| Weak Areas Analysis | [weak-areas-analysis/](../../src/app/components/dashboard/weak-areas-analysis/) | `WeakPoint[]` từ [[Error-Patterns]] |
| Best Performances | [best-performances/](../../src/app/components/dashboard/best-performances/) | Top bài có điểm cao nhất |
| Most Practiced | [most-practiced/](../../src/app/components/dashboard/most-practiced/) | Category/level luyện nhiều nhất |
| Learning Velocity | [learning-velocity/](../../src/app/components/dashboard/learning-velocity/) | Tốc độ tiến bộ (skill acquisition) |
| Error Patterns Analysis | [error-patterns-analysis/](../../src/app/components/dashboard/error-patterns-analysis/) | Summary lỗi thường gặp |
| Activity Heatmap | [activity-heatmap/](../../src/app/components/dashboard/activity-heatmap/) | Calendar heatmap streak 90 ngày — đặt ở **đầu tab Overview** để mọi user thấy ngay khi mở dashboard. |
| Time-of-Day Analysis | [time-of-day-analysis/](../../src/app/components/dashboard/time-of-day-analysis/) | Giờ nào học tốt nhất |
| Practice Stats Widget | [practice-stats-widget/](../../src/app/components/dashboard/practice-stats-widget/) | Tổng bài, điểm, streak |
| Dictation Stats Widget | [dictation-stats-widget/](../../src/app/components/dashboard/dictation-stats-widget/) | Stats từ [[Dictation-Practice]] |
| Pronunciation Stats | [pronunciation-stats/](../../src/app/components/dashboard/pronunciation-stats/) | Stats từ [[Pronunciation-Practice]]: điểm TB, từ hay sai (latest-attempt-wins), nhóm lỗi phoneme. Hiện cho mọi user, hoặc empty state nếu chưa có attempt. |

## Service liên quan

- [services/progress.service.ts](../../src/app/services/progress.service.ts) — nguồn `UserProgress`.
- [services/error-pattern-analyzer.ts](../../src/app/services/error-pattern-analyzer.ts) — phân tích lỗi.
- [services/enhanced-analytics.service.ts](../../src/app/services/enhanced-analytics.service.ts) — derived metrics nâng cao.
- [services/exercise-metrics.service.ts](../../src/app/services/exercise-metrics.service.ts) — stats từng bài.
- [services/exercise-history.service.ts](../../src/app/services/exercise-history.service.ts) — truy vấn lịch sử attempt.

## Route

- `/dashboard` → `DashboardComponent` (preload: high)

## Liên kết

- **Nguồn dữ liệu:** [[Translation-Practice]], [[Dictation-Practice]], [[Daily-Challenge]], [[Weekly-Goals]]
- **Link sang chi tiết:** [[Error-Patterns]], [[Review-Queue]], [[Adaptive-Learning]]
- **Export:** [[Export-Import]]
- **Phụ thuộc nền tảng:** [[Storage-Sync]], [[Analytics]]
