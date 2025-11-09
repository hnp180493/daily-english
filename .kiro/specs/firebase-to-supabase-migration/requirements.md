# Requirements Document

## Introduction

Migrate hệ thống English Practice từ Firebase sang Supabase, bao gồm cả database (Firestore → PostgreSQL) và authentication (Firebase Auth → Supabase Auth). Hệ thống hiện tại đã có database abstraction layer tốt, cho phép chuyển đổi implementation mà không ảnh hưởng đến business logic. Migration phải đảm bảo tất cả chức năng hoạt động tương tự như khi sử dụng Firebase.

## Glossary

- **Application**: Ứng dụng English Practice được xây dựng bằng Angular
- **Supabase**: Backend-as-a-Service platform cung cấp PostgreSQL database và authentication
- **Firebase**: Backend-as-a-Service platform hiện tại đang được sử dụng
- **DatabaseService**: Service trung tâm quản lý tất cả database operations
- **AuthService**: Service quản lý authentication và user state
- **IDatabase**: Interface định nghĩa contract cho database operations
- **SupabaseDatabase**: Implementation mới của IDatabase sử dụng Supabase
- **User**: Người dùng của Application
- **UserProgress**: Dữ liệu tiến độ học tập của User
- **CustomExercise**: Bài tập tự tạo của User
- **FavoriteData**: Dữ liệu bài tập yêu thích của User
- **UserAchievementData**: Dữ liệu thành tích của User
- **UserRewards**: Dữ liệu phần thưởng của User
- **UserProfile**: Thông tin profile của User

## Requirements

### Requirement 1

**User Story:** Là một developer, tôi muốn migrate authentication từ Firebase Auth sang Supabase Auth, để User có thể đăng nhập bằng Google account như trước đây

#### Acceptance Criteria

1. WHEN User clicks vào nút "Sign in with Google", THE Application SHALL khởi tạo OAuth flow với Supabase Auth
2. WHEN Google authentication thành công, THE Application SHALL lưu user session vào Supabase
3. WHEN User đã authenticated, THE Application SHALL hiển thị user information (displayName, email, photoURL) giống như Firebase
4. WHEN User clicks vào nút "Sign out", THE Application SHALL xóa session khỏi Supabase và redirect về login screen
5. WHEN Application khởi động, THE Application SHALL kiểm tra existing session và tự động authenticate User nếu session còn valid

### Requirement 2

**User Story:** Là một developer, tôi muốn tạo Supabase database schema tương đương với Firestore structure, để dữ liệu được tổ chức logic và dễ query

#### Acceptance Criteria

1. THE Application SHALL tạo table "users" với columns: id (uuid), email, display_name, photo_url, created_at, last_login
2. THE Application SHALL tạo table "user_progress" với columns: user_id (uuid), data (jsonb), updated_at
3. THE Application SHALL tạo table "user_favorites" với columns: user_id (uuid), exercise_id (text), added_at (timestamp)
4. THE Application SHALL tạo table "custom_exercises" với columns: id (uuid), user_id (uuid), data (jsonb), created_at, updated_at
5. THE Application SHALL tạo table "user_achievements" với columns: user_id (uuid), data (jsonb), updated_at
6. THE Application SHALL tạo table "user_rewards" với columns: user_id (uuid), themes (text[]), hints (integer), avatar_frames (text[]), updated_at
7. THE Application SHALL thiết lập foreign key constraints từ các tables về users.id với ON DELETE CASCADE
8. THE Application SHALL tạo indexes trên user_id columns để optimize query performance

### Requirement 3

**User Story:** Là một developer, tôi muốn implement SupabaseDatabase service theo IDatabase interface, để có thể swap implementation mà không thay đổi business logic

#### Acceptance Criteria

1. THE SupabaseDatabase SHALL implement tất cả methods trong IDatabase interface
2. WHEN saveUserProfile được gọi, THE SupabaseDatabase SHALL upsert data vào users table
3. WHEN loadUserProfile được gọi, THE SupabaseDatabase SHALL query data từ users table và return UserProfile object
4. WHEN saveProgress được gọi, THE SupabaseDatabase SHALL upsert data vào user_progress table
5. WHEN loadProgress được gọi, THE SupabaseDatabase SHALL query data từ user_progress table và return UserProgress object
6. WHEN subscribeToProgress được gọi, THE SupabaseDatabase SHALL sử dụng Supabase Realtime để listen changes và trigger callback
7. WHEN saveFavorites được gọi, THE SupabaseDatabase SHALL delete existing favorites và insert new favorites vào user_favorites table
8. WHEN loadFavorites được gọi, THE SupabaseDatabase SHALL query favorites từ user_favorites table và return FavoriteData array
9. WHEN subscribeToFavorites được gọi, THE SupabaseDatabase SHALL sử dụng Supabase Realtime để listen changes và trigger callback

### Requirement 4

