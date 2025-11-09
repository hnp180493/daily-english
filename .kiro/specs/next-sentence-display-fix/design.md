# Next Sentence Display Fix - Design

## Overview
This design addresses the issue where the Vietnamese sentence in the full text display was being replaced with the English translation immediately after submission, instead of waiting for the user to click "Next Sentence".

## Solution

### State Management
Added a new property `showTranslation` to the `SentenceProgress` interface to track whether the translation should be displayed in the full text area.

```typescript
export interface SentenceProgress {
  original: string;
  translation: string;
  isCompleted: boolean;
  accuracyScore?: number;
  showTranslation?: boolean; // NEW: Controls when translation appears in full text
}
```

### Key Changes

1. **Template Update** (`exercise-detail.html`)
   - Changed from: `{{ sentence.isCompleted ? sentence.translation : sentence.original }}`
   - Changed to: `{{ sentence.showTranslation ? sentence.translation : sentence.original }}`
   - This ensures the Vietnamese text remains visible until explicitly advanced

2. **State Service Updates** (`exercise-state.service.ts`)
   - `initializeSentences()`: Initialize `showTranslation: false` for all sentences
   - `moveToNextSentence()`: Set `showTranslation: true` for current sentence before advancing
   - `loadBestAttempt()`: Set `showTranslation: true` for review mode sentences

### User Flow

1. User submits translation → `isCompleted: true`, `showTranslation: false`
2. Full text still shows Vietnamese sentence (highlighted as completed)
3. User clicks "Next Sentence" → `showTranslation: true` for that sentence
4. Full text now shows English translation for that sentence
5. Move to next sentence and repeat

## Benefits

- User can review the Vietnamese source text after submission
- Better learning experience - can compare their translation with the original
- Maintains context before advancing
- Aligns with natural learning workflow
