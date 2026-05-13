# Notifications

> **Tags:** #feature/engagement #status/active

## Tổng quan

Hệ thống thông báo trong app + (tuỳ chọn) **browser push notification** cho nhắc nhở học tập. Có 2 luồng:

1. **In-app toast / modal** — phản hồi tức thời (achievement unlock, error, success).
2. **Browser notification** — nhắc nhở streak, daily challenge, weekly goal, bài cần ôn ([[Review-Queue]]).

## Thông báo trong app (in-app)

### Toast notifications
- Hiển thị qua `ToastService` + `ToastContainer` (gắn global trong `app.html`).
- Trigger: submit thành công, lỗi mạng, achievement unlock, login/logout, save settings, ...

### Modals
- `ErrorModal` — hiển thị lỗi nghiêm trọng có nhiều nội dung.
- `AccountInactiveModal` — tài khoản chưa active.
- `LoginWarningModal` — cảnh báo cần login để dùng tính năng.
- `RegistrationLimitModal` — giới hạn đăng ký.

## Browser notifications

- Yêu cầu user grant permission lần đầu.
- Cài đặt qua Settings → Notifications:
  - **Nhắc duy trì streak** (vào cuối ngày nếu chưa hoàn thành bài).
  - **Daily challenge available** (đầu ngày).
  - **Weekly goal reminder** (giữa tuần).
  - **Review queue có bài quá hạn** ([[Review-Queue]]).
- Có "Quiet hours" để không bị làm phiền (vd. 22:00 – 7:00).

## Component chính

- [src/app/components/toast-container/toast-container.ts](../../src/app/components/toast-container/toast-container.ts) — container toast global.
- [src/app/components/error-modal/error-modal.ts](../../src/app/components/error-modal/error-modal.ts) — modal lỗi.
- [src/app/components/account-inactive-modal/account-inactive-modal.ts](../../src/app/components/account-inactive-modal/account-inactive-modal.ts).
- [src/app/components/login-warning-modal/login-warning-modal.ts](../../src/app/components/login-warning-modal/login-warning-modal.ts).
- [src/app/components/registration-limit-modal/registration-limit-modal.ts](../../src/app/components/registration-limit-modal/registration-limit-modal.ts).

## Service liên quan

- [services/toast.service.ts](../../src/app/services/toast.service.ts) — push toast.
- [services/modal.service.ts](../../src/app/services/modal.service.ts) — show/hide modal.
- [services/notification.service.ts](../../src/app/services/notification.service.ts) — browser push notification + preferences.

## Liên kết

- **Trigger từ:** [[Achievements]] (unlock toast), [[Translation-Practice]] (error/success), [[Daily-Challenge]], [[Review-Queue]]
- **Phụ thuộc:** [[Storage-Sync]] (lưu preferences), [[Authentication]] (link account ↔ device)
