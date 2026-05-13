# Authentication

> **Tags:** #system/auth #status/active  
> **Backend:** Supabase Auth (OAuth)

## Tổng quan

Xác thực qua **Supabase Auth** — chủ yếu là **Google OAuth**. User có thể dùng app ở chế độ **guest** (dữ liệu lưu localStorage) hoặc đăng nhập (dữ liệu sync Supabase).

## Trải nghiệm người dùng

1. Vào `/login` → button **Sign in with Google**.
2. OAuth redirect Google → callback Supabase → app reload với session.
3. AuthService phát signal `currentUser` → UI tự cập nhật:
   - Header hiện avatar + email.
   - Storage adapter switch sang Supabase.
   - Dữ liệu local được merge lên Supabase (nếu có).
4. Đăng xuất qua `/profile` → AuthService logout → reload → quay về guest.

## Component chính

- [src/app/components/login/login.ts](../../src/app/components/login/login.ts) — trang login.
- [src/app/components/auth-status/auth-status.ts](../../src/app/components/auth-status/auth-status.ts) — widget header hiển thị trạng thái auth.
- [src/app/components/profile/](../../src/app/components/profile/) — quản lý tài khoản.

## Service liên quan

- [services/auth.service.ts](../../src/app/services/auth.service.ts) — wrapper Supabase auth, expose `currentUser` signal.
- [services/supabase.client.ts](../../src/app/services/supabase.client.ts) — khởi tạo Supabase client.

## Guards

- [guards/auth.guard.ts](../../src/app/guards/auth.guard.ts) — chặn route cần auth (hiện đang **không** áp dụng cho [[Learning-Path]] — code đã comment out).
- [guards/login.guard.ts](../../src/app/guards/login.guard.ts) — chặn user đã login truy cập `/login`.
- [guards/beta-feature.guard.ts](../../src/app/guards/beta-feature.guard.ts) — gate cho [[Flashcards]] beta.

## Storage routing dựa trên auth

`StorageAdapterFactory` xét `AuthService.currentUser`:

- `null` → trả `LocalStorageProvider` (guest mode).
- Có user → trả `SupabaseStorageProvider` (sync remote).

Khi user login lần đầu: dữ liệu trong localStorage được **merge** lên Supabase qua migration utility (xem [[Storage-Sync]]).

## Bảo mật & quyền truy cập

- **JWT injection:** Supabase client gắn `x-auth-token` header cho mọi request để Row-Level Security (RLS) chỉ trả dữ liệu của user đó.
- API key AI **không** liên quan đến auth — chỉ lưu local cho mỗi browser (xem [[AI-Providers]]).

## Account states đặc biệt

- **Account inactive** → modal `AccountInactiveModal` hiện ra (vd. bị soft-delete).
- **Registration limit reached** → `RegistrationLimitModal`.
- **Tính năng cần login** mà user là guest → `LoginWarningModal`.

## Liên kết

- **Sử dụng bởi:** mọi feature đăng nhập-aware — [[Storage-Sync]], [[Custom-Exercises]], [[Achievements]], [[Favorites]]
- **Configures:** [[Storage-Sync]] (chọn provider)
- **Phụ thuộc:** Supabase Auth (`environment.supabase`)
