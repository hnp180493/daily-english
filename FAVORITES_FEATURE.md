# Tính năng Yêu thích (Favorites)

## Tổng quan

Tính năng Favorites cho phép người dùng đánh dấu các bài tập yêu thích để dễ dàng truy cập và luyện tập lại sau này.

## Các thành phần đã thêm

### 1. FavoriteService (`src/app/services/favorite.service.ts`)
- Quản lý danh sách bài tập yêu thích
- Lưu trữ dữ liệu trong LocalStorage
- Cung cấp các phương thức:
  - `isFavorite(exerciseId)`: Kiểm tra bài tập có trong danh sách yêu thích
  - `toggleFavorite(exerciseId)`: Thêm/xóa bài tập khỏi yêu thích
  - `addFavorite(exerciseId)`: Thêm bài tập vào yêu thích
  - `removeFavorite(exerciseId)`: Xóa bài tập khỏi yêu thích
  - `favoriteIds()`: Signal chứa danh sách ID bài tập yêu thích
  - `favoriteCount()`: Signal đếm số lượng bài tập yêu thích

### 2. Trang Favorites (`src/app/components/favorites/`)
- Hiển thị danh sách tất cả bài tập yêu thích
- Cho phép xóa bài tập khỏi danh sách
- Hiển thị trạng thái và điểm số của từng bài tập
- Empty state khi chưa có bài tập yêu thích

### 3. Nút Favorite trong Header
- Icon trái tim hiển thị trên header
- Badge hiển thị số lượng bài tập yêu thích
- Link đến trang Favorites

### 4. Nút Favorite trên Exercise Cards
- Icon trái tim trên mỗi exercise card
- Click để thêm/xóa khỏi yêu thích
- Màu đỏ khi đã yêu thích

### 5. Nút Favorite trong Exercise Detail
- Icon trái tim lớn bên cạnh tiêu đề bài tập
- Click để thêm/xóa khỏi yêu thích
- Hiển thị trạng thái yêu thích

## Cách sử dụng

### Thêm bài tập vào Favorites
1. Từ danh sách bài tập, click vào icon trái tim trên card
2. Hoặc trong trang chi tiết bài tập, click vào icon trái tim bên cạnh tiêu đề

### Xem danh sách Favorites
1. Click vào icon trái tim trên header
2. Hoặc truy cập `/favorites`

### Xóa khỏi Favorites
1. Trong trang Favorites, click vào icon trái tim đỏ trên card
2. Hoặc click lại icon trái tim ở bất kỳ đâu bài tập được hiển thị

## Lưu trữ dữ liệu

Dữ liệu favorites được lưu trong LocalStorage với key: `exercise_favorites`

Cấu trúc dữ liệu:
```json
[
  {
    "exerciseId": "ex-001",
    "addedAt": "2025-11-04T10:30:00.000Z"
  }
]
```

## Routes

- `/favorites` - Trang hiển thị danh sách bài tập yêu thích

## Accessibility

- Tất cả nút favorite có `aria-label` mô tả rõ ràng
- Hỗ trợ keyboard navigation
- Focus indicators rõ ràng
- Color contrast đạt chuẩn WCAG AA

## Responsive Design

- Trang Favorites responsive trên mobile, tablet, desktop
- Grid layout tự động điều chỉnh số cột
- Nút favorite có kích thước phù hợp cho touch devices
