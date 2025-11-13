# Design Document

## Overview

This design document outlines the refactoring of the data architecture to remove `exerciseHistory` from the `UserProgress` JSON object. The refactor establishes `user_exercise_history` table as the single source of truth for exercise attempt data, while maintaining all existing functionality including progress tracking, achievements, review system, and analytics.

### Goals

1. **Eliminate Data Duplication**: Remove redundant storage of exercise attempts in UserProgress JSON
2. **Improve Scalability**: Allow unlimited exercise history without bloating UserProgress document
3. **Maintain Functionality**: Preserve all existing features without user-facing changes
4. **Optimize Performance**: Reduce UserProgress JSON size by 80%+ and improve query efficiency
5. **Safe Migration**: Migrate existing data without data loss

### Non-Goals

- Changing the UI or user experience
- Modifying the exercise completion flow
- Altering the review algorithm or spaced repetition logic
- Changing the achievement criteria

## Architecture

### Current Architecture (Before Refactor)

```
┌─────────────────────────────────────────┐
│         UserProgress (JSON)             │
├─────────────────────────────────────────┤
│ - exerciseHistory: {                    │
│     [exerciseId]: ExerciseAttempt       │
│   }                                     │
│ - totalCredits: number                  │
│ - totalPoints: number                   │
│ - currentStreak: number                 │
│ - lastStreakDate: string                │
│ - achievements: string[]                │
└─────────────────────────────────────────┘
         ↓ (duplicated data)
┌─────────────────────────────────────────┐
│   user_exercise_history (Table)         │
├─────────────────────────────────────────┤
│ - id, userId, exerciseId                │
│ - completedAt, finalScore               │
│ - timeSpentSeconds, hintsUsed           │
│ - sentenceAttempts (JSONB)              │
│ - penaltyMetrics (JSONB)                │
└─────────────────────────────────────────┘
```

### New Architecture (After Refactor)

```
┌─────────────────────────────────────────┐
│         UserProgress (JSON)             │
├─────────────────────────────────────────┤
│ - totalCredits: number                  │
│ - totalPoints: number                   │
│ - currentStreak: number                 │
│ - lastStreakDate: string                │
│ - lastActivityDate: Date                │
│ - achievements: string[]                │
│ - totalExercisesCompleted: number  ←NEW │
└─────────────────────────────────────────┘
                ↓ (queries when needed)
┌─────────────────────────────────────────┐
│   user_exercise_history (Table)         │
│   (Single Source of Truth)              │
├─────────────────────────────────────────┤
│ - id, userId, exerciseId                │
│ - completedAt, finalScore               │
│ - timeSpentSeconds, hintsUsed           │
│ - sentenceAttempts (JSONB)              │
│ - penaltyMetrics (JSONB)                │
│                                         │
│ Indexes:                                │
│ - (userId, completedAt DESC)            │
│ - (userId, exerciseId)                  │
│ - (userId, finalScore)                  │
└─────────────────────────────────────────┘
```

## Components and Interfaces

### 1. Updated UserProgress Interface

**File: `src/app/models/exercise.model.ts`**

```typescript
export interface UserProgress {
  // REMOVED: exerciseHistory: { [exerciseId: string]: ExerciseAttempt };
  totalCredits: number;
  totalPoints: number;
  lastActivityDate: Date;
  currentStreak: number;
  lastStreakDate: string; // ISO date string (YYYY-MM-DD)
  achievements: string[];
  totalExercisesCompleted: number; // NEW: Cache to avoid frequent COUNT queries
}
```

### 2. Refactored ProgressService

**File: `src/app/services/progress.service.ts`**

#### Key Changes:

**A. Remove exerciseHistory Management**

```typescript
// BEFORE
recordAttempt(attempt: ExerciseAttempt): void {
  const updatedHistory = {
    ...current.exerciseHistory,
    [attempt.exerciseId]: attempt
  };
  
  const updated: UserProgress = {
    ...current,
    exerciseHistory: updatedHistory,
    // ...
  };
}

// AFTER
recordAttempt(attempt: ExerciseAttempt): void {
  const updated: UserProgress = {
    ...current,
    totalCredits: current.totalCredits + this.calculateCredits(attempt),
    totalPoints: current.totalPoints + attempt.pointsEarned,
    lastActivityDate: new Date(),
    currentStreak: streakUpdate.currentStreak,
    lastStreakDate: streakUpdate.lastStreakDate,
    totalExercisesCompleted: current.totalExercisesCompleted + 1,
    achievements: current.achievements
  };
}
```

