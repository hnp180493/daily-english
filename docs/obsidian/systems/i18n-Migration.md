# i18n Migration Pattern

> **Tags:** #system/i18n #status/foundation-ready  
> **Trạng thái:** Infrastructure đã setup. Translation work để làm dần theo từng feature.

## Tổng quan

Project có **hai cơ chế translation song song**:

1. **`TranslationService`** ([services/translation.service.ts](../../src/app/services/translation.service.ts)) — **runtime** translation dùng signal-based dictionary. Toggle vi ↔ en tức thì không cần rebuild. Hiện apply cho header, settings, toasts. **Đây là cơ chế chính** trong giai đoạn migration.
2. **`@angular/localize`** — build-time translation hệ thống cho khi cần deploy `/vi/` và `/en/` bundle riêng (vd. SEO English market). Infra đã setup nhưng chưa active.

Lý do dùng cả hai: runtime translation cho phép user toggle ngay lập tức và đỡ phức tạp deploy. Build-time `@angular/localize` để sau, khi dictionary đã đủ lớn và muốn tối ưu bundle size + SEO.

## Infrastructure đã có

- ✅ `@angular/localize@20.3.9` cài trong dependencies.
- ✅ `import '@angular/localize/init';` trong [src/main.ts](../../src/main.ts).
- ✅ Config `i18n` block trong [angular.json](../../angular.json):
  - `sourceLocale: vi` (Vietnamese)
  - `locales.en` → `src/locale/messages.en.xlf`, baseHref `/en/`.
- ✅ Placeholder [src/locale/messages.en.xlf](../../src/locale/messages.en.xlf).
- ✅ npm script `npm run extract-i18n` chạy `ng extract-i18n --output-path src/locale --format=xlf`.
- ✅ POC: [app-settings.html](../../src/app/components/app-settings/app-settings.html) đã mark `i18n="@@settings.title"` trên `<h2>` làm ví dụ.

## Quy trình migrate 1 component

### Bước 1 — Mark up template với `i18n` attribute

**Element text:**
```html
<h2 i18n="@@settings.title">⚙️ Cài đặt ứng dụng</h2>
```

**Attribute (vd. title, aria-label):**
```html
<button i18n-aria-label="@@settings.reset.aria"
        aria-label="Đặt lại cài đặt mặc định">
  ...
</button>
```

**Interpolation:**
```html
<span i18n="@@dashboard.streakCount">Streak: {{ streak }} ngày</span>
```

**Plurals & select** (ICU syntax):
```html
<span i18n="@@dashboard.attempts">
  {count, plural, =0 {Chưa làm bài nào} =1 {1 bài đã làm} other {{{count}} bài đã làm}}
</span>
```

### Bước 2 — Mark up TypeScript strings (vd. toast messages)

Thay literal string bằng `$localize` template literal:
```ts
// Before:
this.toast.success('Đã lưu cài đặt');

// After:
this.toast.success($localize`:@@settings.saved:Đã lưu cài đặt`);
```

### Bước 3 — Extract messages

```bash
npm run extract-i18n
```

Sinh `src/locale/messages.xlf` chứa mọi `i18n` đã mark. Mỗi entry có `id` (vd. `settings.title`), `source` (Vietnamese), không có `target`.

### Bước 4 — Tạo bản dịch English

Copy `messages.xlf` thành `src/locale/messages.en.xlf` và thêm `<target>` cho mỗi entry:

```xml
<trans-unit id="settings.title">
  <source>⚙️ Cài đặt ứng dụng</source>
  <target>⚙️ App Settings</target>
</trans-unit>
```

Có thể dùng AI (Claude/GPT) hoặc tool như Lokalise/Crowdin để bulk-translate.

### Bước 5 — Build với i18n

```bash
ng build --localize
```

Output:
- `dist/daily-english/browser/vi/` — Vietnamese bundle (default)
- `dist/daily-english/browser/en/` — English bundle

Deploy: server cần serve `/vi/` và `/en/` paths đúng `baseHref`.

### Bước 6 — Switch locale runtime

Angular i18n là **build-time** — không thể runtime switch giữa locale. User chuyển locale = redirect sang URL có `/en/` prefix:

```ts
// SettingsService.setUILanguage
window.location.href = '/en' + window.location.pathname;
```

## Migration strategy đề xuất

Vì marking up hàng nghìn strings tốn thời gian, làm dần:

1. **Phase i18n-A — Core navigation (1 ngày):** header, footer, breadcrumbs, modals nền tảng.
2. **Phase i18n-B — Settings + Profile (1 ngày):** [[App-Overview]] settings, account, language switcher chính thức.
3. **Phase i18n-C — Public pages (2 ngày):** about, guide, login — quan trọng cho SEO English market.
4. **Phase i18n-D — Practice flow (2 ngày):** [[Exercise-Library]], [[Translation-Practice]], [[Dictation-Practice]], [[Pronunciation-Practice]].
5. **Phase i18n-E — Dashboard & analytics (1 ngày):** widgets, charts labels.
6. **Phase i18n-F — Achievements + gamification (1 ngày):** 60+ achievement strings.

Total: ~8 ngày dev + ~2 ngày translation review.

## Lưu ý quan trọng

- **Date/number formatting:** dùng `DatePipe`, `DecimalPipe`, `CurrencyPipe` với `LOCALE_ID` token — Angular tự handle theo locale.
- **AI prompts (PromptService):** giữ tiếng Anh (instruction cho AI), không cần i18n.
- **Vietnamese SEO infra** ([[SEO]]) đã có `hreflang` template — cần update sau khi có English bundle để Google index đúng cặp.
- **Achievements** ([src/app/models/achievement.model.ts](../../src/app/models/achievement.model.ts)) — các achievement `name`/`description` hiện hardcoded tiếng Anh. Hoặc dịch sang tiếng Việt qua i18n, hoặc giữ tiếng Anh tất cả.

## Liên kết

- [[SEO]] — hreflang setup
- [[App-Overview]] — Settings language picker (hiện disabled cho English)
- [[Backlog]] — i18n trong Phase 1
