# Design Document

## Overview

The Exercise History System is a standalone feature that tracks and displays detailed information about user exercise attempts. It operates independently from existing progress tracking (`user_progress`) and spaced repetition (`user_reviews`) systems, storing comprehensive attempt data in a dedicated table. The system provides dashboard analytics showing practice patterns, performance trends, and activity timelines.

**Key Design Principles:**
- **Independence**: No dependencies on or from existing features
- **Non-invasive**: Existing code continues to work if this feature is removed
- **Performance**: Efficient queries with proper indexing
- **Security**: Row-level security ensures data privacy

## Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                    Exercise Detail Component                 │
│  (Triggers history recording on exercise completion)         │
└────────────────────┬────────────────────────────────────────┘
                     │
                     │ (on complete)
                     ▼
┌─────────────────────────────────────────────────────────────┐
│              Exercise History Service                        │
│  - recordExerciseAttempt()                                   │
│  - getRecentHistory()                                        │
│  - getStatistics()                                           │
│  - getActivityTimeline()                                     │
└────────────────────┬────────────────────────────────────────┘
                     │
                     │ (CRUD operations)
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                    Supabase Database                         │
│              user_exercise_history table                     │
│  - id, user_id, exercise_id, completed_at                    │
│  - final_score, time_spent_seconds, hints_used              │
│  - sentence_attempts (JSONB)                                 │
│  - penalty_metrics (JSONB)                                   │
└────────────────────┬────────────────────────────────────────┘
                     │
                     │ (query)
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                  Dashboard Component                         │
│  - Recent History Widget                                     │
│  - Practice Statistics Widget                                │
│  - Activity Timeline Widget                                  │
└─────────────────────────────────────────────────────────────┘
```

### Integration Points

**Single Integration Point:**
- `ExerciseDetailComponent.completeExercise()` - After recording attempt to `ProgressService`, optionally call `ExerciseHistoryService.recordExerciseAttempt()`

**No Changes Required To:**
- `ProgressService` - Continues to work independently
- `ReviewService` - Continues to work independently
- Any other existing services or components

## Components and Interfaces

### 1. Database Schema

**Table: `user_exercise_history`**

```sql
CREATE TABLE user_exercise_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  exercise_id TEXT NOT NULL,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Performance metrics
  final_score INTEGER NOT NULL CHECK (final_score >= 0 AND final_score <= 100),
  time_spent_seconds INTEGER NOT NULL CHECK (time_spent_seconds >= 0),
  hints_used INTEGER NOT NULL DEFAULT 0,
  
  -- Detailed attempt data (JSONB for flexibility)
  sentence_attempts JSONB NOT NULL,
  penalty_metrics JSONB NOT NULL,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_user_exercise_history_user_id 
  ON user_exercise_history(user_id);
  
CREATE INDEX idx_user_exercise_history_completed_at 
  ON user_exercise_history(user_id, completed_at DESC);
  
CREATE INDEX idx_user_exercise_history_exercise_id 
  ON user_exercise_history(exercise_id);

-- Row Level Security
ALTER TABLE user_exercise_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own history"
  ON user_exercise_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own history"
  ON user_exercise_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);
```

### 2. TypeScript Interfaces

**File: `src/app/models/exercise-history.model.ts`**

```typescript
/**
 * Sentence-level attempt data stored in history
 */
export interface HistorySentenceAttempt {
  sentenceIndex: number;
  originalText: string;
  userTranslation: string;
  accuracyScore: number;
  retryCount: number;
  aiFeedback?: string;
}

/**
 * Penalty metrics for the exercise attempt
 */
export interface HistoryPenaltyMetrics {
  baseScore: number;
  totalIncorrectAttempts: number;
  totalRetries: number;
  totalPenalty: number;
  finalScore: number;
}

/**
 * Complete exercise history record
 */
export interface ExerciseHistoryRecord {
  id: string;
  userId: string;
  exerciseId: string;
  completedAt: Date;
  finalScore: number;
  timeSpentSeconds: number;
  hintsUsed: number;
  sentenceAttempts: HistorySentenceAttempt[];
  penaltyMetrics: HistoryPenaltyMetrics;
  createdAt: Date;
}

/**
 * Statistics calculated from history
 */
export interface ExerciseHistoryStats {
  totalExercisesCompleted: number;
  averageAccuracy: number;
  totalTimeSpentMinutes: number;
  averageTimePerExercise: number;
  bestPerformances: Array<{
    exerciseId: string;
    exerciseTitle: string;
    score: number;
    completedAt: Date;
  }>;
  mostPracticed: Array<{
    exerciseId: string;
    exerciseTitle: string;
    attemptCount: number;
  }>;
}