**B. Delegate Exercise Status to ExerciseHistoryService**

```typescript
// BEFORE
getExerciseStatus(exerciseId: string): ExerciseStatus {
  const attempt = this.progress$.value.exerciseHistory[exerciseId];
  if (!attempt) {
    return { status: 'new', attemptCount: 0 };
  }
  return {
    status: 'attempted',
    attemptCount: attempt.attemptNumber,
    bestScore: attempt.accuracyScore,
    perfectCompletions: attempt.accuracyScore === 100 ? 1 : 0
  };
}

// AFTER
getExerciseStatus(exerciseId: string): Observable<ExerciseStatus> {
  return this.exerciseHistoryService.getExerciseHistory(exerciseId).pipe(
    map(records => {
      if (records.length === 0) {
        return { status: 'new', attemptCount: 0 };
      }
      
      const bestScore = Math.max(...records.map(r => r.finalScore));
      const perfectCompletions = records.filter(r => r.finalScore === 100).length;
      
      return {
        status: 'attempted',
        attemptCount: records.length,
        bestScore,
        perfectCompletions
      };
    })
  );
}
```

**C. Refactor Achievement Checking**

```typescript
// BEFORE
private checkAchievements(progress: UserProgress): void {
  const allAttempts = Object.values(progress.exerciseHistory);
  
  if (allAttempts.length === 1 && !progress.achievements.includes('first-exercise')) {
    newAchievements.push('first-exercise');
  }
  
  const highAccuracyAttempts = allAttempts.filter(a => a.accuracyScore >= 90);
  if (highAccuracyAttempts.length >= 5 && !progress.achievements.includes('bright-mind')) {
    newAchievements.push('bright-mind');
  }
}

// AFTER
private checkAchievements(progress: UserProgress): void {
  const newAchievements: string[] = [];
  
  // First exercise - use cached count
  if (progress.totalExercisesCompleted === 1 && 
      !progress.achievements.includes('first-exercise')) {
    newAchievements.push('first-exercise');
  }
  
  // Bright mind - query from database
  if (!progress.achievements.includes('bright-mind')) {
    this.exerciseHistoryService.getHighAccuracyCount(90).subscribe(count => {
      if (count >= 5) {
        this.addAchievement('bright-mind');
      }
    });
  }
  
  // Streak achievements - use cached streak
  const streak = this.calculateStreak();
  if (streak >= 1 && !progress.achievements.includes('1-day-streak')) {
    newAchievements.push('1-day-streak');
  }
  if (streak >= 7 && !progress.achievements.includes('7-day-streak')) {
    newAchievements.push('7-day-streak');
  }
  
  // Save new achievements immediately
  if (newAchievements.length > 0) {
    this.addAchievements(newAchievements);
  }
}
```

**D. Remove Migration Logic for exerciseHistory**

```typescript
// REMOVE: migrateProgressData() logic that handles exerciseHistory
// REMOVE: calculateInitialStreak() that reads from exerciseHistory
// REMOVE: getAllAttempts() method
```

### 3. Enhanced ExerciseHistoryService

**File: `src/app/services/exercise-history.service.ts`**

#### New Methods:

