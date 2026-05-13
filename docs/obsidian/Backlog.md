# Backlog & Plan

> **Tags:** #planning #backlog  
> **Cập nhật:** 2026-05-13  
> **Định dạng:** mỗi mục là một checkbox Obsidian. Tích `- [x]` khi hoàn thành.

## ⚠️ Ràng buộc kiến trúc

Project này **FE-only**. Không có custom backend (Node/Python/Edge Functions). Chỉ dùng:

- ✅ **Supabase BaaS** (Auth + Postgres + Realtime + RLS) gọi trực tiếp từ browser — xem [[Storage-Sync]].
- ✅ **User-supplied API key** cho dịch vụ AI / 3rd-party (pattern [[AI-Providers]] hiện có): user nhập key, lưu `localStorage`, browser gọi trực tiếp.
- ✅ **Static JSON / asset** trong `public/data/...`.
- ✅ **Browser APIs**: Web Speech, Service Worker (local logic), Notification API (scheduled local), `BroadcastChannel`, IndexedDB, html2canvas.

Mọi feature nào cần server-side logic (custom moderation, push notification từ server, CORS proxy, multi-tenant role enforcement) → **không** đưa vào backlog này.

## Bối cảnh

- [docs/FEATURE_ROADMAP.md](../FEATURE_ROADMAP.md) là roadmap cũ với 12 hạng mục.
- **Đã làm xong** 6/10 hạng mục lớn: Dashboard ([[Dashboard-Analytics]]), Achievements ([[Achievements]]), Smart Review ([[Review-Queue]] + [[Spaced-Repetition]]), Learning Path ([[Learning-Path]] + [[Daily-Challenge]] + [[Weekly-Goals]]), Custom Exercises ([[Custom-Exercises]]), Vocabulary Builder ([[Flashcards]]).
- File này gom **phần còn lại của roadmap** + **ý tưởng mới**, đã lọc theo ràng buộc FE-only.

---

## 🚀 Quick Wins (1–3 ngày/mục)

> Leverage code có sẵn, ít rủi ro, value cao. Tất cả 100% client-side.

- [ ] **Share Achievement Image** — sinh ảnh PNG để share Facebook/Zalo khi unlock huy hiệu. Dùng [`html2canvas`](../../package.json) đã có trong deps. Liên kết [[Achievements]].
- [ ] **Dark Mode toggle** chính thức — hiện theme là reward, cần switch ngay trong header (persist localStorage).
- [ ] **Keyboard Shortcuts cheatsheet** — modal hiện tất cả phím tắt từ `exercise-keyboard.service.ts`. Trigger qua `?` hoặc `Ctrl+/`.
- [ ] **Print-friendly progress report** — CSS print stylesheet cho [[Dashboard-Analytics]], có thể in/PDF.
- [ ] **Streak warning local notification** — Notification API + setTimeout/setInterval (hoặc Service Worker scheduled) cảnh báo khi gần mất streak. **Lưu ý:** chỉ local — không có server push, nên chỉ hoạt động khi tab/PWA đang chạy hoặc Service Worker còn active. Liên kết [[Daily-Challenge]], [[Notifications]].

---

## 📦 Phase 1 — Hạ tầng & Personalization (1–2 tuần)

- [ ] **Service Worker (offline-first)** — `@angular/service-worker`. Phạm vi FE-only:
    - ✅ Precache app shell + static exercise JSON cho offline thật.
    - ✅ Background sync flush event queue ([[Analytics]], [[Storage-Sync]]) khi online lại.
    - ✅ **Local scheduled notification** (Service Worker tự trigger theo thời gian đã lưu — vd. nhắc streak lúc 21h).
    - ❌ **Bỏ:** push notification từ server (cần BE để push).
    - **Effort:** 3–4 ngày. **Phụ thuộc:** [[PWA-Offline]].
- [ ] **App Settings page** thống nhất — gom: theme picker, font size (S/M/L/XL), AI provider switch, TTS preferences, notification toggle, language UI. Hiện rải rác qua nhiều modal.
    - **Effort:** 3 ngày. **Phụ thuộc:** [[AI-Providers]], [[TTS-Audio]], [[Notifications]].
- [ ] **Accessibility audit + fix** — ARIA labels, keyboard nav full app, high contrast mode, dyslexia-friendly font option (OpenDyslexic). Test với screen reader.
    - **Effort:** 4–5 ngày.
