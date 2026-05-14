# Pronunciation Practice

> **Tags:** #feature/practice #feature/speaking #status/beta  
> **Route:** `/exercises/:id/pronunciation` (mở cho tất cả user — không còn beta gate)

## Tổng quan

Tính năng **Beta** giúp người dùng luyện phát âm: đọc to câu tiếng Anh từ bài tập, microphone ghi âm, AI multimodal (Gemini 2.5) "nghe" rồi trả phản hồi định tính chi tiết — score tổng + điểm mạnh + lỗi phổ biến + nhận xét từng từ. Hoàn toàn FE-only, dùng user-supplied AI key.

## Trải nghiệm người dùng

1. Vào trang [[Translation-Practice]] (`/exercise/:slug`).
2. Bấm nút **🎙 Phát âm BETA** ở header (chỉ hiện với beta tester).
3. Vào `/exercises/:id/pronunciation`:
   - Câu hiện tại hiển thị to ở giữa.
   - Bấm 🔊 **Nghe mẫu** để TTS đọc trước (xem [[TTS-Audio]]).
   - Bấm 🎤 micro lớn → trình duyệt xin quyền micro → bắt đầu ghi.
   - Bấm lại để dừng (auto-stop sau 30s).
   - Nghe lại bản ghi qua `<audio>` player.
4. Bấm **✨ Phân tích phát âm** → AI trả `PronunciationFeedback`:
   - `overallScore` 0–100.
   - `rawFeedback` — 2-3 câu nhận xét tiếng Việt.
   - `strengths` — bullet điểm tốt.
   - `pronunciationIssues` — bullet lỗi cần sửa (focus Vietnamese-English contrast).
   - `perWordFeedback` — chip màu xanh/đỏ từng từ, hover thấy issue.
5. Bấm **🔁 Thử lại** hoặc **Câu tiếp theo →**.

## Component chính

- [src/app/components/pronunciation-practice/pronunciation-practice.ts](../../src/app/components/pronunciation-practice/pronunciation-practice.ts) — trang chính (standalone component, signal-based).
- [src/app/components/pronunciation-practice/pronunciation-practice.html](../../src/app/components/pronunciation-practice/pronunciation-practice.html) — template với @if/@for control flow.
- [src/app/components/exercise-detail/exercise-detail.html](../../src/app/components/exercise-detail/exercise-detail.html) — entry button (gated `isPronunciationEnabled`).

## Service liên quan

- [services/pronunciation/pronunciation-practice.service.ts](../../src/app/services/pronunciation/pronunciation-practice.service.ts) — facade: tách câu, build context, gọi AI.
- [services/pronunciation/audio-recorder.service.ts](../../src/app/services/pronunciation/audio-recorder.service.ts) — wrapper `MediaRecorder` với signal-based state (`idle | requesting | recording | stopped | error`), auto-stop 30s, MIME negotiation (webm/opus → mp4 fallback).
- [services/ai/ai-unified.service.ts](../../src/app/services/ai/ai-unified.service.ts) — entry point `analyzePronunciation(blob, context)` + `supportsAudioInput()`.
- [services/ai/providers/gemini.provider.ts](../../src/app/services/ai/providers/gemini.provider.ts) — provider duy nhất hiện implement audio input (`inlineData` part trong Gemini API).
- [services/ai/base-ai-provider.ts](../../src/app/services/ai/base-ai-provider.ts) — base `analyzePronunciation()` throws → các provider khác inherit lỗi "not supported".
- [services/ai/prompt.service.ts](../../src/app/services/ai/prompt.service.ts) — `buildPronunciationPrompt(context)` với focus Vietnamese-English contrast (/θ/, /ð/, ending consonants, /r/ vs /l/).
- [services/feature-flag.service.ts](../../src/app/services/feature-flag.service.ts) — `isPronunciationPracticeEnabled` computed signal.

## Data Model

- `PronunciationContext` — `level`, `expectedText`, `translatedFromVietnamese?`.
- `PronunciationFeedback` — `overallScore`, `rawFeedback`, `pronunciationIssues[]`, `strengths[]`, `perWordFeedback?: WordFeedback[]`.
- `WordFeedback` — `word`, `ok: boolean`, `issue?: string`.
- `PronunciationAttempt` — `exerciseId`, `sentenceIndex`, `expectedText`, `feedback`, `durationMs`, `timestamp`.
- `PRONUNCIATION_DEFAULTS` — `MAX_RECORDING_MS=30000`, `MIN_RECORDING_MS=500`, `AUDIO_MIME_PREFERRED='audio/webm;codecs=opus'`.

Định nghĩa: [src/app/models/pronunciation.model.ts](../../src/app/models/pronunciation.model.ts).

## Yêu cầu để hoạt động

1. **Mở cho mọi user** (đã đăng nhập hoặc khách). Nhãn "BETA" trong UI chỉ chất lượng tính năng, không gate access.
2. **Trình duyệt hỗ trợ MediaRecorder:** Chrome / Edge / Safari mới nhất.
3. **Cấp quyền micro** khi prompted.
4. **AI provider hỗ trợ audio input:** hiện chỉ **Gemini** (2.5 Pro hoặc 2.5 Flash). Component hiển thị warning nếu provider active không support — gợi ý chuyển sang Gemini trong Profile.

