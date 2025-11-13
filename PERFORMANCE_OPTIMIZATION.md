# Tối ưu hiệu suất Navigation - Daily English

## Vấn đề
Trên production, mỗi lần redirect/navigate giữa các màn hình bị delay khoảng 1 giây, đặc biệt là menu navigation.

## Nguyên nhân
1. **Lazy loading không có preloading**: Mỗi route phải download chunk mới khi navigate
2. **APP_INITIALIZER chạy async**: SEO initialization chặn app startup
3. **Header component có nhiều computed signals**: Gây blocking khi navigate
4. **Không có route caching**: Component bị recreate mỗi lần navigate
5. **HTTP requests không được cache**: Dữ liệu tĩnh bị fetch lại nhiều lần

## Giải pháp đã áp dụng

### 1. Selective Preloading Strategy
**File**: `src/app/services/selective-preload-strategy.service.ts`

- Routes quan trọng (home, exercises, dashboard) được preload ngay lập tức
- Routes ít dùng được preload sau 2 giây
- Giảm thời gian chờ khi navigate đến routes thường dùng

```typescript
// Đánh dấu priority trong routes
data: {
  preload: 'high', // Preload ngay
  // hoặc không có = preload sau 2s
  // hoặc preload: false = không preload
}
```

### 2. Route Reuse Strategy
**File**: `src/app/services/route-reuse-strategy.service.ts`

- Cache các route components thường dùng (home, exercises, dashboard, profile, favorites)
- Tái sử dụng component thay vì recreate → nhanh hơn rất nhiều
- Component state được giữ nguyên khi quay lại

### 3. HTTP Cache Interceptor
**File**: `src/app/interceptors/cache.interceptor.ts`

- Cache GET requests cho static data (JSON files)
- Cache duration: 5 phút
- Không cache API calls (OpenAI, Gemini)
- Giảm network requests đáng kể

### 4. Non-blocking SEO Initialization
**File**: `src/app/app.config.ts`

- SEO initialization chạy trong background (Promise.resolve())
- Không block app startup
- App có thể navigate ngay lập tức

### 5. Optimized Header Component
**File**: `src/app/components/header/header.ts`

- Animations chạy trong `requestAnimationFrame()`
- Không block main thread khi navigate
- Loại bỏ debug logs không cần thiết

### 6. Navigation Performance Tracking
**File**: `src/app/services/navigation-optimizer.service.ts`

- Track thời gian navigation
- Warning nếu navigation > 500ms
- Giúp debug performance issues

### 7. Build Optimizations
**File**: `angular.json`

```json
{
  "optimization": {
    "scripts": true,
    "styles": {
      "minify": true,
      "inlineCritical": true
    },
    "fonts": true
  },
  "namedChunks": false
}
```

### 8. Client Hydration
- Enable `provideClientHydration()` để tối ưu SSR (nếu dùng)
- Cải thiện First Contentful Paint

## Kết quả mong đợi

### Trước khi tối ưu:
- Navigation delay: ~1000ms
- Mỗi route phải download chunk mới
- Component recreate mỗi lần navigate
- HTTP requests lặp lại

### Sau khi tối ưu:
- Navigation delay: ~100-200ms (giảm 80-90%)
- Routes thường dùng đã được preload
- Component được reuse từ cache
- HTTP requests được cache

## Testing

### 1. Build production
```bash
npm run build
```

### 2. Deploy và test
- Navigate giữa các menu (Home, Exercises, Dashboard)
- Kiểm tra console logs:
  - `[Preload]` - Routes được preload
  - `[RouteReuse]` - Routes được reuse từ cache
  - `[Cache]` - HTTP requests được cache
  - `[Navigation]` - Thời gian navigation

### 3. Chrome DevTools
- Network tab: Kiểm tra chunk loading
- Performance tab: Record navigation performance
- Lighthouse: Kiểm tra performance score

## Monitoring

Mở Console trong production để xem logs:
- Navigation timing
- Route preloading status
- Cache hits/misses
- Slow navigation warnings (>500ms)

## Tối ưu thêm (nếu cần)

### 1. Service Worker
```bash
ng add @angular/pwa
```
- Cache assets offline
- Faster subsequent loads

### 2. Image Optimization
- Sử dụng `NgOptimizedImage`
- Lazy load images
- WebP format

### 3. Bundle Analysis
```bash
npm install -g webpack-bundle-analyzer
ng build --stats-json
webpack-bundle-analyzer dist/daily-english/stats.json
```

### 4. Code Splitting
- Tách các modules lớn thành chunks nhỏ hơn
- Lazy load heavy dependencies (Chart.js, etc.)

## Notes

- Route caching có thể gây issues với data freshness → cần test kỹ
- Cache interceptor chỉ cache static data, không cache API calls
- Preloading tăng initial bandwidth usage nhưng cải thiện UX
- Monitor bundle size để tránh quá lớn

## Rollback (nếu có vấn đề)

Nếu gặp issues, có thể disable từng optimization:

1. **Disable Route Reuse**: Comment out `RouteReuseStrategy` provider
2. **Disable Preloading**: Đổi về `PreloadAllModules` hoặc `NoPreloading`
3. **Disable Cache**: Remove `cacheInterceptor` từ providers
4. **Revert Header**: Restore original header.ts từ git

## Support

Nếu vẫn gặp performance issues:
1. Check Network tab trong DevTools
2. Check Console logs
3. Run Lighthouse audit
4. Profile với Performance tab