/**
 * Activity timeline data point
 */
export interface ActivityTimelineData {
  date: string; // YYYY-MM-DD format
  completionCount: number;
}
```

### 3. Exercise History Service

**File: `src/app/services/exercise-history.service.ts`**

```typescript
@Injectable({
  providedIn: 'root'
})
export class ExerciseHistoryService {
  private databaseService = inject(DatabaseService);
  private authService = inject(AuthService);
  private exerciseService = inject(ExerciseService);

  /**
   * Record a completed exercise attempt
   * Called from ExerciseDetailComponent after exercise completion
   */
  recordExerciseAttempt(
    exerciseId: string,
    finalScore: number,
    timeSpentSeconds: number,
    hintsUsed: number,
    sentences: SentenceState[],
    penaltyMetrics: PenaltyMetrics
  ): Observable<void>

  /**
   * Get recent exercise history (last 10 attempts)
   */
  getRecentHistory(limit: number = 10): Observable<ExerciseHistoryRecord[]>

  /**
   * Get statistics from exercise history
   */
  getStatistics(): Observable<ExerciseHistoryStats>

  /**
   * Get activity timeline for a date range
   */
  getActivityTimeline(
    startDate: Date,
    endDate: Date
  ): Observable<ActivityTimelineData[]>

  /**
   * Get history for a specific exercise
   */
  getExerciseHistory(exerciseId: string): Observable<ExerciseHistoryRecord[]>
}
```

### 4. Dashboard Widgets

**New Components (Optional Imports):**

1. **Recent History Widget** (`recent-history-widget/recent-history-widget.ts`)
   - Displays last 10 exercise attempts
   - Shows: title, date, score, time, hints
   - Click to navigate to exercise review mode

2. **Practice Statistics Widget** (`practice-stats-widget/practice-stats-widget.ts`)
   - Total exercises completed
   - Average accuracy
   - Total time spent
   - Best performances (top 5)
   - Most practiced (top 5)

3. **Activity Timeline Widget** (`activity-timeline-widget/activity-timeline-widget.ts`)
   - Simple list or chart showing daily completion counts
   - Filtered by selected time range (7d, 30d, 90d)

## Data Models

### JSONB Structure for `sentence_attempts`

```json
[
  {
    "sentenceIndex": 0,
    "originalText": "The quick brown fox jumps over the lazy dog.",
    "userTranslation": "Con cáo nâu nhanh nhảy qua con chó lười.",
    "accuracyScore": 95,
    "retryCount": 0,
    "aiFeedback": "Excellent translation! Very natural Vietnamese."
  },
  {
    "sentenceIndex": 1,
    "originalText": "She sells seashells by the seashore.",
    "userTranslation": "Cô ấy bán vỏ sò ở bờ biển.",
    "accuracyScore": 85,
    "retryCount": 1,
    "aiFeedback": "Good translation. Consider using 'ven biển' for more natural phrasing."
  }
]
```

### JSONB Structure for `penalty_metrics`

```json
{
  "baseScore": 90,
  "totalIncorrectAttempts": 2,
  "totalRetries": 1,
  "totalPenalty": 5,
  "finalScore": 85
}
```

## Error Handling

### Service Layer

```typescript
recordExerciseAttempt(...): Observable<void> {
  return this.databaseService.insertExerciseHistory(data).pipe(
    catchError(error => {
      console.error('[ExerciseHistoryService] Failed to record attempt:', error);
      // Don't throw - history recording should not block exercise completion
      return of(undefined);
    })
  );
}
```

### Component Layer

```typescript
// In ExerciseDetailComponent.completeExercise()
private completeExercise(): void {
  // Existing code...
  this.recordingService.recordAttempt(ex, this.hintsShown(), this.exercisePoints());
  
  // Optional history recording - failure won't affect exercise completion
  this.exerciseHistoryService.recordExerciseAttempt(
    ex.id,
    finalScore,
    timeSpent,
    hintsUsed,
    sentences,
    penaltyMetrics
  ).subscribe({
    error: (err) => console.warn('[ExerciseDetail] History recording failed:', err)
  });
  
  // Continue with existing completion logic...
}
```

### Database Layer

- RLS policies prevent unauthorized access
- Foreign key constraints ensure data integrity
- Check constraints validate score ranges
- Graceful degradation if table doesn't exist

## Testing Strategy

### Unit Tests

**ExerciseHistoryService Tests:**
- `recordExerciseAttempt()` creates correct database record
- `getRecentHistory()` returns sorted results
- `getStatistics()` calculates correct averages
- `getActivityTimeline()` groups by date correctly
- Error handling doesn't throw exceptions

**Widget Component Tests:**
- Components render with empty data
- Components render with sample data
- Click handlers navigate correctly
- Loading states display properly

### Integration Tests

**Database Integration:**
- RLS policies enforce user isolation
- Indexes improve query performance
- JSONB queries work correctly
- Cascade deletes work when user is deleted

**End-to-End Flow:**
1. Complete an exercise
2. Verify history record created
3. Navigate to dashboard
4. Verify widgets display new data
5. Click on history item
6. Verify navigation to exercise review

### Manual Testing Checklist

- [ ] Complete exercise → history recorded
- [ ] Dashboard shows recent history
- [ ] Statistics calculate correctly
- [ ] Activity timeline displays properly
- [ ] RLS prevents viewing other users' data
- [ ] Feature can be removed without errors
- [ ] Existing features work without history service

## Performance Considerations

### Database Optimization

1. **Indexes:**
   - `(user_id, completed_at DESC)` - Fast recent history queries
   - `(user_id)` - Fast user-specific queries
   - `(exercise_id)` - Fast exercise-specific queries

2. **Query Limits:**
   - Recent history: LIMIT 10
   - Best performances: LIMIT 5
   - Most practiced: LIMIT 5

3. **JSONB Storage:**
   - Efficient storage for variable-length arrays
   - Fast queries with GIN indexes (if needed later)

### Frontend Optimization

1. **Lazy Loading:**
   - Dashboard widgets load independently
   - History service only imported where needed

2. **Caching:**
   - Cache recent history for 5 minutes
   - Invalidate on new completion

3. **Async Operations:**
   - History recording doesn't block UI
   - Dashboard widgets load in parallel

## Migration Strategy

### Database Migration

**File: `supabase-migrations/06-create-exercise-history-table.sql`**

```sql
-- Create exercise history table
-- This migration is independent and can be rolled back without affecting other tables

