# Design Document: Scoring Penalty System

## Overview

This design document outlines the implementation of a scoring penalty system that maintains the existing 90% accuracy threshold for sentence progression while introducing a penalty mechanism that adjusts the final exercise score based on incorrect attempts and retries. The system will track performance metrics throughout the exercise session and calculate a penalty-adjusted final score that reflects the user's learning journey.

The design integrates seamlessly with the existing Angular application architecture, leveraging the current state management, service layer, and data persistence mechanisms.

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Exercise Detail Component                 │
│  - Displays penalty information                              │
│  - Shows score breakdown on completion                       │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ├──────────────────────────────────────────┐
                 │                                          │
┌────────────────▼──────────────┐    ┌────────────────────▼──────────────┐
│   Exercise State Service      │    │  Exercise Recording Service        │
│  - Track incorrect attempts   │    │  - Calculate penalty-adjusted      │
│  - Track retry counts         │    │    final score                     │
│  - Persist penalty metrics    │    │  - Record penalty metrics          │
└────────────────┬──────────────┘    └────────────────────┬───────────────┘
                 │                                         │
                 │                                         │
┌────────────────▼─────────────────────────────────────────▼───────────────┐
│                        Progress Service                                   │
│  - Store penalty metrics in ExerciseAttempt                              │
│  - Persist to Firestore                                                  │
└──────────────────────────────────────────────────────────────────────────┘
```

### Data Flow

1. **During Exercise**:
   - User submits translation → ExerciseSubmissionService evaluates accuracy
   - If accuracy < 90% → ExerciseStateService increments incorrect attempt counter
   - User clicks retry → ExerciseStateService increments retry counter
   - State persisted via ExercisePersistenceService

2. **On Exercise Completion**:
   - ExerciseRecordingService calculates base score (average of all sentence accuracies)
   - ExerciseRecordingService calculates total penalties
   - ExerciseRecordingService computes final penalty-adjusted score
   - ExerciseAttempt record created with penalty metrics
   - ProgressService persists to Firestore

3. **In Review Mode**:
   - ExerciseDetailComponent displays penalty breakdown
   - Shows: base score, incorrect attempts, retries, total penalty, final score

## Components and Interfaces

### 1. Data Model Extensions

#### SentenceProgress Interface (exercise-state.service.ts)

Add new fields to track penalty metrics:

```typescript
export interface SentenceProgress {
  original: string;
  translation: string;
  isCompleted: boolean;
  accuracyScore?: number;
  showTranslation?: boolean;
  suggestion?: string;
  consecutiveFailures?: number;
  
  // NEW: Penalty tracking fields
  incorrectAttempts: number;      // Count of submissions < 90%
  retryCount: number;              // Count of explicit retries
}
```

#### ExerciseAttempt Interface (exercise.model.ts)

Add new fields to store penalty information:

```typescript
export interface ExerciseAttempt {
  exerciseId: string;
  category?: ExerciseCategory | string;
  attemptNumber: number;
  userInput: string;
  accuracyScore: number;          // This becomes the penalty-adjusted score
  pointsEarned: number;
  feedback: FeedbackItem[];
  timestamp: Date;
  hintsUsed: number;
  sentenceAttempts?: SentenceAttempt[];
  
  // NEW: Penalty metrics
  baseScore: number;               // Average accuracy before penalties
  totalIncorrectAttempts: number;  // Sum of all incorrect attempts
  totalRetries: number;            // Sum of all retries
  totalPenalty: number;            // Total points deducted
}
```

#### SentenceAttempt Interface (exercise.model.ts)

Add penalty tracking to individual sentences:

```typescript
export interface SentenceAttempt {
  sentenceIndex: number;
  userInput: string;
  accuracyScore: number;
  feedback: FeedbackItem[];
  overallComment?: string;
  
