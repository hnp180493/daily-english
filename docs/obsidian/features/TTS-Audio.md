# TTS / Audio

> **Tags:** #feature/audio #status/active  
> **Service:** `TtsService` (Web Speech API)

## Tổng quan

Text-to-Speech đọc bản dịch tiếng Anh. Dùng **Web Speech API** của trình duyệt (`speechSynthesis`), không gọi backend. Hỗ trợ chọn voice / accent, điều chỉnh tốc độ, autoplay.

## Trải nghiệm người dùng

1. Trong [[Translation-Practice]]: sau khi submit, bấm **🔊 Play** để nghe phát âm đáp án.
2. Trong [[Dictation-Practice]]: TTS đọc câu để gõ chính tả lại.
3. Vào **Settings → TTS** (modal `tts-settings`):
   - Chọn voice / accent (theo voice list browser hỗ trợ).
   - Speed (0.5x – 2.0x).
   - Autoplay sau submit (on/off).
   - Pitch.

## Component chính

- [src/app/components/tts-settings/tts-settings.ts](../../src/app/components/tts-settings/tts-settings.ts) — modal cài đặt.
- Tích hợp trong [src/app/components/source-text/](../../src/app/components/source-text/), [src/app/components/dictation-practice/](../../src/app/components/dictation-practice/), [src/app/components/translation-review/](../../src/app/components/translation-review/).

## Service liên quan

- [services/tts.service.ts](../../src/app/services/tts.service.ts) — wrapper Web Speech API. Cung cấp `speak(text, options)`, `pause()`, `resume()`, `cancel()`, `getVoices()`.
- [services/settings.service.ts](../../src/app/services/settings.service.ts) — lưu preference TTS vào storage.

## Lưu ý kỹ thuật

- Web Speech API **chỉ chạy client** — không tốn budget, không cần API key.
- Voice list phụ thuộc OS/browser; trên Chrome có voice cloud miễn phí; trên Safari/Firefox voice nội bộ.
- Một số mobile browser yêu cầu user interaction trước khi `speechSynthesis.speak()` chạy (vì policy autoplay).

## Liên kết

- **Tiêu thụ bởi:** [[Translation-Practice]], [[Dictation-Practice]]
- **Cấu hình:** lưu trong app settings ([[Storage-Sync]] qua `SettingsService`)
