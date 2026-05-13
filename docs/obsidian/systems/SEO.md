# SEO

> **Tags:** #system/seo #status/active

## Tổng quan

Hạ tầng SEO tập trung cho thị trường **Việt Nam**:
- **Vietnamese keyword optimization** (toggle qua `environment.seo.vietnameseKeywordsEnabled`).
- **Cốc Cốc** browser-specific optimizations (Cốc Cốc là trình duyệt phổ biến ở VN).
- **Zalo / Facebook** social sharing meta.
- **Static sitemap** auto-sinh khi build.
- **Per-route SEO data** gắn vào `route.data.seo` + `vietnamese`.
- **Static page prerender** qua build script.

## Files chính

### Services
- [services/seo.service.ts](../../src/app/services/seo.service.ts) — set meta tags, canonical, structured data; lắng nghe router events để cập nhật theo route.
- [services/vietnamese-seo.service.ts](../../src/app/services/vietnamese-seo.service.ts) — Vietnamese keyword templates, hreflang, breadcrumb structured data.
- [services/coc-coc-seo.service.ts](../../src/app/services/coc-coc-seo.service.ts) — apply Cốc Cốc browser-specific tags, sinh sitemap reference.
- [services/exercise-seo.service.ts](../../src/app/services/exercise-seo.service.ts) — sinh SEO data dynamic cho từng exercise page.

### Components
- [src/app/components/vietnamese-breadcrumb/vietnamese-breadcrumb.ts](../../src/app/components/vietnamese-breadcrumb/vietnamese-breadcrumb.ts) — breadcrumb có structured data.
- [src/app/components/vietnamese-faq/vietnamese-faq.ts](../../src/app/components/vietnamese-faq/vietnamese-faq.ts) — FAQ structured data (lấy từ `route.data.seo.vietnamese.faqs`).

### Config
- [src/environments/environment.ts](../../src/environments/environment.ts) `seo:` block:
  ```ts
  seo: {
    googleSiteVerification: '...',
    bingWebmasterVerification: '...',
    cocCocVerification: '...',   // từ https://webmaster.coccoc.com/
    vietnameseKeywordsEnabled: true,
    zaloAppId: ''
  }
  ```
- [public/vietnamese-seo-config.json](../../public/vietnamese-seo-config.json) — 20+ Vietnamese keyword sets, meta templates, Zalo/Facebook config.

## Per-route SEO

Mỗi route trong [src/app/app.routes.ts](../../src/app/app.routes.ts) khai báo:

```ts
data: {
  preload: 'high',
  seo: {
    title: '...',
    description: '...',
    keywords: [...],
    structuredDataType: 'WebSite' | 'EducationalOrganization' | ...,
    noindex: boolean,
    vietnamese: {
      title, description, keywords, breadcrumbs, faqs
    }
  } as VietnameseRouteSeoData
}
```

`SeoService` lắng nghe `NavigationEnd` và cập nhật `<head>`.

## App initialization

Trong [src/app/app.config.ts](../../src/app/app.config.ts) có 2 `provideAppInitializer` SEO chạy nền:

1. `initializeSeo(seoService)` — set default WebSite structured data.
2. `initializeVietnameseSeo(vietnameseSeoService, cocCocSeoService)`:
   - Load `public/vietnamese-seo-config.json`.
   - Apply Cốc Cốc browser-specific optimizations.
   - Generate Cốc Cốc sitemap reference.

## Build pipeline

`package.json` scripts:

| Script | File | Mục đích |
|---|---|---|
| `prebuild` → `generate:sitemap` | [scripts/generate-sitemap.js](../../scripts/generate-sitemap.js) | Sinh `sitemap.xml` với 12+ static pages + 250+ exercise URLs |
| `postbuild` → `generate:static` | [scripts/generate-static-pages.js](../../scripts/generate-static-pages.js) | Prerender các page quan trọng để Google crawl thấy nội dung không cần JS |
| `combine-exercises` | [scripts/combine-exercises.js](../../scripts/combine-exercises.js) | Gộp 24 file JSON (3 level × 8 category) → `all-exercises.json` để sitemap script dùng |

## Verification codes

`<meta>` verification trong [src/index.html](../../src/index.html) hoặc sinh động:
- `googleSiteVerification` — Google Search Console.
- `bingWebmasterVerification` — Bing Webmaster.
- `cocCocVerification` — Cốc Cốc Webmaster.

## Liên kết

- **Bootstrap:** 2 `provideAppInitializer` trong `app.config.ts`
- **Sử dụng bởi:** mọi route (qua `route.data.seo`)
- **Exercise SEO động:** [[Exercise-Library]], [[Translation-Practice]] (qua `exercise-seo.service.ts`)
- **Phụ thuộc:** `public/vietnamese-seo-config.json`