  // NEW: Penalty metrics per sentence
  incorrectAttempts: number;       // Number of failed attempts for this sentence
  retryCount: number;              // Number of times this sentence was retried
}
```

### 2. ExerciseStateService Updates

#### New Methods

```typescript
// Initialize sentence with penalty tracking
initializeSentences(sourceText: string): void {
  // ... existing code ...
  this.sentences.set(matches.map(sentence => ({
    original: sentence.trim(),
    translation: '',
    isCompleted: false,
    showTranslation: false,
    incorrectAttempts: 0,    // NEW
    retryCount: 0            // NEW
  })));
}

// Increment incorrect attempt counter
incrementIncorrectAttempt(index: number): void {
  this.sentences.update(sentences => {
    const updated = [...sentences];
    updated[index] = {
      ...updated[index],
      incorrectAttempts: (updated[index].incorrectAttempts || 0) + 1
    };
    return updated;
  });
}

// Increment retry counter
incrementRetryCount(index: number): void {
  this.sentences.update(sentences => {
    const updated = [...sentences];
    updated[index] = {
      ...updated[index],
      retryCount: (updated[index].retryCount || 0) + 1
    };
    return updated;
  });
}

// Get total penalty metrics
getPenaltyMetrics(): { totalIncorrectAttempts: number; totalRetries: number } {
  const sents = this.sentences();
  return {
    totalIncorrectAttempts: sents.reduce((sum, s) => sum + (s.incorrectAttempts || 0), 0),
    totalRetries: sents.reduce((sum, s) => sum + (s.retryCount || 0), 0)
  };
}
```

#### Modified Methods

```typescript
// Update markSentenceCompleted to track incorrect attempts
markSentenceCompleted(index: number, translation: string, score: number, suggestion?: string): void {
  this.sentences.update(sentences => {
    const updated = [...sentences];
    const current = updated[index];
    
    // Increment incorrect attempts if score < 90%
    const incorrectAttempts = score < 90 
      ? (current.incorrectAttempts || 0) + 1 
      : (current.incorrectAttempts || 0);
    
    updated[index] = {
      ...updated[index],
      translation,
      isCompleted: true,
      accuracyScore: score,
      suggestion,
      incorrectAttempts,
      consecutiveFailures: score < 90 ? (current.consecutiveFailures || 0) + 1 : 0
    };
    return updated;
  });
}

// Update retrySentence to increment retry counter
retrySentence(): void {
  const currentIdx = this.currentSentenceIndex();
  
  // Increment retry counter
  this.incrementRetryCount(currentIdx);
  
  this.sentences.update(sentences => {
    const updated = [...sentences];
    if (currentIdx < updated.length) {
      updated[currentIdx] = {
        ...updated[currentIdx],
        translation: '',
        isCompleted: false,
        accuracyScore: undefined,
        showTranslation: false,
        consecutiveFailures: 0
        // Keep incorrectAttempts and retryCount
      };
    }
    return updated;
  });
  this.resetSentenceState();
}
```

### 3. ExerciseRecordingService Updates

#### New Penalty Calculation Logic

```typescript
private readonly INCORRECT_ATTEMPT_PENALTY = 2;  // Points per incorrect attempt
private readonly RETRY_PENALTY = 5;              // Points per retry