```typescript
/**
 * Get count of exercises with score >= threshold
 * Used for achievement checking
 */
getHighAccuracyCount(threshold: number): Observable<number> {
  const userId = this.authService.getUserId();
  if (!userId) return of(0);
  
  return this.databaseService.loadRecentHistory(userId, 1000).pipe(
    map(records => {
      // Get unique exercises with high accuracy
      const uniqueExercises = new Set<string>();
      records.forEach(r => {
        if (r.finalScore >= threshold) {
          uniqueExercises.add(r.exerciseId);
        }
      });
      return uniqueExercises.size;
    }),
    catchError(() => of(0))
  );
}

/**
 * Get total unique exercises completed
 * Used for progress tracking
 */
getTotalExercisesCompleted(): Observable<number> {
  const userId = this.authService.getUserId();
  if (!userId) return of(0);
  
  return this.databaseService.loadAllHistory(userId).pipe(
    map(records => {
      const uniqueExercises = new Set(records.map(r => r.exerciseId));
      return uniqueExercises.size;
    }),
    catchError(() => of(0))
  );
}

/**
 * Get latest attempt for a specific exercise
 * Used for exercise status display
 */
getLatestAttempt(exerciseId: string): Observable<ExerciseHistoryRecord | null> {
  const userId = this.authService.getUserId();
  if (!userId) return of(null);
  
  return this.databaseService.loadExerciseHistory(userId, exerciseId).pipe(
    map(records => {
      if (records.length === 0) return null;
      // Return most recent
      return records.sort((a, b) => 
        b.completedAt.getTime() - a.completedAt.getTime()
      )[0];
    }),
    catchError(() => of(null))
  );
}

/**
 * Get all attempts for error pattern analysis
 * Used by ReviewService
 */
getAllAttempts(): Observable<ExerciseAttempt[]> {
  const userId = this.authService.getUserId();
  if (!userId) return of([]);
  
  return this.databaseService.loadAllHistory(userId).pipe(
    map(records => this.convertToExerciseAttempts(records)),
    catchError(() => of([]))
  );
}

/**
 * Convert ExerciseHistoryRecord to ExerciseAttempt format
 * For backward compatibility with existing code
 */
private convertToExerciseAttempts(records: ExerciseHistoryRecord[]): ExerciseAttempt[] {
  return records.map(record => ({
    exerciseId: record.exerciseId,
    attemptNumber: 1, // Not tracked in new format
    userInput: '', // Not stored in history
    accuracyScore: record.finalScore,
    pointsEarned: 0, // Not stored in history
    feedback: [], // Not stored in history
    timestamp: record.completedAt,
    hintsUsed: record.hintsUsed,
    sentenceAttempts: record.sentenceAttempts.map(sa => ({
      sentenceIndex: sa.sentenceIndex,
      userInput: sa.userTranslation,
      accuracyScore: sa.accuracyScore,
      feedback: [],
      incorrectAttempts: 0,
      retryCount: sa.retryCount
    })),
    baseScore: record.penaltyMetrics.baseScore,
    totalIncorrectAttempts: record.penaltyMetrics.totalIncorrectAttempts,
    totalRetries: record.penaltyMetrics.totalRetries,
    totalPenalty: record.penaltyMetrics.totalPenalty
  }));
}
```

### 4. Refactored ReviewService

**File: `src/app/services/review.service.ts`**

#### Key Changes:

```typescript
// BEFORE
getErrorPatterns(): Observable<ErrorPattern[]> {
  return this.progressService.getUserProgress().pipe(
    map(progress => {
      const attempts = Object.values(progress.exerciseHistory);
      return this.errorPatternAnalyzer.analyzePatterns(attempts);
    })
  );
}

// AFTER
getErrorPatterns(): Observable<ErrorPattern[]> {
  return this.exerciseHistoryService.getAllAttempts().pipe(
    map(attempts => this.errorPatternAnalyzer.analyzePatterns(attempts)),
    catchError(error => {
      console.error('[ReviewService] Error analyzing patterns:', error);
      return of([]);
    })
  );
}

// BEFORE
getIncorrectQuestions(exerciseId: string): SentenceAttempt[] {
  const progress = this.progressService.getUserProgress();
  let incorrectQuestions: SentenceAttempt[] = [];
  
  progress.subscribe(prog => {
    const attempt = prog.exerciseHistory[exerciseId];
    if (attempt && attempt.sentenceAttempts) {
      incorrectQuestions = attempt.sentenceAttempts.filter(sa => sa.accuracyScore < 75);
    }
  });
  
  return incorrectQuestions;
}

// AFTER
getIncorrectQuestions(exerciseId: string): Observable<SentenceAttempt[]> {
  return this.exerciseHistoryService.getLatestAttempt(exerciseId).pipe(
    map(record => {
      if (!record || !record.sentenceAttempts) return [];
      
      return record.sentenceAttempts
        .filter(sa => sa.accuracyScore < 75)
        .map(sa => ({
          sentenceIndex: sa.sentenceIndex,
          userInput: sa.userTranslation,
          accuracyScore: sa.accuracyScore,
          feedback: [],
          retryCount: sa.retryCount
        }));
    }),
    catchError(() => of([]))
  );
}
```