**User Story:** Là một developer, tôi muốn implement custom exercise operations với Supabase, để User có thể tạo, đọc, xóa custom exercises như trước đây

#### Acceptance Criteria

1. WHEN saveCustomExercise được gọi, THE SupabaseDatabase SHALL upsert exercise data vào custom_exercises table
2. WHEN loadCustomExercises được gọi, THE SupabaseDatabase SHALL query tất cả exercises của User từ custom_exercises table
3. WHEN deleteCustomExercise được gọi, THE SupabaseDatabase SHALL delete exercise từ custom_exercises table
4. WHEN subscribeToCustomExercises được gọi, THE SupabaseDatabase SHALL sử dụng Supabase Realtime để listen changes và trigger callback với updated exercises list

### Requirement 5

**User Story:** Là một developer, tôi muốn implement achievement và reward operations với Supabase, để User progress và rewards được lưu trữ đúng cách

#### Acceptance Criteria

1. WHEN saveAchievements được gọi, THE SupabaseDatabase SHALL upsert achievement data vào user_achievements table
2. WHEN loadAchievements được gọi, THE SupabaseDatabase SHALL query achievement data từ user_achievements table và return UserAchievementData object
3. WHEN saveRewards được gọi, THE SupabaseDatabase SHALL upsert rewards data vào user_rewards table
4. WHEN loadRewards được gọi, THE SupabaseDatabase SHALL query rewards data từ user_rewards table và return UserRewards object

### Requirement 6

**User Story:** Là một developer, tôi muốn configure Supabase client trong Application, để có thể connect đến Supabase backend

#### Acceptance Criteria

1. THE Application SHALL install @supabase/supabase-js package
2. THE Application SHALL configure Supabase client với url và anonKey từ environment.ts
3. THE Application SHALL provide SupabaseDatabase service trong app.config.ts
4. WHEN DatabaseService được inject, THE Application SHALL sử dụng SupabaseDatabase thay vì FirebaseDatabase
5. THE Application SHALL maintain backward compatibility với FirebaseDatabase để có thể switch back nếu cần

### Requirement 7

**User Story:** Là một developer, tôi muốn setup Row Level Security (RLS) policies trong Supabase, để đảm bảo Users chỉ có thể access data của chính họ

#### Acceptance Criteria

1. THE Application SHALL enable RLS trên tất cả tables
2. THE Application SHALL tạo policy cho phép Users read own data từ tất cả tables
3. THE Application SHALL tạo policy cho phép Users insert own data vào tất cả tables
4. THE Application SHALL tạo policy cho phép Users update own data trong tất cả tables
5. THE Application SHALL tạo policy cho phép Users delete own data từ tất cả tables
6. THE Application SHALL verify rằng Users không thể access data của Users khác

### Requirement 8

**User Story:** Là một developer, tôi muốn update AuthService để sử dụng Supabase Auth, để authentication flow hoạt động với Supabase backend

#### Acceptance Criteria

1. THE AuthService SHALL sử dụng Supabase client thay vì Firebase Auth
2. WHEN signInWithGoogle được gọi, THE AuthService SHALL call supabase.auth.signInWithOAuth với provider 'google'
3. WHEN signOut được gọi, THE AuthService SHALL call supabase.auth.signOut
4. WHEN Application khởi động, THE AuthService SHALL call supabase.auth.getSession để restore existing session
5. THE AuthService SHALL subscribe to supabase.auth.onAuthStateChange để update currentUser signal
6. THE AuthService SHALL maintain same public API (signals, methods) để không break existing components

### Requirement 9

**User Story:** Là một developer, tôi muốn remove Firebase dependencies sau khi migration hoàn tất, để giảm bundle size và tránh conflicts

#### Acceptance Criteria

1. THE Application SHALL remove @angular/fire package từ dependencies
2. THE Application SHALL remove firebase package từ dependencies
3. THE Application SHALL remove Firebase configuration từ environment.ts
4. THE Application SHALL remove FirebaseDatabase service file
5. THE Application SHALL update app.config.ts để remove Firebase providers

### Requirement 10

**User Story:** Là một User, tôi muốn tất cả existing features hoạt động như trước sau khi migrate, để không bị gián đoạn trải nghiệm

#### Acceptance Criteria

1. WHEN User đăng nhập bằng Google, THE Application SHALL authenticate successfully và hiển thị user info
2. WHEN User làm bài tập, THE Application SHALL lưu progress vào Supabase
3. WHEN User thêm favorite, THE Application SHALL lưu favorite vào Supabase và sync realtime
4. WHEN User tạo custom exercise, THE Application SHALL lưu vào Supabase và hiển thị trong list
5. WHEN User unlock achievement, THE Application SHALL lưu achievement data vào Supabase
6. WHEN User earn rewards, THE Application SHALL lưu rewards vào Supabase
7. WHEN User mở Application trên device khác, THE Application SHALL load tất cả data từ Supabase
