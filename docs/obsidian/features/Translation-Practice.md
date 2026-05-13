# Translation Practice

> **Tags:** #feature/practice #feature/ai #status/active  
> **Route:** `/exercise/:slug`

## Tổng quan

Tính năng cốt lõi của app: người dùng đọc câu/đoạn tiếng Việt, dịch sang tiếng Anh; AI chấm điểm và đưa phản hồi chi tiết về ngữ pháp, từ vựng, cấu trúc. Có hệ thống gợi ý, phạt điểm khi sai nhiều và phần thưởng khi hoàn thành.

## Trải nghiệm người dùng

1. Đọc câu nguồn tiếng Việt (`sourceText`) — câu khó được highlight (`highlightedSentences`).
2. Nhập bản dịch tiếng Anh vào ô input.
3. (Tuỳ chọn) Bấm **💡 Hint** — tối đa 3 lần, mỗi lần dùng sẽ giảm điểm.
4. **Submit** → AI phân tích từng câu, trả `accuracyScore` 0–100 + `FeedbackItem[]` (grammar/vocabulary/structure/spelling/suggestion).
5. Xem phản hồi từng câu (`SentenceAttempt`) + tổng quan + so sánh với đáp án.
6. Nhận điểm thưởng + có thể trigger huy hiệu mới ([[Achievements]]).
7. Có thể nghe đáp án bằng [[TTS-Audio]] hoặc chuyển sang [[Dictation-Practice]].
8. (Tuỳ chọn) Làm **Comprehension Quiz** (4-5 câu hỏi đa lựa chọn) và xem **Content Summary** (5–8 từ vựng key + main ideas) — xem hệ thống Memory Retention.

## Component chính

- [src/app/components/exercise-detail/](../../src/app/components/exercise-detail/) — trang chính.
- [src/app/components/source-text/source-text.ts](../../src/app/components/source-text/source-text.ts) — hiển thị câu nguồn.
- [src/app/components/translation-input/translation-input.ts](../../src/app/components/translation-input/translation-input.ts) — ô nhập.
- [src/app/components/translation-review/translation-review.ts](../../src/app/components/translation-review/translation-review.ts) — so sánh user vs reference.
- [src/app/components/dictation-feedback/dictation-feedback.ts](../../src/app/components/dictation-feedback/dictation-feedback.ts) — hiển thị `FeedbackItem`.
- [src/app/components/penalty-score/penalty-score.ts](../../src/app/components/penalty-score/penalty-score.ts) — chi tiết điểm bị trừ.
- [src/app/components/api-key-prompt/api-key-prompt.ts](../../src/app/components/api-key-prompt/api-key-prompt.ts) — modal nhập API key nếu chưa có.

## Service liên quan

- [services/exercise.service.ts](../../src/app/services/exercise.service.ts) — load exercise theo slug.
- [services/exercise-validation.service.ts](../../src/app/services/exercise-validation.service.ts) — validate input.
- [services/exercise-penalty.service.ts](../../src/app/services/exercise-penalty.service.ts) — tính `totalPenalty` từ `hintsUsed`, `incorrectAttempts`, `retryCount` (xem [src/app/models/penalty.constants.ts](../../src/app/models/penalty.constants.ts)).
- [services/exercise-submission.service.ts](../../src/app/services/exercise-submission.service.ts) — gửi attempt → progress.
- [services/exercise-keyboard.service.ts](../../src/app/services/exercise-keyboard.service.ts) — phím tắt khi luyện.
- [services/exercise-session-lock.service.ts](../../src/app/services/exercise-session-lock.service.ts) — chống mở 2 tab cùng làm 1 bài (BroadcastChannel).
- [services/progress.service.ts](../../src/app/services/progress.service.ts) — lưu attempt vào `UserProgress.exerciseHistory`.
- **AI:** [services/ai/ai-unified.service.ts](../../src/app/services/ai/ai-unified.service.ts) → [[AI-Providers]].

## Data Model

- `ExerciseAttempt` — `exerciseId`, `attemptNumber`, `userInput`, `accuracyScore`, `pointsEarned`, `hintsUsed`, `sentenceAttempts`, `totalPenalty`.
- `SentenceAttempt` — per-sentence với `accuracyScore`, `feedback: FeedbackItem[]`.
- `FeedbackItem` — `type: 'grammar' | 'vocabulary' | 'structure' | 'spelling' | 'suggestion'`, `originalText`, `suggestion`, `explanation`.
- `AIResponse`, `ExerciseContext`, `AIStreamChunk` — định nghĩa tại [src/app/models/ai.model.ts](../../src/app/models/ai.model.ts).

## Route

- `/exercise/:slug` → `ExerciseDetailComponent` (preload: high)

## Liên kết

- **Vào từ:** [[Exercise-Library]], [[Favorites]], [[Daily-Challenge]], [[Review-Queue]], [[Adaptive-Learning]]
- **Có thể chuyển sang:** [[Dictation-Practice]]
- **Sinh dữ liệu cho:** [[Dashboard-Analytics]], [[Error-Patterns]], [[Spaced-Repetition]]
- **Trigger:** [[Achievements]], [[Daily-Challenge]] (đếm streak), [[Weekly-Goals]]
- **Phụ thuộc nền tảng:** [[AI-Providers]], [[Storage-Sync]], [[TTS-Audio]]
