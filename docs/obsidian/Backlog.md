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

- [x] **Service Worker (offline-first)** — ✅ shipped 2026-05-13. `@angular/service-worker@20.3.9` cài, `ngsw-config.json` precache app-shell + lazy cache `/data/exercises/**` (200 entries, 30d TTL) + `/data/learning-paths/**`. `provideServiceWorker` registered trong `app.config.ts` (production only, `registerWhenStable:30000`). `SwUpdateService` poll mỗi 30 phút + toast "Có bản cập nhật" khi VERSION_READY. **Scheduled notification từ SW** chuyển thành item riêng phía dưới (cần Periodic Background Sync API — browser support hạn chế).
- [ ] **SW-scheduled notification** (sau Service Worker) — Periodic Background Sync API để SW tự fire notification dù tab đóng. Yêu cầu user "install PWA" + browser support (Chrome/Edge). Hiện tại `NotificationService.scheduleNotifications()` dùng `setTimeout` chỉ chạy khi tab mở.
    - **Effort:** 2–3 ngày.
- [x] **App Settings page** thống nhất — ✅ shipped tại `/settings` ([SettingsPageComponent](../../src/app/components/settings-page/settings-page.ts) + extended [AppSettingsComponent](../../src/app/components/app-settings/app-settings.ts)). Có font size (S/M/L/XL via html class), OpenDyslexic font toggle, high contrast mode, language picker (vi only — en chờ i18n), TTS auto-play, translate feedback, notification toggle + reminder time. AI Provider Config vẫn ở `/profile` (giữ tab Settings) để tránh duplicate.
- [~] **Accessibility — first pass** — ✅ shipped 2026-05-13:
    - Skip-to-content link ([app.html](../../src/app/app.html)) — Tab vào trang thấy ngay link "Bỏ qua menu".
    - Global `:focus-visible` outline cho mọi interactive element.
    - `prefers-reduced-motion` media query — tắt mọi animation/transition cho user OS-level setting.
    - `.sr-only` utility class cho text screen-reader-only.
    - High contrast mode + OpenDyslexic font option đã có sẵn trong `SettingsService` (UI hiện ẩn — toggle `@if (false)` trong app-settings).
- [ ] **Accessibility — deep audit** (tiếp theo) — manual component-by-component review với screen reader (NVDA/VoiceOver). Cần check: ARIA roles, label associations, focus management trong modals, dynamic content announcements, color contrast ratio (WCAG AA 4.5:1). Bật lại Display section trong Settings sau khi audit xong.
    - **Effort:** 3–4 ngày.
- [x] **Multi-language UI — runtime translation** ✅ 2026-05-13
    - `TranslationService` ([translation.service.ts](../../src/app/services/translation.service.ts)) — signal-based dictionary 250+ keys, toggle vi ↔ en tức thì không cần rebuild.
    - **Đã apply translate.t() cho:** Header (tooltips + dropdown + 🌐 lang toggle), Settings page (full), About page (full ~40 strings), Login page (full), Profile page, Achievements page header + empty state, Learning Path tabs + certificates list, Guide page header, 4 modals (account-inactive, registration-limit, error-modal AI suggestion, export-import full), Pronunciation Stats widget (dashboard).
    - **Toggle hoạt động:** click 🌐 ở header → mọi trang đã wire chuyển vi ↔ en tức thì + toast confirm.
    - `@angular/localize@20.3.9` cài sẵn cho future build-time i18n. Vault doc [[i18n-Migration]] giải thích cả 2 cơ chế.
- [x] **i18n — additional page coverage** ✅ 2026-05-13 (wave 2):
    - Pronunciation Practice page (full)
    - Home page (Daily Challenge / Weekly Goal / Continue Learning widgets, level/category section)
    - Learning Path Daily Challenge widget (full)
    - Learning Path Goal Tracker widget (full)
    - Dictionary now has **400+ keys** total (vi + en).
- [ ] **i18n — remaining LP sub-components & dashboard widgets**:
    - Learning Path: Path Selector, Progress Dashboard, Certificate, Exercise List (keys đã có sẵn trong dictionary — chỉ cần apply `{{ translate.t('...') }}`).
    - Dictation overview tooltips (keys ready).
    - Exercise card favorite tooltips (keys ready).
- [ ] **i18n — Surface-level findings (most files already English):**
    - Dashboard widgets (Performance, Vocabulary, Best, Most Practiced, Velocity, Time-of-Day, Weak Areas, Activity Heatmap, Activity Timeline, Recent History, Error Patterns Analysis, Progress Charts, Practice Stats): **all English**, no work.
    - Achievement sub-components (card, detail-modal, filters, notification, showcase): **all English**.
    - Dictation sub-components (header, audio-controls, input, actions, completion, shortcuts): **all English**.
    - TTS Settings, Dictation Settings, AI Provider Config: **all English**.
    - Small components (exercise-card, category-card, level-card, auth-status, api-key-prompt, feedback-panel, etc.): **all English** except 2 favorites tooltips.
    - Custom Exercise Library, Exercise Creator, Flashcard Deck: **mostly English** with some Vietnamese sprinkled.
    - Review Queue, Error Patterns, Favorites: **all English**.
- [ ] **i18n — TS file strings**: toast/alert messages, `confirm()` dialogs, dynamic strings (notification messages). Currently English in most services; Vietnamese in a few (vd. `login.ts` alert, `export-import-modal.ts` success/error messages). **Effort:** 1 ngày.
- [ ] **i18n — Achievement model strings** (`achievement.model.ts` có hardcoded English `name`/`description` cho 60+ achievement) — quyết định: giữ English tất cả, hoặc dịch sang Vietnamese qua dictionary key `achievement.<id>.name`. **Effort:** 1 ngày.
- [ ] **i18n — Route SEO data** (`app.routes.ts` có title/description/keywords hardcoded Vietnamese trong `route.data.seo`). Cần Router event listener gọi `SeoService.updateTags` với keys translated. **Effort:** 0.5 ngày.

**Pattern apply cho component còn (nếu có Vietnamese):**
1. `import { TranslationService } from '../../services/translation.service'` (path tuỳ depth)
2. `protected translate = inject(TranslationService)` trong constructor field block
3. HTML: thay literal Vietnamese bằng `{{ translate.t('key') }}` hoặc `[attr.something]="translate.t('key')"`
4. Dictionary mới: thêm vào cả `vi:` và `en:` block trong `translation.service.ts`
- [ ] **i18n — Achievement model strings** (`achievement.model.ts` có hardcoded English `name`/`description` cho 60+ achievement) — quyết định: giữ English tất cả, hoặc dịch sang Vietnamese qua dictionary key `achievement.<id>.name`. **Effort:** 1 ngày.
- [ ] **i18n — Route SEO data** (`app.routes.ts` có title/description/keywords hardcoded Vietnamese trong `route.data.seo`). Cần Router event listener gọi `SeoService.updateTags` với keys translated. **Effort:** 0.5 ngày.

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