### 5. Database Service Extensions

**File: `src/app/services/database/database.interface.ts`**

```typescript
export interface IDatabase {
  // Existing methods...
  
  // NEW: Additional query methods for optimized access
  loadAllHistory(userId: string): Observable<ExerciseHistoryRecord[]>;
  countUniqueExercises(userId: string): Observable<number>;
  countHighAccuracyExercises(userId: string, threshold: number): Observable<number>;
  getLatestAttemptForExercise(userId: string, exerciseId: string): Observable<ExerciseHistoryRecord | null>;
}
```

**File: `src/app/services/database/supabase-database.service.ts`**

```typescript
loadAllHistory(userId: string): Observable<ExerciseHistoryRecord[]> {
  return from(
    this.supabase
      .from('user_exercise_history')
      .select('*')
      .eq('user_id', userId)
      .order('completed_at', { ascending: false })
  ).pipe(
    map(({ data, error }) => {
      if (error) throw error;
      return (data || []).map(this.mapToExerciseHistoryRecord);
    })
  );
}

countUniqueExercises(userId: string): Observable<number> {
  return from(
    this.supabase
      .from('user_exercise_history')
      .select('exercise_id')
      .eq('user_id', userId)
  ).pipe(
    map(({ data, error }) => {
      if (error) throw error;
      const uniqueExercises = new Set((data || []).map(r => r.exercise_id));
      return uniqueExercises.size;
    })
  );
}

countHighAccuracyExercises(userId: string, threshold: number): Observable<number> {
  return from(
    this.supabase
      .from('user_exercise_history')
      .select('exercise_id, final_score')
      .eq('user_id', userId)
      .gte('final_score', threshold)
  ).pipe(
    map(({ data, error }) => {
      if (error) throw error;
      const uniqueExercises = new Set((data || []).map(r => r.exercise_id));
      return uniqueExercises.size;
    })
  );
}

getLatestAttemptForExercise(userId: string, exerciseId: string): Observable<ExerciseHistoryRecord | null> {
  return from(
    this.supabase
      .from('user_exercise_history')
      .select('*')
      .eq('user_id', userId)
      .eq('exercise_id', exerciseId)
      .order('completed_at', { ascending: false })
      .limit(1)
      .single()
  ).pipe(
    map(({ data, error }) => {
      if (error) {
        if (error.code === 'PGRST116') return null; // No rows found
        throw error;
      }
      return data ? this.mapToExerciseHistoryRecord(data) : null;
    })
  );
}
```

## Data Models

### Updated UserProgress

```typescript
interface UserProgress {
  totalCredits: number;
  totalPoints: number;
  lastActivityDate: Date;
  currentStreak: number;
  lastStreakDate: string;
  achievements: string[];
  totalExercisesCompleted: number; // NEW
}
```

### ExerciseHistoryRecord (Unchanged)

```typescript
interface ExerciseHistoryRecord {
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
```

## Migration Strategy

### Phase 1: Data Migration on User Login

**File: `src/app/services/progress.service.ts`**

