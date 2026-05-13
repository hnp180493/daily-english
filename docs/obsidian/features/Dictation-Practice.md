# Dictation Practice

> **Tags:** #feature/practice #feature/listening #status/active  
> **Route:** `/exercises/:id/dictation`

## Tổng quan

Sau khi hoàn thành [[Translation-Practice]], người dùng có thể luyện nghe chính tả bản dịch tiếng Anh: app đọc câu (TTS), người dùng gõ lại, hệ thống tính độ chính xác ký tự/từ.

## Trải nghiệm người dùng

1. Vào từ trang [[Translation-Practice]] (sau khi đã dịch xong).
2. Bấm **▶ Play** — TTS đọc câu (có thể chỉnh tốc độ).
3. Gõ lại câu vào ô input.
4. **Submit** → so sánh từng ký tự/từ, hiển thị `differences: TextDifference[]` (match / insert / delete / replace) và `MistakeCategory` (missingWords, extraWords, misspelledWords).
5. Xem `characterAccuracy` + `wordAccuracy`, có thể thử lại.
6. Hoàn thành tất cả câu → `DictationPracticeAttempt` lưu vào `UserProgress.dictationHistory`.

## Component chính

- [src/app/components/dictation-practice/](../../src/app/components/dictation-practice/) — trang chính + subcomponents (audio-controls, input, feedback, header, actions, completion, shortcuts).
- [src/app/components/dictation-feedback/dictation-feedback.ts](../../src/app/components/dictation-feedback/dictation-feedback.ts) — phản hồi chính tả.
- [src/app/components/dictation-settings/dictation-settings.ts](../../src/app/components/dictation-settings/dictation-settings.ts) — tốc độ playback, accent.
- [src/app/components/tts-settings/tts-settings.ts](../../src/app/components/tts-settings/tts-settings.ts) — cấu hình TTS chung.

## Service liên quan

- [services/dictation-practice.service.ts](../../src/app/services/dictation-practice.service.ts) — workflow chính.
- [services/dictation-settings.service.ts](../../src/app/services/dictation-settings.service.ts) — preferences.
- [services/tts.service.ts](../../src/app/services/tts.service.ts) — phát âm (Web Speech API) — xem [[TTS-Audio]].

## Data Model

- `DictationSentence` — `original`, `userInput`, `isCompleted`, `accuracyScore`, `attempts`, `feedback`.
- `DictationFeedback` — `differences: TextDifference[]`, `characterAccuracy`, `wordAccuracy`, `mistakes: MistakeCategory`.
- `DictationPracticeAttempt` — `exerciseId`, `translatedText`, `sentenceAttempts`, `overallAccuracy`, `timeSpent`, `playbackSpeed`.
- `MistakeCategory` — `missingWords`, `extraWords`, `misspelledWords`.

Định nghĩa: [src/app/models/dictation.model.ts](../../src/app/models/dictation.model.ts).

## Route

- `/exercises/:id/dictation` → `DictationPracticeComponent` (noindex)

## Liên kết

- **Vào từ:** [[Translation-Practice]]
- **Phụ thuộc:** [[TTS-Audio]], [[Storage-Sync]]
- **Sinh dữ liệu cho:** [[Dashboard-Analytics]] (qua `dictation-stats-widget`)