> `FeatureFlagService.isPronunciationPracticeEnabled` vẫn tồn tại như một toggle — hiện return `true`. Để tắt tính năng cho mọi người (vd. khi Gemini bị down), đổi lại thành `false`.

## Persistence & Stats

- **Persistence:** Mỗi `PronunciationAttempt` (sau khi AI trả feedback) được `PronunciationPracticeService.saveAttempt()` push vào `UserProgress.pronunciationAttempts` qua `ProgressService.recordPronunciationAttempt()`. Lưu local (guest) hoặc Supabase (auth) qua [[Storage-Sync]]. Cap **500 attempts** gần nhất (oldest dropped).
- **Compression:** `ProgressCompressor.compressPronunciationAttempts` → field `pa` trong JSON Supabase với short keys (`e`, `i`, `x`, `t`, `d`, `s`, `r`, `is`, `st`, `w`).
- **Aggregator:** [services/pronunciation/pronunciation-aggregator.service.ts](../../src/app/services/pronunciation/pronunciation-aggregator.service.ts) gom attempts thành `PronunciationStats`. **Hai chế độ tính:**
  - **All-time** (toàn lịch sử): `averageScore`, `bestScore`, `totalAttempts`, `uniqueExercises`, `scoreTrend` (30 lượt cuối), `attemptsByDay` (30 ngày). Mục đích: thấy hành trình tiến bộ.
  - **Latest-attempt-wins** (chỉ lượt mới nhất mỗi `(exerciseId, sentenceIndex)`): `topMispronouncedWords` (top 8 với errorCount/totalCount/errorRate), `topIssues` (gom theo 8 phoneme bucket + "other"). Khi user fix một từ, lượt mới với `ok=true` ghi đè lượt cũ → từ tự động biến mất khỏi "Từ hay sai". Helper: `latestPerSentence()`.
- **Widget:** [components/dashboard/pronunciation-stats/](../../src/app/components/dashboard/pronunciation-stats/) hiển thị tại tab Overview của [[Dashboard-Analytics]] khi user là beta tester hoặc đã có attempts.

## 3-tier pronunciation pipeline (2026-05-14)

**Tier 1 — Web Speech (fallback).** Khi AI provider không support audio (OpenAI/Azure/OpenRouter với non-audio model) AND browser hỗ trợ `SpeechRecognition`: dùng `webkitSpeechRecognition` để transcribe live, [WebSpeechAnalyzerService](../../src/app/services/pronunciation/web-speech-analyzer.service.ts) so transcript ↔ expected qua Needleman-Wunsch alignment + Levenshtein soft-match. Chỉ chấm **cấp độ từ** (đúng/sai/thiếu), không phoneme. Free, không cần API key.

**Tier 2 — AI multimodal (default).** Send WAV/webm audio đến Gemini 2.5 / GPT-4o-audio-preview qua existing provider system (Gemini, OpenAI, Azure OpenAI, OpenRouter). Trả qualitative feedback (overall score 0-100, per-word ok/issue, strengths, issues). **Tất cả 4 provider chat đều support** (Gemini via inlineData, 3 còn lại via OpenAI `input_audio` modality + [AudioConverterService](../../src/app/services/pronunciation/audio-converter.service.ts) chuyển webm → WAV 16kHz mono PCM client-side).

**Tier 3 — Azure Speech Pronunciation Assessment (opt-in).** User nhập Azure Speech key + region (lưu localStorage, separate khỏi `aiConfig`). [AzureSpeechPronunciationService](../../src/app/services/pronunciation/azure-speech-pronunciation.service.ts) POST WAV trực tiếp đến `{region}.stt.speech.microsoft.com` với `Pronunciation-Assessment` header (GradingSystem=HundredMark, Granularity=Phoneme, Dimension=Comprehensive). Trả 4 sub-scores (Pron/Accuracy/Fluency/Completeness) + phoneme-level scores per word. Có 2 modes: standalone (`assessPhonemes`) hoặc enrich AI feedback đã có (`enrichWithPhonemes`).

Field mới trong `PronunciationFeedback.phoneme?: PhonemeAssessment` để chứa Tier 3 data — backward-compatible.

## Giới hạn

- Audio không upload anywhere ngoài API provider call → privacy OK.
- Audio blob **không** lưu — chỉ lưu feedback text + per-word array + phoneme array (nếu có).
- Tier 3 cần Azure Speech account (free tier 5h/tháng đủ cho luyện cá nhân).
- Web Speech Tier 1 không support trên Firefox.

## Route

- `/exercises/:id/pronunciation` → `PronunciationPracticeComponent` (canActivate: `betaFeatureGuard`, noindex)

## Liên kết

- **Vào từ:** [[Translation-Practice]] (header button)
- **Phụ thuộc nền tảng:** [[AI-Providers]] (cần Gemini), [[TTS-Audio]] (nghe mẫu), [[Authentication]] (beta gate qua email)
- **Liên quan kỹ năng:** [[Dictation-Practice]] (luyện nghe — ngược chiều), [[Translation-Practice]] (luyện viết)
- **Backlog liên quan:** [[Backlog]] (Speaking Practice MVP — Tier 1 Web Speech vẫn pending, Tier 3 phoneme score pending)