CREATE TABLE IF NOT EXISTS user_exercise_history (
  -- Schema as defined above
);

-- Create indexes
-- Create RLS policies
```

### Code Migration

**Phase 1: Add Service (No UI Changes)**
1. Create `exercise-history.model.ts`
2. Create `exercise-history.service.ts`
3. Add database methods to `DatabaseService`
4. No changes to existing components

**Phase 2: Integrate Recording**
1. Add optional call in `ExerciseDetailComponent.completeExercise()`
2. Wrap in try-catch to prevent errors
3. Test that existing flow still works

**Phase 3: Add Dashboard Widgets**
1. Create widget components
2. Add to `DashboardComponent` as optional imports
3. Test that dashboard works without widgets

### Rollback Plan

**To Remove Feature:**
1. Remove widget imports from `DashboardComponent`
2. Remove history service call from `ExerciseDetailComponent`
3. Delete widget component files
4. Delete `exercise-history.service.ts`
5. Delete `exercise-history.model.ts`
6. Drop `user_exercise_history` table

**Verification:**
- Run application
- Complete an exercise
- View dashboard
- Confirm no errors in console

## Security Considerations

### Row Level Security

```sql
-- Users can only view their own history
CREATE POLICY "Users can view own history"
  ON user_exercise_history FOR SELECT
  USING (auth.uid() = user_id);

-- Users can only insert their own history
CREATE POLICY "Users can insert own history"
  ON user_exercise_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- No update or delete policies (history is immutable)
```

### Data Validation

**Service Layer:**
- Validate `user_id` matches authenticated user
- Validate score range (0-100)
- Validate time spent is positive
- Sanitize exercise ID

**Database Layer:**
- CHECK constraints on score and time
- NOT NULL constraints on required fields
- Foreign key to users table

### Privacy

- History data is user-specific
- No cross-user queries
- Cascade delete when user account deleted
- No PII stored in sentence attempts

## Future Enhancements

**Potential Additions (Not in Current Scope):**
1. Export history to CSV/JSON
2. Compare performance across exercises
3. Identify improvement trends over time
4. Share achievements based on history
5. Detailed sentence-level analytics
6. Time-of-day performance patterns
7. Category-specific statistics

**Extension Points:**
- Add more fields to `ExerciseHistoryRecord`
- Create additional indexes for new queries
- Add computed columns for common aggregations
- Implement materialized views for complex analytics