- [ ] **Multi-language UI (i18n)** — hiện 100% Vietnamese hardcoded. Tách qua `@angular/localize` để thêm English UI (giữ tài liệu vẫn tiếng Việt). Liên kết [[SEO]] (hreflang đã sẵn).
    - **Effort:** 5–7 ngày. Pure FE.

---

## 🎤 Phase 2 — Mở rộng kỹ năng (3–4 tuần)

- [x] **Speaking Practice MVP** (Tier 2 — Gemini multimodal audio) — ✅ shipped 2026-05-13 as Beta. Xem [[Pronunciation-Practice]]. Record audio FE-only, gửi qua Gemini provider hiện có, không thêm AI provider mới.
- [ ] **Speaking Practice — Tier 1 fallback** (Web Speech API word-level) — cho user không dùng Gemini, transcribe + so text. Bổ sung khi muốn mở rộng provider support cho [[Pronunciation-Practice]].
    - **Effort:** 2–3 ngày.
- [ ] **Speaking Practice — audio input cho các provider khác** (GPT-4o-audio qua OpenAI/Azure/OpenRouter). Hiện base `analyzePronunciation` throw "not supported" cho 3 provider này.
    - **Effort:** 2–3 ngày/provider.
- [ ] **Phoneme-level Pronunciation** (nâng cấp Speaking) — Azure Speech / Google Speech với phoneme scoring. **Chỉ làm theo pattern user-supplied key** (giống [[AI-Providers]]) — user nhập key của mình, browser gọi trực tiếp service. Không proxy qua app.
    - **Effort:** +5–7 ngày sau Speaking MVP.
- [ ] **Grammar Lessons UI** — model `GrammarLesson` đã định nghĩa trong [src/app/models/review.model.ts](../../src/app/models/review.model.ts) nhưng chưa có UI. Content là **static JSON** trong `public/data/grammar-lessons/`. Sinh bài giảng theo `ErrorPattern` user hay mắc. Vòng lặp: [[Error-Patterns]] → Grammar Lesson → quay lại [[Review-Queue]].
    - **Effort:** 4–6 ngày. Pure FE (content tĩnh).
- [ ] **Reading Comprehension** — bài đọc dài hơn câu/đoạn (300–500 từ) + 4-5 câu quiz hiểu nghĩa. Tách route `/reading/:slug`. Content static JSON giống [[Exercise-Library]].
    - **Effort:** 5–7 ngày.
- [ ] **Writing Practice** — viết essay tự do, AI chấm theo rubric (grammar, vocabulary, coherence, task achievement — kiểu IELTS Writing Task 2). Dùng [[AI-Providers]] sẵn có với prompt mới.
    - **Effort:** 7–10 ngày.
- [ ] **Listening Comprehension nâng cao** — clip podcast/news ngắn + quiz. Audio file host trong `public/audio/` (static) hoặc Supabase Storage. Khác [[Dictation-Practice]]: không gõ lại từng câu, mà nghe hiểu nội dung.
    - **Effort:** 5–7 ngày.

---

## 🤖 Phase 3 — AI nâng cao (2–3 tuần)

- [ ] **AI Tutor Chat** — chatbot persistent ở góc app ("giải thích tense này", "khác nhau giữa A và B"). Có context theo bài đang làm. Lịch sử chat lưu local hoặc Supabase qua [[Storage-Sync]].
    - **Effort:** 7–10 ngày. **Phụ thuộc:** [[AI-Providers]] (streaming).
- [ ] **AI exercise generation từ paste text** — paste **text** (không phải URL — tránh CORS) của bài báo/đoạn văn → AI rút trích đoạn + sinh `Exercise` (mở rộng [services/ai/exercise-generator.service.ts](../../src/app/services/ai/exercise-generator.service.ts) hiện tại). Lưu thành [[Custom-Exercises]]. **Lưu ý:** không hỗ trợ fetch URL trực tiếp vì cần CORS proxy.
    - **Effort:** 3–4 ngày.
- [ ] **Adaptive Difficulty Auto-Calibration** — hiện [[Adaptive-Learning]] đề xuất bài, chưa tự điều chỉnh độ khó câu trong bài. Có thể auto-skip câu quá dễ với user mạnh. Logic chạy client-side.
    - **Effort:** 4–5 ngày.

---

## 🌐 Phase 4 — Mở rộng cá nhân hoá (3–4 tuần)