recordAttempt(exercise: Exercise, hintsUsed: number, pointsEarned: number): void {
  const status = this.progressService.getExerciseStatus(exercise.id);
  const sents = this.stateService.sentences();

  // Calculate base score (average accuracy)
  const accuracyScores = sents.map(s => s.accuracyScore || 0);
  const baseScore = this.validationService.calculateAverageAccuracy(accuracyScores);
  
  // Get penalty metrics
  const penaltyMetrics = this.stateService.getPenaltyMetrics();
  
  // Calculate total penalty
  const totalPenalty = 
    (penaltyMetrics.totalIncorrectAttempts * this.INCORRECT_ATTEMPT_PENALTY) +
    (penaltyMetrics.totalRetries * this.RETRY_PENALTY);
  
  // Calculate penalty-adjusted final score
  const finalScore = Math.max(0, baseScore - totalPenalty);
  
  const fullTranslation = sents.map(s => s.translation).join(' ');

  // Create sentence attempts with penalty metrics
  const sentenceAttempts = sents.map((s, index) => {
    const feedback: FeedbackItem[] = [];
    
    if (s.suggestion) {
      feedback.push({
        suggestion: s.suggestion,
      } as FeedbackItem);
    }
    
    return {
      sentenceIndex: index,
      userInput: s.translation,
      accuracyScore: s.accuracyScore || 0,
      feedback,
      incorrectAttempts: s.incorrectAttempts || 0,
      retryCount: s.retryCount || 0
    };
  });

  const attempt: ExerciseAttempt = {
    exerciseId: exercise.id,
    category: exercise.category,
    attemptNumber: status.attemptCount + 1,
    userInput: fullTranslation,
    accuracyScore: finalScore,  // Penalty-adjusted score
    baseScore,                   // Original average score
    totalIncorrectAttempts: penaltyMetrics.totalIncorrectAttempts,
    totalRetries: penaltyMetrics.totalRetries,
    totalPenalty,
    pointsEarned,
    feedback: [],
    timestamp: new Date(),
    hintsUsed,
    sentenceAttempts
  };

  // ... existing animation and recording logic ...
}
```

### 4. ExerciseDetailComponent Updates

#### New Computed Signals

```typescript
// Penalty metrics for display
penaltyMetrics = computed(() => {
  const ex = this.exercise();
  if (!ex || !this.isReviewMode()) return null;
  
  const progress = this.progressSignal();
  const attempt = progress.exerciseHistory[ex.id];
  
  if (!attempt) return null;
  
  return {
    baseScore: attempt.baseScore || attempt.accuracyScore,
    totalIncorrectAttempts: attempt.totalIncorrectAttempts || 0,
    totalRetries: attempt.totalRetries || 0,
    totalPenalty: attempt.totalPenalty || 0,
    finalScore: attempt.accuracyScore
  };
});

// Current session penalty tracking (during exercise)
currentPenaltyMetrics = computed(() => {
  if (this.isReviewMode()) return null;
  
  const metrics = this.stateService.getPenaltyMetrics();
  const sents = this.sentences();
  const accuracyScores = sents
    .filter(s => s.isCompleted)
    .map(s => s.accuracyScore || 0);
  
  const baseScore = accuracyScores.length > 0
    ? Math.round(accuracyScores.reduce((sum, score) => sum + score, 0) / accuracyScores.length)
    : 0;
  
  const totalPenalty = 
    (metrics.totalIncorrectAttempts * 2) +
    (metrics.totalRetries * 5);
  
  return {
    baseScore,
    totalIncorrectAttempts: metrics.totalIncorrectAttempts,
    totalRetries: metrics.totalRetries,
    totalPenalty,
    estimatedFinalScore: Math.max(0, baseScore - totalPenalty)
  };
});
```

#### Template Updates

Add penalty breakdown display in review mode:

```html
<!-- Penalty Breakdown Section (Review Mode) -->
@if (isReviewMode() && penaltyMetrics()) {
  <div class="penalty-breakdown">
    <h3>Score Breakdown</h3>
    <div class="penalty-item">
      <span>Base Score (Average Accuracy):</span>
      <span class="score">{{ penaltyMetrics()!.baseScore }}%</span>
    </div>
    <div class="penalty-item">
      <span>Incorrect Attempts ({{ penaltyMetrics()!.totalIncorrectAttempts }} × 2):</span>
      <span class="penalty">-{{ penaltyMetrics()!.totalIncorrectAttempts * 2 }}</span>
    </div>
    <div class="penalty-item">
      <span>Sentence Retries ({{ penaltyMetrics()!.totalRetries }} × 5):</span>
      <span class="penalty">-{{ penaltyMetrics()!.totalRetries * 5 }}</span>
    </div>
    <div class="penalty-item total">
      <span>Total Penalty:</span>
      <span class="penalty">-{{ penaltyMetrics()!.totalPenalty }}</span>
    </div>
    <div class="penalty-item final">
      <span>Final Score:</span>
      <span class="final-score">{{ penaltyMetrics()!.finalScore }}%</span>
    </div>
  </div>
}

