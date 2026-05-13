# Export / Import

> **Tags:** #feature/data #status/active  
> **Modal:** `ExportImportModal`

## Tổng quan

Cho phép sao lưu toàn bộ dữ liệu tiến độ ra **JSON** và phục hồi lại trên thiết bị khác / sau khi reset trình duyệt. Hữu ích khi:
- Người dùng chưa đăng nhập muốn giữ tiến độ.
- Chuyển dữ liệu giữa các thiết bị mà không qua sync.
- Backup trước khi xoá cache.

## Trải nghiệm người dùng

### Export
1. Vào `/profile` hoặc `/dashboard` → bấm **Export Data**.
2. Modal hiện ra với tổng quan dữ liệu sắp xuất (số bài, số achievement, ...).
3. Bấm **Download JSON** → tải file `daily-english-progress-YYYY-MM-DD.json`.

### Import
1. Mở cùng modal → tab **Import**.
2. Chọn file JSON đã export.
3. App parse → hiển thị preview (số attempts, achievements sẽ được merge).
4. Chọn chiến lược:
   - **Replace** — ghi đè dữ liệu hiện tại.
   - **Merge** — gộp (giữ bản tốt hơn cho mỗi exercise theo `accuracyScore`).
5. Confirm → ghi vào storage hiện tại (local hoặc Supabase tuỳ trạng thái auth).

## Phạm vi xuất

JSON chứa:
- `UserProgress` — `exerciseHistory`, `dictationHistory`, `totalPoints`, `currentStreak`, `longestStreak`, `achievements[]`.
- `UserAchievementData` — `unlockedAchievements`, `progress`.
- `CustomExercise[]` — bài tự tạo ([[Custom-Exercises]]).
- `Favorite list` — danh sách `exerciseId` đã đánh dấu.
- `Flashcard[]` — nếu có ([[Flashcards]]).
- `UserPathProgress` — tiến độ [[Learning-Path]].
- `WeeklyGoal[]` — lịch sử mục tiêu tuần.
- App settings (TTS, theme, ...).

## Component chính

- [src/app/components/export-import-modal/export-import-modal.ts](../../src/app/components/export-import-modal/export-import-modal.ts) — modal chính.

## Service liên quan

- [services/progress.service.ts](../../src/app/services/progress.service.ts) — đọc/ghi `UserProgress`.
- [services/database.service.ts](../../src/app/services/database.service.ts) — facade sync.
- Compressor utilities ([services/progress-compressor.ts](../../src/app/services/progress-compressor.ts) / `progress-decompressor.ts`, `achievement-compressor.ts`, `review-compressor.ts`/`review-decompressor.ts`) — nén format trước khi serialize, giảm dung lượng JSON.

## Liên kết

- **Nguồn dữ liệu:** [[Translation-Practice]], [[Dictation-Practice]], [[Achievements]], [[Custom-Exercises]], [[Favorites]], [[Flashcards]], [[Learning-Path]], [[Weekly-Goals]]
- **Phụ thuộc:** [[Storage-Sync]]
- **Mở từ:** [[Dashboard-Analytics]], `/profile`
