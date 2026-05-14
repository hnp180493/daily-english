# Flashcards

> **Tags:** #feature/review #feature/vocabulary #status/beta  
> **Routes:** `/flashcards` (deck management), `/flashcards/study` (review session)  
> **Gate:** `betaFeatureGuard`

## Tổng quan

Hệ thống flashcard hiện đại với 3 trụ cột (upgraded 2026-05-14):

1. **FSRS-4.5** thay SM-2 đơn giản — scheduler dựa trên stability + difficulty + retrievability với 4-button rating (Again/Hard/Good/Easy).
2. **5 chế độ ôn** ngoài lật thẻ cổ điển — cloze, multiple-choice, type-answer, audio-cue, reverse — để force genuine recall thay vì chỉ recognize layout.
3. **Smart decks + custom decks** — sinh tự động (due/weak/new/leech/category) hoặc user-defined; thẻ user tự tạo (`customCreated`); leech detection + suspend cá nhân.

## Trải nghiệm người dùng

### 1. Trang `/flashcards` (deck management)
- **Smart Decks grid** ở trên cùng: 5+ deck động, mỗi deck hiện số thẻ live
  - ⏰ Đến hạn ôn (theo FSRS)
  - 🆕 Thẻ mới (chưa ôn lần nào)
  - 🎯 Từ hay quên (stability thấp HOẶC lapse rate > 33%)
  - 🐌 Leech (≥ 4 lapses)
  - 📚 Tất cả (cram mode)
  - 📁 Mỗi category → một smart deck riêng
- **Custom Decks**: tạo deck thủ công với name + selected cards (multi-select bằng cách click card)
- **Tạo thẻ thủ công**: + form với front/back/example/category (vs thẻ auto từ exercise)
- **Card list** với mastery badge + nút tạm dừng/reset/xoá per card
- **Leech banner** khi có thẻ leech để user attention
- **Cram cũ** ("Chế độ lật thẻ cổ điển") vẫn còn cho ai thích pattern cũ

### 2. Trang `/flashcards/study` (review session)
- Chọn chế độ qua queryParam `?deck=ID` (smart) hoặc `?deck=ID&custom=1`.
- Mỗi thẻ tự pick mode theo mastery (auto), hoặc user force 1 mode cố định trong ⚙️ Tuỳ chỉnh.
- **4 nút rating** với preview interval (vd. "Được · 4d", "Dễ · 12d") tính FSRS trước khi user click.
- Keyboard shortcuts: Space hiện đáp án, 1-2-3-4 rate.
- Daily caps: `newPerDay` (default 15) + `reviewsPerDay` (default 100); interleave 4-review-1-new để tránh chôn review cũ.
- Per-card actions: ⏸ tạm dừng, 🔄 reset về new, ⏭ skip.
- Session done → 4-card stats (accuracy, again, hard, good+easy) + nút restart.

## Mode picker logic (auto)

Trong [FlashcardModeService.pickMode](../../src/app/services/flashcard-mode.service.ts):

| Card state    | Auto mode |
|---|---|
| new           | multiple-choice (giảm friction, build recognition trước) |
| learning      | cloze (nếu có example) → fallback MC |
| relearning    | multiple-choice (rebuild confidence sau lapse) |
| review (rotation)| reviewCount % 4 → 0 type-answer / 1 cloze hoặc reverse / 2 audio-cue / 3 reverse |

Khi user set fixed mode → service vẫn fall back về MC nếu mode chọn là `cloze` mà card không có example.

## FSRS scheduler

[FsrsService](../../src/app/services/fsrs.service.ts) là port simplified của FSRS-4.5, deterministic, không dùng trained weights:

- **States:** New → Learning → Review (+ Relearning sau lapse)
- **Stability:** số ngày memory dự kiến giữ với target retention 90%
- **Difficulty:** 1-10, tăng khi rate Again, giảm khi rate Easy
- **Lapses:** đếm số lần rate Again trong Review → ≥ 4 → leech
- **Learning steps:** 1 phút → 10 phút → graduate to Review
- **Relearning steps:** 10 phút → back to Review

`previewRatingIntervals()` chạy schedule với 4 rating khả thi trên cùng card để show preview trên UI buttons trước khi user chọn.

Backward compat: card cũ chỉ có `easeFactor`/`interval` → `migrateFromLegacy()` chạy 1 lần khi load, infer state từ `reviewCount` + `interval`, seed stability = max(1, interval), difficulty từ easeFactor map.

## Smart deck rules

[FlashcardDecksService.smartDecks](../../src/app/services/flashcard-decks.service.ts) computed signal:

