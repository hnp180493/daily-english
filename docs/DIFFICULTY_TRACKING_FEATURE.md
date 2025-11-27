# Difficulty Tracking Feature

## Overview
Hệ thống theo dõi và highlight những câu người dùng gặp khó khăn trong quá trình luyện tập, giúp họ focus vào những điểm yếu cần cải thiện.

## Features

### 1. Sentence Difficulty Badge
**Component**: `SentenceDifficultyBadge`
**Location**: `src/app/components/sentence-difficulty-badge/`

Hiển thị badge trên mỗi câu đã hoàn thành với thông tin:
- Số lần submit sai (incorrectAttempts)
- Số lần retry
- Màu sắc theo mức độ khó:
  - 🔵 Low (1 issue): Blue
  - 🟡 Medium (2 issues): Yellow
  - 🟠 High (3-4 issues): Orange
  - 🔴 Critical (5+ issues): Red

**Usage**:
```html
<app-sentence-difficulty-badge 
  [incorrectAttempts]="sentence.incorrectAttempts"
  [retryCount]="sentence.retryCount" />
```

### 2. Difficult Sentences Summary
**Component**: `DifficultSentencesSummary`
**Location**: `src/app/components/difficult-sentences-summary/`

Hiển thị summary card ở đầu review mode với:
- Danh sách các câu khó (threshold >= 2 issues)
- Sắp xếp theo mức độ khó giảm dần
- Hiển thị câu gốc, bản dịch, và gợi ý (nếu có)
- Lời khuyên về Quick Review mode

**Usage**:
```html
<app-difficult-sentences-summary 
  [sentences]="sentences()"
  [threshold]="2" />
```

## Data Tracking

### SentenceProgress Interface
```typescript
interface SentenceProgress {
  original: string;
  translation: string;
  isCompleted: boolean;
  accuracyScore?: number;
  showTranslation?: boolean;
  suggestion?: string;
  consecutiveFailures?: number;
  incorrectAttempts: number;  // Số lần submit < 90%
  retryCount: number;          // Số lần retry
}
```

### Tracking Logic

**incorrectAttempts**: Tăng khi:
- User submit translation
- Accuracy score < 90%
- Tracked in `ExerciseSubmissionService`

**retryCount**: Tăng khi:
- User click "Retry" button
- User press "r" keyboard shortcut
- Tracked in `ExerciseStateService.retrySentence()`

## Visual Design

### Badge Colors
```scss
// Critical (5+ issues)
bg-red-100 text-red-800 border-red-300

// High (3-4 issues)
bg-orange-100 text-orange-800 border-orange-300

// Medium (2 issues)
bg-yellow-100 text-yellow-800 border-yellow-300

// Low (1 issue)
bg-blue-100 text-blue-800 border-blue-300
```

### Summary Card
- Yellow theme (bg-yellow-50, border-yellow-200)
- Info icon
- Sorted list of difficult sentences
- Individual sentence cards with white background
- Blue tip box at bottom

## Integration Points

### 1. Translation Review Component
**File**: `src/app/components/translation-review/translation-review.ts`

Added imports:
```typescript
import { SentenceDifficultyBadge } from '../sentence-difficulty-badge/sentence-difficulty-badge';
import { DifficultSentencesSummary } from '../difficult-sentences-summary/difficult-sentences-summary';
```

Template changes:
- Summary card at top of review section
- Badge in sentence footer next to accuracy score

### 2. Exercise Detail Component
**File**: `src/app/components/exercise-detail/exercise-detail.ts`

Added imports for components (passed through to TranslationReview)

## Quick Review Mode

### Activation
Click "🎯 Quick Review" button in the Difficult Sentences Summary card.

### Behavior
1. Filters exercise to show only difficult sentences (>= 2 issues)
2. Resets progress for fresh practice
3. Navigates to exercise with `?quickReview=true` query param
4. Shows filtered progress indicator
5. Can exit back to full review mode

### Implementation
```typescript
onStartQuickReview(): void {
  // Get difficult sentence indices
  const difficultIndices = this.sentences()
    .filter(s => s.incorrectAttempts + s.retryCount >= 2)
    .map((_, index) => index);
  
  // Set quick review mode
  this.quickReviewMode.set(true);
  this.incorrectSentenceIndices.set(difficultIndices);
  
  // Reset and navigate
  this.router.navigate([], {
    queryParams: { quickReview: 'true' }
  });
}
```

## User Benefits

1. **Immediate Feedback**: Visual indicators show which sentences were challenging
2. **Focused Practice**: Summary highlights specific areas needing improvement
3. **Progress Tracking**: See improvement over multiple attempts
4. **Quick Review**: One-click access to practice only difficult sentences
5. **Efficient Learning**: Spend time on weak points instead of repeating easy sentences

## Future Enhancements

1. **Analytics Integration**: Track difficulty patterns across exercises
2. **Personalized Recommendations**: Suggest similar exercises based on difficulty
3. **Difficulty Trends**: Show improvement over time
4. **Export Difficult Sentences**: Create custom practice sets
5. **Spaced Repetition**: Schedule reviews based on difficulty level

## Testing

### Manual Testing Checklist
- [ ] Badge appears when incorrectAttempts > 0
- [ ] Badge appears when retryCount > 0
- [ ] Badge color changes based on total issues
- [ ] Summary shows only sentences with >= 2 issues
- [ ] Summary sorts by difficulty (most difficult first)
- [ ] Tooltip shows detailed information
- [ ] Responsive design works on mobile
- [ ] Badge doesn't appear for perfect sentences (0 issues)

### Test Scenarios
1. Complete sentence with 1 incorrect attempt → Blue badge
2. Retry sentence 2 times → Yellow badge
3. Mix of 3 incorrect + 2 retries → Red badge
4. Complete exercise with some difficult sentences → Summary appears
5. Complete exercise perfectly → No summary

## Performance Considerations

- Components use `computed()` signals for reactive updates
- Minimal re-renders with `ChangeDetectionStrategy.OnPush`
- Badges only render when issues > 0
- Summary only renders when difficult sentences exist
- Efficient sorting with single pass

## Accessibility

- Tooltips provide detailed information
- ARIA labels on interactive elements
- Color + text + icons for colorblind users
- Keyboard navigation support
- Screen reader friendly structure
