# Analytics

> **Tags:** #system/analytics #status/active  
> **Pattern:** Multi-provider + Event Queue

## Tổng quan

Hệ thống tracking đa nhà cung cấp + offline-safe. Cấu hình các provider trong `environment.analytics.providers[]`, app boot đăng ký từng provider qua `AnalyticsProviderFactory`. Hỗ trợ:

- **GA4** (Google Analytics 4) — provider mặc định.
- **Internal Analytics** — ghi event vào Supabase Tracking DB.
- **Guest Analytics** — track khách chưa login (privacy-aware).
- **Mixpanel template** — sẵn cấu trúc để bật trong tương lai.

## Kiến trúc

```mermaid
flowchart LR
    Caller[Components / Services<br/>logEvent('exercise_submit', {...})]
    Caller --> AS[AnalyticsService<br/>facade]
    AS --> EQM[EventQueueManager]
    EQM -- online --> GA4P[GA4 Provider]
    EQM -- online --> IntP[Internal Provider]
    EQM -- online --> GuestP[Guest Provider]
    EQM -- offline --> Buffer[(in-memory + localStorage buffer)]
    Buffer -- on online --> EQM

    AS -. registers .- APF[AnalyticsProviderFactory]
    APF --> GA4P
    APF --> IntP
    APF --> GuestP
```

## Files chính

- [services/analytics.service.ts](../../src/app/services/analytics.service.ts) — facade.
- [services/analytics-provider-factory.service.ts](../../src/app/services/analytics-provider-factory.service.ts) — sinh provider theo config.
- [services/ga4-analytics-adapter.service.ts](../../src/app/services/ga4-analytics-adapter.service.ts) — GA4 adapter (`gtag.js`).
- [services/internal-analytics.service.ts](../../src/app/services/internal-analytics.service.ts) — ghi event vào Supabase Tracking DB.
- [services/guest-analytics.service.ts](../../src/app/services/guest-analytics.service.ts) — track khách (anonymized).
- [services/enhanced-analytics.service.ts](../../src/app/services/enhanced-analytics.service.ts) — track nâng cao (heatmap, page performance).
- [services/session-tracking.service.ts](../../src/app/services/session-tracking.service.ts) — session lifecycle.
- [services/retention-tracking.service.ts](../../src/app/services/retention-tracking.service.ts) — cohort/retention.
- [services/event-queue-manager.service.ts](../../src/app/services/event-queue-manager.service.ts) — queue + flush.
- [services/privacy.service.ts](../../src/app/services/privacy.service.ts) — consent + privacy controls.

## Cấu hình

Trong [src/environments/environment.ts](../../src/environments/environment.ts):

```ts
analytics: {
  providers: [
    {
      type: 'ga4',
      enabled: true,
      config: {
        measurementId: 'G-...',
        debugMode: true,
        anonymizeIp: true
      }
    }
    // mixpanel template ở comment
  ]
}
```

Mỗi entry → `AnalyticsProviderFactory.createAndInitialize(config)` → register vào `AnalyticsService`.

## Event categories

- **Exercise events** — `exercise_start`, `exercise_submit`, `exercise_complete`, `hint_used`, `retry_attempt`.
- **Navigation** — `page_view`, `route_change`, `scroll_depth` (qua [directives/scroll-depth-tracker.directive.ts](../../src/app/directives/scroll-depth-tracker.directive.ts)).
- **External link clicks** — qua [directives/external-link-tracker.directive.ts](../../src/app/directives/external-link-tracker.directive.ts).
- **Achievement events** — `achievement_unlock`, `reward_claimed` ([[Achievements]]).
- **Session events** — `session_start`, `session_end`, `idle_detected`.
- **AI events** — `ai_request`, `ai_response_time`, `ai_error` ([[AI-Providers]]).

## Privacy

- `PrivacyService` lưu consent của user.
- Khi user opt-out → `AnalyticsService` ngừng forward sang GA4, vẫn ghi internal (anonymized).
- `anonymizeIp: true` mặc định cho GA4.

## Offline behavior

`EventQueueManager`:
- Lắng nghe `online` / `offline` window events.
- Khi offline: cache event trong buffer (memory + localStorage để persist qua refresh).
- Khi online: flush theo thứ tự — drop event > X ngày tuổi (TTL).

## Tích hợp với feature

- [[Dashboard-Analytics]] **không** dùng GA4 — dùng `UserProgress` (qua [[Storage-Sync]]). Đây là 2 hệ thống tách biệt:
  - Analytics (system này) = telemetry cho developer.
  - Dashboard (feature) = visualisation cho user.
- Internal Analytics có thể fed cho cohort report nội bộ.

## Liên kết

- **Bootstrap:** `provideAppInitializer(initializeAnalytics)` trong `app.config.ts`
- **Sử dụng bởi:** mọi feature (logging)
- **Phụ thuộc:** [[Storage-Sync]] (internal analytics ghi tracking DB)
- **Liên quan:** [[PWA-Offline]] (offline queue)
