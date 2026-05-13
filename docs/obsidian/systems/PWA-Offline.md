# PWA / Offline

> **Tags:** #system/pwa #system/offline #status/active

## Tổng quan

App là **Progressive Web App** (PWA) — có thể "Add to home screen" trên mobile, chạy fullscreen, có icon. Hệ thống offline gồm:
- **PWA manifest** với shortcuts.
- **Offline event queue** cho [[Analytics]].
- **localStorage fallback** cho [[Storage-Sync]] khi không có mạng.
- **HTTP cache interceptor** cho data JSON tĩnh.
- **Session lock** chống xung đột giữa nhiều tab.

## PWA Manifest

[public/manifest.json](../../public/manifest.json):

```json
{
  "name": "Daily English - Học tiếng Anh với AI",
  "short_name": "Daily English",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#1F2937",
  "theme_color": "#4F46E5",
  "orientation": "portrait-primary",
  "lang": "vi",
  "categories": ["education", "productivity"],
  "shortcuts": [
    { "name": "Bài tập", "url": "/exercises" },
    { "name": "Lộ trình học tập", "url": "/learning-path" }
  ]
}
```

## Offline data strategy

| Tài nguyên | Chiến lược |
|---|---|
| Static exercises JSON (`public/data/exercises/...`) | HTTP cache qua `cache.interceptor.ts` — lần đầu fetch, lần sau dùng cache (TTL) |
| `UserProgress`, `Achievement`, `Review` | localStorage primary, Supabase secondary; ghi local trước, sync nền |
| Analytics events | Queue qua `EventQueueManager` ([[Analytics]]); flush khi online |
| AI requests | **Không** offline-safe — báo lỗi nếu offline (yêu cầu network) |

## Files chính

- [public/manifest.json](../../public/manifest.json) — PWA manifest.
- [interceptors/cache.interceptor.ts](../../src/app/interceptors/cache.interceptor.ts) — HTTP cache cho GET requests.
- [services/event-queue-manager.service.ts](../../src/app/services/event-queue-manager.service.ts) — offline event queue.
- [services/exercise-session-lock.service.ts](../../src/app/services/exercise-session-lock.service.ts) — `BroadcastChannel` chặn 2 tab cùng làm 1 bài.
- [services/local-storage-provider.service.ts](../../src/app/services/local-storage-provider.service.ts) — fallback storage.

## HTTP cache interceptor

Áp dụng global qua `provideHttpClient(withInterceptors([cacheInterceptor]))` trong `app.config.ts`:
- Cache `GET` request có URL khớp pattern (vd. `public/data/...`).
- TTL configurable.
- Bypass cache với header `Cache-Control: no-cache`.

## Session lock

`ExerciseSessionLockService` dùng `BroadcastChannel('exercise-session')`:
- Khi user mở tab 1 và bắt đầu làm bài X → broadcast `lock:X`.
- Nếu tab 2 mở cùng bài → nghe broadcast → hiện cảnh báo "bài này đang mở ở tab khác".
- Tránh ghi đè `ExerciseAttempt` chồng chéo.

## Route preloading

`SelectivePreloadStrategy` trong [services/selective-preload-strategy.service.ts](../../src/app/services/selective-preload-strategy.service.ts):
- Preload route có `data.preload: 'high'` (home, exercises, exercise-detail, dashboard, learning-path, about).
- Các route khác lazy-load on demand.

`CustomRouteReuseStrategy` trong [services/route-reuse-strategy.service.ts](../../src/app/services/route-reuse-strategy.service.ts):
- Reuse component state khi back/forward giữa các route đã visit.
- Cải thiện UX: scroll position, form state, filter state được giữ.

## Service worker?

**Hiện không** có Angular Service Worker (`@angular/service-worker`) trong dependencies — offline support đang dựa vào localStorage + HTTP cache + event queue.

## Liên kết

- **Cộng tác với:** [[Storage-Sync]] (offline fallback), [[Analytics]] (event queue)
- **Cache infra:** `cacheInterceptor`
- **Multi-tab:** `ExerciseSessionLockService` được dùng bởi [[Translation-Practice]]
- **Cấu hình:** `app.config.ts` (preload + route reuse), `manifest.json`