```typescript
private initializeUserProgress(): void {
  this.migrateExerciseHistoryToTable().subscribe({
    next: () => {
      this.loadFromFirestore();
    },
    error: (error) => {
      console.error('[ProgressService] Migration failed:', error);
      this.loadFromFirestore(); // Continue anyway
    }
  });
}

private migrateExerciseHistoryToTable(): Observable<void> {
  const userId = this.authService.getUserId();
  if (!userId) return of(undefined);
  
  return this.databaseService.loadProgressAuto().pipe(
    switchMap(progress => {
      if (!progress || !progress.exerciseHistory) {
        return of(undefined);
      }
      
      const exerciseHistory = progress.exerciseHistory;
      const exerciseIds = Object.keys(exerciseHistory);
      
      if (exerciseIds.length === 0) {
        return of(undefined);
      }
      
      console.log(`[ProgressService] Migrating ${exerciseIds.length} exercises to history table`);
      
      // Convert each ExerciseAttempt to ExerciseHistoryRecord
      const migrationOps = exerciseIds.map(exerciseId => {
        const attempt = exerciseHistory[exerciseId];
        
        const record: ExerciseHistoryRecord = {
          id: '',
          userId,
          exerciseId,
          completedAt: attempt.timestamp,
          finalScore: attempt.accuracyScore,
          timeSpentSeconds: 0, // Not available in old format
          hintsUsed: attempt.hintsUsed,
          sentenceAttempts: (attempt.sentenceAttempts || []).map(sa => ({
            sentenceIndex: sa.sentenceIndex,
            originalText: '',
            userTranslation: sa.userInput,
            accuracyScore: sa.accuracyScore,
            retryCount: sa.retryCount || 0,
            aiFeedback: sa.overallComment
          })),
          penaltyMetrics: {
            baseScore: attempt.baseScore || attempt.accuracyScore,
            totalIncorrectAttempts: attempt.totalIncorrectAttempts || 0,
            totalRetries: attempt.totalRetries || 0,
            totalPenalty: attempt.totalPenalty || 0,
            finalScore: attempt.accuracyScore
          },
          createdAt: attempt.timestamp
        };
        
        return this.databaseService.insertExerciseHistory(record);
      });
      
      return forkJoin(migrationOps).pipe(
        tap(() => {
          // After successful migration, clean up exerciseHistory
          this.cleanupExerciseHistory(progress);
        }),
        map(() => undefined),
        catchError(error => {
          console.error('[ProgressService] Migration error:', error);
          return of(undefined);
        })
      );
    })
  );
}

private cleanupExerciseHistory(progress: UserProgress): void {
  // Calculate totalExercisesCompleted from exerciseHistory before removing it
  const totalExercisesCompleted = Object.keys(progress.exerciseHistory || {}).length;
  
  const cleanedProgress: UserProgress = {
    totalCredits: progress.totalCredits,
    totalPoints: progress.totalPoints,
    lastActivityDate: progress.lastActivityDate,
    currentStreak: progress.currentStreak,
    lastStreakDate: progress.lastStreakDate,
    achievements: progress.achievements,
    totalExercisesCompleted
  };
  
  // Save cleaned progress
  this.databaseService.saveProgressAuto(cleanedProgress).subscribe({
    next: () => {
      console.log('[ProgressService] exerciseHistory cleaned up successfully');
      this.progress$.next(cleanedProgress);
      this.progressSignal.set(cleanedProgress);
    },
    error: (error) => {
      console.error('[ProgressService] Failed to save cleaned progress:', error);
    }
  });
}
```

### Phase 2: Backward Compatibility

During migration period, handle both formats:

```typescript
private loadFromFirestore(): void {
  this.databaseService.loadProgressAuto().subscribe({
    next: (progress) => {
      let data = progress || this.getDefaultProgress();
      
      // Handle old format with exerciseHistory
      if (data.exerciseHistory && Object.keys(data.exerciseHistory).length > 0) {
        console.log('[ProgressService] Old format detected, triggering migration');
        this.migrateExerciseHistoryToTable().subscribe();
      }
      
      // Ensure totalExercisesCompleted exists
      if (data.totalExercisesCompleted === undefined) {
        data.totalExercisesCompleted = Object.keys(data.exerciseHistory || {}).length;
      }
      
      this.progress$.next(data);
      this.progressSignal.set(data);
    }
  });
}
```

## Error Handling

### 1. Database Query Failures

```typescript
// All ExerciseHistoryService methods use catchError
getExerciseHistory(exerciseId: string): Observable<ExerciseHistoryRecord[]> {
  return this.databaseService.loadExerciseHistory(userId, exerciseId).pipe(
    retry(2), // Retry failed requests
    catchError(error => {
      console.error('[ExerciseHistoryService] Failed to load:', error);
      this.toastService.show('Không thể tải lịch sử bài tập', 'error');
      return of([]); // Return empty array to prevent crashes
    })
  );
}
```

### 2. Migration Failures

```typescript
// Migration errors are logged but don't block app usage
private migrateExerciseHistoryToTable(): Observable<void> {
  return /* migration logic */.pipe(
    catchError(error => {
      console.error('[ProgressService] Migration failed:', error);
      // Log to monitoring service if available
      this.monitoringService?.logError('migration_failed', error);
      // Continue with app - user can still practice
      return of(undefined);
    })
  );
}
```

