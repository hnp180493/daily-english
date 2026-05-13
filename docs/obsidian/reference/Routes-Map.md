# Routes Map

> **Tags:** #reference  
> **Source:** [src/app/app.routes.ts](../../src/app/app.routes.ts)

Bảng tra cứu mọi route → component → feature documentation.

## Bảng route

| Route | Component | Guards | Preload | Feature |
|---|---|---|---|---|
| `/` (`''`) | `HomeComponent` | — | `high` | Home (chứa [[Daily-Challenge]], [[Weekly-Goals]], [[Learning-Path]] preview) |
| `/login` | `LoginComponent` | `loginGuard` | — | [[Authentication]] |
| `/home` | redirect → `/` | — | — | — |
| `/index.html` | redirect → `/` | — | `high` | — |
| `/exercises` | `ExerciseListComponent` | — | `high` | [[Exercise-Library]] |
| `/exercises/custom` | `CustomExerciseLibrary` | — | — | [[Custom-Exercises]] |
| `/exercise/create` | `ExerciseCreator` | — | — | [[Custom-Exercises]] |
| `/exercise/edit/:id` | `ExerciseCreator` | — | — | [[Custom-Exercises]] |
| `/exercise/:slug` | `ExerciseDetailComponent` | — | `high` | [[Translation-Practice]] |
| `/exercises/:id/dictation` | `DictationPracticeComponent` | — | — | [[Dictation-Practice]] |
| `/exercises/:id/pronunciation` | `PronunciationPracticeComponent` | — | — | [[Pronunciation-Practice]] (Beta — mở cho mọi user) |
| `/profile` | `ProfileComponent` | — | — | [[Authentication]] + [[Achievements]] showcase |
| `/favorites` | `FavoritesComponent` | — | — | [[Favorites]] |
| `/dashboard` | `DashboardComponent` | — | `high` | [[Dashboard-Analytics]] |
| `/achievements` | `Achievements` | — | — | [[Achievements]] |
| `/review-queue` | `ReviewQueueComponent` | — | — | [[Review-Queue]] |
| `/flashcards` | `FlashcardDeckComponent` | `betaFeatureGuard` | — | [[Flashcards]] |
| `/error-patterns` | `ErrorPatternsComponent` | — | — | [[Error-Patterns]] |
| `/learning-path` | `LearningPath` | — (authGuard commented out) | `high` | [[Learning-Path]] |
| `/about` | `AboutComponent` | — | `high` | Marketing |
| `/guide` | `GuideComponent` | — | — | Documentation in-app |
| `**` (wildcard) | redirect → `/home` | — | — | — |

## Guards summary

| Guard | File | Tác dụng |
|---|---|---|
| `authGuard` | [src/app/guards/auth.guard.ts](../../src/app/guards/auth.guard.ts) | Chặn route yêu cầu đăng nhập (hiện không gắn vào route nào — code comment ở `/learning-path`) |
| `loginGuard` | [src/app/guards/login.guard.ts](../../src/app/guards/login.guard.ts) | Chặn user đã login truy cập `/login` |
| `betaFeatureGuard` | [src/app/guards/beta-feature.guard.ts](../../src/app/guards/beta-feature.guard.ts) | Gate cho [[Flashcards]] (cần flag enable) |

## Preloading strategy

`SelectivePreloadStrategy` ([src/app/services/selective-preload-strategy.service.ts](../../src/app/services/selective-preload-strategy.service.ts)) chỉ preload các route có `data.preload === 'high'`:

- `/` (Home)
- `/index.html`
- `/exercises`
- `/exercise/:slug`
- `/dashboard`
- `/learning-path`
- `/about`

Các route còn lại lazy-load on demand.

## SEO metadata

Tất cả route đều khai báo `data.seo: VietnameseRouteSeoData`:
- Title, description, keywords (Vietnamese-first).
- `structuredDataType` (`WebSite | EducationalOrganization`).
- `noindex: true` cho route nhạy cảm (`/login`, `/exercises/:id/dictation`, `/profile`).
- `vietnamese: { breadcrumbs, faqs }` cho FAQ schema và breadcrumb structured data.

Xem [[SEO]] để hiểu cách `SeoService` đọc các data này.

## Liên kết

- **Triển khai:** [src/app/app.routes.ts](../../src/app/app.routes.ts)
- **Bootstrap routing:** [src/app/app.config.ts](../../src/app/app.config.ts)
- **Liên quan:** [[Architecture]] (routing chiến lược), [[SEO]] (per-route SEO), [[PWA-Offline]] (preload + route reuse)