<!-- Current Progress Indicator (During Exercise) -->
@if (!isReviewMode() && currentPenaltyMetrics() && completedSentences().length > 0) {
  <div class="current-penalty-info">
    <span>Current Average: {{ currentPenaltyMetrics()!.baseScore }}%</span>
    @if (currentPenaltyMetrics()!.totalPenalty > 0) {
      <span class="penalty-indicator">
        Penalties: -{{ currentPenaltyMetrics()!.totalPenalty }}
      </span>
    }
  </div>
}
```

## Error Handling

### Data Migration

- **Backward Compatibility**: Existing ExerciseAttempt records without penalty fields will default to:
  - `baseScore = accuracyScore`
  - `totalIncorrectAttempts = 0`
  - `totalRetries = 0`
  - `totalPenalty = 0`

- **Validation**: Before calculating penalties, verify that:
  - Sentence arrays are not empty
  - Accuracy scores are valid numbers (0-100)
  - Penalty metrics are non-negative integers

### Edge Cases

1. **All sentences completed on first try with 90%+**: 
   - No penalties applied
   - Final score = base score

2. **Multiple retries on same sentence**:
   - Each retry increments retry counter
   - Incorrect attempts continue to accumulate

3. **Score drops below 0**:
   - Final score clamped to 0 minimum

4. **Review mode with missing penalty data**:
   - Display "N/A" or hide penalty breakdown
   - Show only base score

## Testing Strategy

### Unit Tests

1. **ExerciseStateService**:
   - Test `incrementIncorrectAttempt()` increments counter correctly
   - Test `incrementRetryCount()` increments counter correctly
   - Test `getPenaltyMetrics()` sums correctly across all sentences
   - Test `markSentenceCompleted()` increments incorrect attempts when score < 90%
   - Test `retrySentence()` increments retry counter

2. **ExerciseRecordingService**:
   - Test penalty calculation formula
   - Test final score calculation with various scenarios
   - Test minimum score clamping to 0
   - Test sentence attempt creation with penalty metrics

3. **ExerciseValidationService**:
   - Test average accuracy calculation remains unchanged

### Integration Tests

1. **Complete Exercise Flow**:
   - Submit translations with varying accuracy scores
   - Verify incorrect attempts are tracked
   - Retry sentences and verify retry counter
   - Complete exercise and verify final score calculation
   - Verify persistence to Firestore

2. **Review Mode**:
   - Load completed exercise
   - Verify penalty breakdown displays correctly
   - Verify all metrics match recorded attempt

### Manual Testing Scenarios

1. **Perfect Run**: Complete all sentences with 90%+ on first try
   - Expected: No penalties, final score = base score

2. **Multiple Failures**: Submit several translations < 90% before achieving 90%+
   - Expected: Incorrect attempts tracked, penalties applied

3. **Retry Scenario**: Complete sentence, then retry it
   - Expected: Retry counter increments, additional penalty applied

4. **Mixed Performance**: Combination of perfect sentences, failed attempts, and retries
   - Expected: All penalties calculated correctly, final score reflects total performance

## Performance Considerations

- **Minimal Overhead**: Penalty tracking adds minimal computational cost (simple counter increments)
- **Memory**: Additional fields per sentence (~16 bytes per sentence)
- **Firestore**: No additional writes (penalty data included in existing ExerciseAttempt document)
- **UI Rendering**: Penalty breakdown only rendered in review mode (no impact on exercise performance)

## Migration Plan

### Phase 1: Data Model Updates
- Update TypeScript interfaces
- Add default values for backward compatibility

### Phase 2: Service Layer Implementation
- Implement penalty tracking in ExerciseStateService
- Update ExerciseRecordingService with penalty calculation
- Add penalty metrics methods

### Phase 3: UI Integration
- Add penalty breakdown component/section
- Update exercise detail template
- Add styling for penalty display

### Phase 4: Testing & Validation
- Unit tests for all new methods
- Integration tests for complete flow
- Manual testing of various scenarios

### Phase 5: Deployment
- Deploy to production
- Monitor for any data migration issues
- Collect user feedback on penalty system
