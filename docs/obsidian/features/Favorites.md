# Favorites

> **Tags:** #feature/practice #status/active  
> **Route:** `/favorites`

## Tổng quan

Đánh dấu các bài tập yêu thích để quay lại nhanh. Badge số favorites hiển thị ở header. Mỗi favorite gắn với `exerciseId` + `userId`.

## Trải nghiệm người dùng

1. Trong [[Translation-Practice]] hoặc [[Exercise-Library]], bấm icon ⭐ → toggle favorite cho bài đó.
2. Vào `/favorites` → thấy danh sách đã đánh dấu, sắp theo thời gian đánh dấu hoặc tên.
3. Mỗi card hiển thị status (`new | attempted`), điểm cao nhất nếu đã làm.
4. Click → vào [[Translation-Practice]].
5. Bỏ favorite từ trong list.

## Component chính

- [src/app/components/favorites/favorites.ts](../../src/app/components/favorites/favorites.ts) — trang chính.
- Reuse `exercise-card` từ [[Exercise-Library]].

## Service liên quan

- [services/favorite.service.ts](../../src/app/services/favorite.service.ts) — CRUD favorites (lazy inject `AuthService`, lưu Supabase nếu đăng nhập, local nếu khách).

## Data Model

Danh sách `string[]` (`exerciseId`) gắn với `userId`. Không có model riêng — lưu thẳng vào `UserProgress` hoặc bảng riêng trong Supabase.

## Route

- `/favorites` → `FavoritesComponent`

## Liên kết

- **Đánh dấu từ:** [[Translation-Practice]], [[Exercise-Library]]
- **Làm bài qua:** [[Translation-Practice]]
- **Phụ thuộc:** [[Storage-Sync]], [[Authentication]] (để cá nhân hoá)
- **Sao lưu:** [[Export-Import]]