### 3. Achievement Checking Failures

```typescript
// Achievement checks that require database queries handle errors gracefully
private checkAchievements(progress: UserProgress): void {
  this.exerciseHistoryService.getHighAccuracyCount(90).subscribe({
    next: (count) => {
      if (count >= 5 && !progress.achievements.includes('bright-mind')) {
        this.addAchievement('bright-mind');
      }
    },
    error: (error) => {
      console.error('[ProgressService] Failed to check achievements:', error);
      // Don't block - achievements will be checked on next attempt
    }
  });
}
```

## Testing Strategy

### 1. Unit Tests

**ProgressService Tests:**
- `recordAttempt()` updates only aggregate fields
- `getExerciseStatus()` delegates to ExerciseHistoryService
- `checkAchievements()` uses cached counts and database queries
- `migrateExerciseHistoryToTable()` converts data correctly
- `cleanupExerciseHistory()` removes exerciseHistory field

**ExerciseHistoryService Tests:**
- `getHighAccuracyCount()` returns correct count
- `getTotalExercisesCompleted()` counts unique exercises
- `getLatestAttempt()` returns most recent record
- `getAllAttempts()` converts records to ExerciseAttempt format
- Error handling returns empty/default values

**ReviewService Tests:**
- `getErrorPatterns()` uses ExerciseHistoryService
- `getIncorrectQuestions()` queries from database
- Caching works correctly after refactor

### 2. Integration Tests

**Migration Tests:**
- Old format with exerciseHistory migrates successfully
- Migrated data matches original data
- exerciseHistory is removed after migration
- totalExercisesCompleted is calculated correctly

**End-to-End Tests:**
- Complete exercise → data saved to history table
- Exercise status displays correctly
- Achievements are awarded correctly
- Review system functions properly
- Dashboard analytics show correct data

### 3. Performance Tests

- UserProgress load time < 100ms
- Exercise status query < 200ms
- Achievement check < 500ms
- Dashboard analytics < 1s

## Performance Optimization

### 1. Caching Strategy

```typescript
// Cache totalExercisesCompleted in UserProgress
// Update on each new exercise completion
recordAttempt(attempt: ExerciseAttempt): void {
  const updated: UserProgress = {
    ...current,
    totalExercisesCompleted: current.totalExercisesCompleted + 1
  };
}
```

### 2. Database Indexes

```sql
-- Existing indexes
CREATE INDEX idx_user_exercise_history_user_completed 
  ON user_exercise_history(user_id, completed_at DESC);

CREATE INDEX idx_user_exercise_history_exercise 
  ON user_exercise_history(user_id, exercise_id);

-- NEW: Index for high accuracy queries
CREATE INDEX idx_user_exercise_history_score 
  ON user_exercise_history(user_id, final_score DESC);
```

### 3. Query Optimization

```typescript
// Use LIMIT for recent history queries
loadRecentHistory(userId: string, limit: number = 10): Observable<ExerciseHistoryRecord[]> {
  return from(
    this.supabase
      .from('user_exercise_history')
      .select('*')
      .eq('user_id', userId)
      .order('completed_at', { ascending: false })
      .limit(limit) // Limit results for performance
  );
}
```

## Rollback Plan

If issues arise, rollback is possible:

1. **Keep old code in feature branch** for quick revert
2. **Database table remains intact** - no data loss
3. **Re-enable exerciseHistory** in UserProgress interface
4. **Restore migration logic** to populate exerciseHistory from table
5. **Deploy rollback** within 1 hour if critical issues detected

## Success Metrics

- ✅ UserProgress JSON size reduced by 80%+
- ✅ All existing features work without user-facing changes
- ✅ No data loss during migration
- ✅ Performance improvements in load times
- ✅ All tests passing
- ✅ Zero critical bugs in production after 1 week

## Timeline

- **Week 1**: Implement core refactoring (ProgressService, ExerciseHistoryService)
- **Week 2**: Refactor dependent services (ReviewService, Achievement logic)
- **Week 3**: Implement migration logic and testing
- **Week 4**: QA, performance testing, and deployment
