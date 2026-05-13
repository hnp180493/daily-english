# Flashcards

> **Tags:** #feature/review #feature/vocabulary #status/beta  
> **Route:** `/flashcards` (gated bởi `betaFeatureGuard`)

## Tổng quan

Hệ thống thẻ ghi nhớ (Beta) cho từ vựng và cụm từ rút ra từ bài tập. Dùng biến thể SM-2 đơn giản (Know / Don't Know). Có 3 cấp mastery: `new → learning → mastered`.

## Trải nghiệm người dùng

1. Vào `/flashcards` (cần feature flag bật — xem `beta-feature.guard.ts`).
2. Thấy `FlashcardStats`: `total`, `due` (cần ôn hôm nay), `mastery %`.
3. Lọc theo `FlashcardFilter`:
   - `exercise: string | null` — chỉ thẻ từ 1 bài.
   - `category: string | null`.
   - `mastery: 'new' | 'learning' | 'mastered' | null`.
4. Vào session ôn:
   - Lật thẻ (front → back).
   - Bấm **Know** → `interval *= 2.5` (clamp ≤ 180 ngày), `easeFactor += 0.1` (clamp ≤ 3.0).
   - Bấm **Don't Know** → `interval = 1`, `easeFactor -= 0.2` (clamp ≥ 1.3).
   - Hệ thống cập nhật `nextReviewDate`, `reviewCount`, `lastReviewDate`.
5. Hết session → xem `ReviewSessionStats`: `cardsReviewed`, `correctCount`, `accuracy`, `timeSpent`.

## Nguồn flashcard

Flashcards được **sinh từ bài tập** trong hệ thống Memory Retention (sau khi đạt ≥75% trên [[Translation-Practice]]):
- Trích 5–8 `KeyVocabulary` từ đoạn (word + meaning + example sentence + partOfSpeech).
- Mỗi vocab thành 1 `Flashcard` với `front = word`, `back = meaning`, `example = exampleSentence`, `exerciseId = ...`.

## Component chính

- [src/app/components/flashcard-deck/](../../src/app/components/flashcard-deck/) — trang chính.

## Service liên quan

- [services/flashcard.service.ts](../../src/app/services/flashcard.service.ts) — CRUD + lập lịch.
- [services/memory-retention.service.ts](../../src/app/services/memory-retention.service.ts) — sinh flashcard từ exercise.

## Data Model

- `Flashcard` — `id`, `front`, `back`, `example?`, `exerciseId`, `category?`, `createdAt`, `easeFactor` (default 2.5), `interval` (default 0), `nextReviewDate`, `reviewCount`, `lastReviewDate?`.
- `FlashcardFilter` — `exercise`, `category`, `mastery`.
- `FlashcardMasteryLevel`: `'new' | 'learning' | 'mastered'`.
- `FlashcardStats` — `total`, `due`, `mastery %`.
- `ReviewSessionStats` — `cardsReviewed`, `correctCount`, `accuracy`, `timeSpent`, `startedAt`, `endedAt`.
- `FLASHCARD_DEFAULTS` + `SPACED_REPETITION_CONSTANTS` — hằng số.

Định nghĩa: [src/app/models/memory-retention.model.ts](../../src/app/models/memory-retention.model.ts).

## Route

- `/flashcards` → `FlashcardDeckComponent` (canActivate: `betaFeatureGuard`)

## Liên kết

- **Engine:** [[Spaced-Repetition]] (biến thể đơn giản)
- **Nguồn dữ liệu:** [[Translation-Practice]] (sinh khi score ≥ 75%)
- **Hiển thị trong:** [[Dashboard-Analytics]] (qua vocabulary-stats)
- **Phụ thuộc:** [[Storage-Sync]], [[Authentication]] (cần `betaFeatureGuard`)