- **due**: `flashcardService.dueFlashcards()` (sort theo `nextReviewDate`).
- **new**: `state === 'new' && reviewCount === 0 && !suspended`.
- **weak**: `lapses > 0 && (stability < 3 || lapses/reviews > 0.33)`.
- **leech**: `lapses >= 4` (FSRS_CONSTANTS.LEECH_THRESHOLD).
- **all**: `!suspended` (dùng cram, bao gồm thẻ chưa đến hạn).
- **category**: 1 smart deck cho mỗi category xuất hiện trong cards.

Resolver `resolveSmartDeck(deck)` trả live list khi user click.

## Custom decks

[CustomDeck](../../src/app/models/memory-retention.model.ts): `{ id, name, description?, cardIds[], createdAt, updatedAt }`. Lưu localStorage key `flashcard-custom-decks-v1_<userId>` (per-user, mirror flashcards). UI tạo bằng "+ Tạo deck mới" → enter `isMultiSelectMode` → click thẻ trong card list → Lưu.

## Data Model

**Flashcard (extended):**
- Original: `id`, `front`, `back`, `example?`, `exerciseId`, `category?`, `createdAt`, `easeFactor`, `interval`, `nextReviewDate`, `reviewCount`, `lastReviewDate?`
- FSRS (optional, populated on first rating or migration): `state`, `stability`, `difficulty`, `lapses`, `lastRating`, `elapsedDays`, `scheduledDays`, `learningStep`
- Extended: `tags?`, `customCreated?`, `suspended?`

**ReviewRating** = `1 | 2 | 3 | 4` (Again / Hard / Good / Easy)

**CardType** = `flip | cloze | multiple-choice | type-answer | audio-cue | reverse`

**CardPrompt** — payload service đẩy xuống UI: `{ type, card, questionText, answerText, options?, correctIndex?, clozeAnswer?, speakQuestion? }`.

**SmartDeckKind** = `due | weak | leech | new | category | all`

**FlashcardStudyPrefs** — `{ modePreference: 'auto' | CardType, autoSpeak, newPerDay, reviewsPerDay }`. Lưu localStorage key `flashcard-study-prefs-v1`.

Định nghĩa: [src/app/models/memory-retention.model.ts](../../src/app/models/memory-retention.model.ts).

## Component chính

- [flashcard-deck](../../src/app/components/flashcard-deck/flashcard-deck.ts) — deck management page (smart decks + custom decks + card list + create card form).
- [flashcard-study](../../src/app/components/flashcard-study/flashcard-study.ts) — review session với 5 mode renderers + 4-button FSRS rating.
- [flashcard-review](../../src/app/components/flashcard-review/flashcard-review.ts) — internal flip review (legacy, vẫn dùng được trong Memory Boost section).

## Service liên quan

- [flashcard.service.ts](../../src/app/services/flashcard.service.ts) — CRUD + `rateCard()` (FSRS) + `markCard()` (legacy bool, internal → FSRS) + `setSuspended()` + `resetCard()` + `createCustomCard()` + import/export.
- [fsrs.service.ts](../../src/app/services/fsrs.service.ts) — pure scheduler + `previewRatingIntervals()` helper + `computeMastery()`.
- [flashcard-mode.service.ts](../../src/app/services/flashcard-mode.service.ts) — `pickMode()` + `buildPrompt()` + cloze generator + MC distractor picker + fuzzy `matchTypedAnswer()`.
- [flashcard-decks.service.ts](../../src/app/services/flashcard-decks.service.ts) — smart deck definitions + custom deck CRUD + weak card detector.
- [memory-retention.service.ts](../../src/app/services/memory-retention.service.ts) — sinh flashcard từ exercise (vẫn dùng).

## Routes

- `/flashcards` → `FlashcardDeckComponent` (canActivate: `betaFeatureGuard`)
- `/flashcards/study` → `FlashcardStudyComponent` (canActivate: `betaFeatureGuard`). QueryParams: `deck` (id of smart or custom deck), `custom` (`'1'` if custom deck).

## Liên kết

- **Engine:** [[Spaced-Repetition]] (đã chuyển từ SM-2 sang FSRS).
- **Nguồn dữ liệu:** [[Translation-Practice]] (sinh khi score ≥ 75%) + custom cards user tự thêm.
- **Hiển thị trong:** [[Dashboard-Analytics]] (qua vocabulary-stats — stats vẫn dùng `computeMastery`).
- **Phụ thuộc:** [[Storage-Sync]], [[Authentication]] (cần `betaFeatureGuard`), [[TTS-Audio]] (audio-cue mode + autoSpeak), [[Error-Patterns]] (gợi ý weak deck — implicit qua lapse history).