> Đã loại bỏ Community Features (forum/vote/peer review) và Teacher Tools vì yêu cầu BE (moderation, multi-tenant, role-based logic, real-time chat scale).

- [ ] **Placement Test** khi onboarding — 10–15 câu adaptive để chốt level. Hiện user phải tự chọn. Logic chạy client-side.
    - **Effort:** 3–4 ngày.
- [ ] **Browser Extension** (Chrome / Edge / Firefox / Cốc Cốc) — highlight bất kỳ câu nào trên web → "Practice this sentence" → sinh bài. Extension gọi AI provider trực tiếp với key user (như app chính). Liên kết [[Custom-Exercises]].
    - **Effort:** 10–12 ngày. Pure FE (extension code).
- [ ] **Anki / Quizlet integration** — export [[Flashcards]] sang `.apkg` (Anki) và CSV (Quizlet) bằng JS library client-side. Import file vào app cũng client-side parse.
    - **Effort:** 3–4 ngày.
- [ ] **Notes / Annotations per sentence** — user gõ ghi chú riêng trên câu đã làm, hiện trong `exercise-history` và xem lại trong [[Review-Queue]]. Lưu Supabase qua RLS.
    - **Effort:** 3 ngày.
- [ ] **Voice synthesis chất lượng cao** — tích hợp ElevenLabs / Azure Neural TTS theo pattern user-supplied key. User nhập key của mình → browser gọi trực tiếp service. Liên kết [[TTS-Audio]].
    - **Effort:** 3–4 ngày.
- [ ] **Daily-Challenge editor** — cho phép user "thiết kế" challenge theo sở thích (vd. "tuần này chỉ category travel"). Pure FE config.
    - **Effort:** 2 ngày.

---

## ❌ Đã loại khỏi backlog (cần BE)

Để minh bạch — các ý tưởng sau **đã cân nhắc nhưng loại** do vi phạm ràng buộc FE-only:

- **Community Features** (forum / peer review / vote / follow / activity feed) — cần BE để moderation, anti-abuse, real-time chat scale, content filtering. Supabase + RLS không đủ ở scale công khai.
- **Teacher / Classroom Tools** — cần multi-tenant role-based logic phức tạp, grading engine, report generator. Quá phụ thuộc BE.
- **Push notification từ server** — cần endpoint nhận subscription + server scheduler. Chỉ làm **local scheduled notification** thay thế (xem Quick Wins + Phase 1).
- **AI exercise generation từ URL** — fetch external URL từ browser bị CORS chặn. Thay bằng "paste text" (xem Phase 3).
- **Hosted premium AI** (app pay cho AI thay user) — cần BE proxy để giấu API key. Giữ pattern user-supplied key như hiện có.

---

## 📊 Ma trận ưu tiên (Impact × Effort)

| Hạng mục | Impact | Effort | Phase |
|---|---|---|---|
| Service Worker (offline-first) | 🔴 Cao | 🟡 Trung | 1 |
| Speaking Practice MVP | 🔴 Cao | 🟠 Lớn | 2 |
| Grammar Lessons UI | 🟠 Trung-cao | 🟢 Nhỏ | 2 |
| Writing Practice | 🟠 Trung-cao | 🟠 Lớn | 2 |
| AI Tutor Chat | 🔴 Cao | 🟠 Lớn | 3 |
| Placement Test | 🟠 Trung-cao | 🟢 Nhỏ | 4 |
| Browser Extension | 🟡 Trung | 🟠 Lớn | 4 |
| Quick Wins (5 mục) | 🟠 Trung | 🟢 Rất nhỏ | bất cứ lúc nào |

---

## 🔁 Cách dùng file này

1. Khi bắt đầu sprint mới: chọn 1–3 mục từ phase ưu tiên hiện tại.
2. Khi xong: tích `- [x]`, ghi commit hash hoặc PR link bên cạnh.
3. Khi có ý tưởng mới: kiểm tra ràng buộc FE-only ở đầu file trước khi thêm vào.
4. Mỗi quý: review lại priority matrix, di chuyển mục giữa các phase.

## Liên kết

- **Tham chiếu cũ:** [docs/FEATURE_ROADMAP.md](../FEATURE_ROADMAP.md)
- **Hub vault:** [[Home]]
- **Hệ thống tham chiếu nhiều nhất:** [[AI-Providers]], [[Storage-Sync]], [[PWA-Offline]]
