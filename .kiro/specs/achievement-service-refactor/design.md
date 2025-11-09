# Design Document

## Overview

This design outlines the refactoring of the monolithic `AchievementService` (800+ lines) into a modular, maintainable architecture following Angular best practices and SOLID principles. The refactoring will create four specialized services and two utility modules, each with a single, well-defined responsibility.

### Goals
- Break down the monolithic service into smaller, focused services
- Improve testability by creating stateless, pure evaluation logic
- Centralize configuration for easy maintenance
- Remove redundant and dead code
- Maintain all existing functionality and API compatibility

### Non-Goals
- Changing the achievement data model
- Modifying the UI components that consume the service
- Adding new achievement types or features
- Changing the Firestore data structure

## Architecture

### Current Architecture Problems

1. **Single Responsibility Violation**: The current `AchievementService` handles:
   - Achievement initialization and state management
   - Criteria evaluation for 4 different achievement types
   - Progress calculation and tracking
   - Data persistence and migration
   - Reward claiming logic
   - Notification coordination

2. **Code Duplication**: 
   - Category extraction logic repeated multiple times
   - Threshold mappings duplicated across methods
   - Similar validation patterns repeated

3. **Testability Issues**:
   - Tightly coupled logic makes unit testing difficult
   - Side effects mixed with pure calculations
   - Hard to mock dependencies

4. **Maintainability Issues**:
   - Long methods (100+ lines)
   - Deep nesting (4-5 levels)
   - Magic numbers scattered throughout
   - Commented-out code and disabled features

### Proposed Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    AchievementService                        │
│                    (Facade/Coordinator)                      │
│  - Manages signals and reactive state                       │
│  - Coordinates evaluation queue and debouncing              │
│  - Triggers notifications                                   │
│  - Delegates to specialized services                        │
└────────┬────────────┬────────────┬──────────────────────────┘
         │            │            │
         ▼            ▼            ▼
┌────────────┐ ┌─────────────┐ ┌──────────────┐
│ Criteria   │ │  Progress   │ │    Store     │
│ Service    │ │  Service    │ │   Service    │
└────────────┘ └─────────────┘ └──────────────┘
      │              │                  │
      │              │                  │
      ▼              ▼                  ▼
┌──────────────────────────────────────────────┐
│         Achievement Config & Utils            │
│  - Thresholds and criteria definitions       │
│  - Pure utility functions                    │
└──────────────────────────────────────────────┘
```

## Components and Interfaces

### 1. AchievementCriteriaService

**Purpose**: Stateless service for evaluating achievement criteria

**Responsibilities**:
- Evaluate if achievement criteria are met
- Provide type-specific evaluation methods
- Use pure functions with no side effects

**Public API**:
```typescript
@Injectable({ providedIn: 'root' })
export class AchievementCriteriaService {
  // Main evaluation method
  checkCriteria(achievement: Achievement, progress: UserProgress): boolean

  // Type-specific evaluators
  checkMilestoneCriteria(achievement: Achievement, progress: UserProgress): boolean
  checkStreakCriteria(achievement: Achievement, progress: UserProgress): boolean
  checkPerformanceCriteria(achievement: Achievement, progress: UserProgress): boolean
  checkCategoryMasterCriteria(achievement: Achievement, progress: UserProgress): boolean
}
```

**Key Design Decisions**:
- All methods are pure functions (no state, no side effects)
- Uses `AchievementUtils` for common operations
- Uses `AchievementConfig` for thresholds
- Each achievement type has its own evaluation method
- Returns simple boolean results

### 2. AchievementProgressService

**Purpose**: Calculate progress for achievements

**Responsibilities**:
- Calculate current/required/percentage for achievements
- Generate progress descriptions
- Handle edge cases gracefully

**Public API**:
```typescript
@Injectable({ providedIn: 'root' })
export class AchievementProgressService {
  // Main progress calculation
  calculateProgress(achievement: Achievement, progress: UserProgress): AchievementProgress

  // Type-specific calculators
  calculateMilestoneProgress(achievement: Achievement, progress: UserProgress): AchievementProgress
  calculateStreakProgress(achievement: Achievement, progress: UserProgress): AchievementProgress
  calculatePerformanceProgress(achievement: Achievement, progress: UserProgress): AchievementProgress
  calculateCategoryProgress(achievement: Achievement, progress: UserProgress): AchievementProgress
}
```

**Key Design Decisions**:
- Stateless service with pure functions
- Returns `AchievementProgress` objects
- Uses configuration for thresholds
- Handles null/undefined gracefully
- Provides meaningful progress descriptions

### 3. AchievementStoreService

**Purpose**: Handle all data persistence operations

**Responsibilities**:
- Load/save achievement data from/to Firestore
- Handle localStorage migration
- Manage `UserAchievementData` synchronization
- Provide Observable-based async operations

**Public API**:
```typescript
@Injectable({ providedIn: 'root' })
export class AchievementStoreService {
  // Data operations
  loadAchievementData(): Observable<UserAchievementData | null>
  saveAchievementData(data: UserAchievementData): Observable<void>
  
  // Migration
  migrateFromLocalStorage(): Observable<void>
  
  // Helpers
  getDefaultUserData(): UserAchievementData
}
```

**Key Design Decisions**:
- Wraps `DatabaseService` for achievement-specific operations
- Handles migration logic internally
- Returns Observables for all async operations
- Provides default data structure
- Logs operations for debugging

### 4. Refactored AchievementService

**Purpose**: Coordinate achievement system and manage state

**Responsibilities**:
- Manage reactive state (signals)
- Coordinate evaluation queue and debouncing
- Delegate to specialized services
- Trigger notifications
- Provide public API for components

**Public API** (unchanged from current):
```typescript
@Injectable({ providedIn: 'root' })
export class AchievementService {
  // Signals
  unlockedAchievements: Signal<Achievement[]>
  lockedAchievements: Signal<Achievement[]>
  
  // Main operations
  evaluateAchievements(progress: UserProgress): void
  claimRewards(achievementId: string): void
  
  // Getters
  getAllAchievements(): Achievement[]
  getAchievementById(id: string): Achievement | undefined
  
  // Admin
  resetAchievements(): void
}
```

**Key Design Decisions**:
- Maintains backward compatibility
- Delegates evaluation to `AchievementCriteriaService`
- Delegates progress to `AchievementProgressService`
- Delegates persistence to `AchievementStoreService`
- Keeps evaluation queue and debouncing logic
- Manages signals for reactive updates

### 5. AchievementConfig (Configuration Module)

**Purpose**: Centralize all achievement configuration

**Structure**:
```typescript
// achievement-config.ts
export const ACHIEVEMENT_THRESHOLDS = {
  milestone: {
    'first-step': 1,
    'getting-started': 10,
    'dedicated-learner': 50,
    // ... all milestone thresholds
  },
  streak: {
    'week-warrior': 7,
    'month-master': 30,
    // ... all streak thresholds
  },
  category: {
    masterRequirement: 150,
    perfectAverageRequirement: 95,
    perfectMinExercises: 100
  }
};

export const ACHIEVEMENT_CATEGORIES = [
  'daily-life',
  'travel-transportation',
  'education-work',
  'health-wellness',
  'society-services',
  'culture-arts',
  'science-environment',
  'philosophy-beliefs'
];

export const DIFFICULTY_LEVELS = ['beginner', 'intermediate', 'advanced'];
```

**Key Design Decisions**:
- Single source of truth for all thresholds
- Easy to modify without touching service code
- Type-safe with TypeScript
- Exported as constants for tree-shaking

### 6. AchievementUtils (Utility Module)

**Purpose**: Provide reusable utility functions

**Functions**:
```typescript
// achievement-utils.ts

// Category extraction
export function extractCategoryFromExerciseId(exerciseId: string): string | null

// Date utilities
export function getDateString(date: Date): string
export function isSameDay(date1: Date, date2: Date): boolean
export function isConsecutiveDay(date1: Date, date2: Date): boolean

// Score calculations
export function calculateAverageScore(attempts: ExerciseAttempt[]): number
export function getScoresForCategory(attempts: ExerciseAttempt[], category: string): number[]

// Grouping utilities
export function groupAttemptsByCategory(attempts: ExerciseAttempt[]): Map<string, ExerciseAttempt[]>
export function groupAttemptsByDate(attempts: ExerciseAttempt[]): Map<string, ExerciseAttempt[]>
export function groupAttemptsByExercise(attempts: ExerciseAttempt[]): Map<string, ExerciseAttempt[]>

// Validation
export function isValidAttempt(attempt: ExerciseAttempt): boolean
export function hasValidScore(attempt: ExerciseAttempt): boolean
```

**Key Design Decisions**:
- All functions are pure (no side effects)
- Exported as standalone functions
- Well-tested and reusable
- Handle edge cases (null, undefined, invalid data)

## Data Models

No changes to existing data models. The refactoring maintains compatibility with:
- `Achievement`
- `AchievementProgress`
- `UserAchievementData`
- `UserProgress`
- `ExerciseAttempt`

## Error Handling

### Strategy
1. **Validation at Boundaries**: Validate data when entering the system
2. **Graceful Degradation**: Return safe defaults on errors
3. **Logging**: Log errors for debugging without breaking functionality
4. **Observable Error Handling**: Use RxJS `catchError` for async operations

### Implementation

**Criteria Evaluation**:
```typescript
// Return false on error, log for debugging
try {
  return this.evaluateComplexCriteria(achievement, progress);
} catch (error) {
  console.error('[AchievementCriteriaService] Evaluation error:', error);
  return false;
}
```

**Progress Calculation**:
```typescript
// Return safe default progress on error
try {
  return this.calculateComplexProgress(achievement, progress);
} catch (error) {
  console.error('[AchievementProgressService] Calculation error:', error);
  return {
    achievementId: achievement.id,
    current: 0,
    required: 1,
    percentage: 0,
    description: 'Unable to calculate progress',
    lastUpdated: new Date()
  };
}
```

**Data Persistence**:
```typescript
// Use RxJS catchError for Observables
return this.databaseService.saveAchievementsAuto(data).pipe(
  catchError((error: Error) => {
    console.error('[AchievementStoreService] Save failed:', error);
    return of(undefined); // Continue without breaking
  })
);
```

## Testing Strategy

### Unit Testing Approach

**AchievementCriteriaService**:
- Test each achievement type independently
- Test edge cases (empty arrays, null values, invalid data)
- Test boundary conditions (exactly at threshold)
- Mock `AchievementConfig` and `AchievementUtils`

**AchievementProgressService**:
- Test progress calculations for each type
- Test percentage calculations
- Test description generation
- Verify safe defaults on errors

**AchievementStoreService**:
- Mock `DatabaseService`
- Test load/save operations
- Test migration logic
- Test error handling

**AchievementService**:
- Mock all injected services
- Test coordination logic
- Test evaluation queue and debouncing
- Test signal updates
- Test notification triggering

**AchievementUtils**:
- Test each utility function independently
- Test edge cases and invalid inputs
- Test date calculations across timezones
- Test grouping functions with various data

### Integration Testing

- Test full flow: progress update → evaluation → unlock → save
- Test migration from localStorage to Firestore
- Test reward claiming flow
- Test concurrent evaluations (race conditions)

## Migration Strategy

### Phase 1: Create New Services (No Breaking Changes)
1. Create `AchievementConfig` and `AchievementUtils`
2. Create `AchievementCriteriaService` (extract evaluation logic)
3. Create `AchievementProgressService` (extract progress logic)
4. Create `AchievementStoreService` (extract persistence logic)
5. Add unit tests for new services

### Phase 2: Refactor AchievementService
1. Inject new services into `AchievementService`
2. Replace inline logic with service calls
3. Remove duplicated code
4. Clean up commented code
5. Simplify methods

### Phase 3: Cleanup
1. Remove unused methods
2. Remove console.log statements (keep error logs)
3. Update documentation
4. Run full test suite
5. Verify no regressions

### Rollback Plan
- Keep original `AchievementService` in git history
- Feature flag for new implementation (if needed)
- Monitor error logs after deployment
- Quick rollback if issues detected

## Performance Considerations

### Optimizations

1. **Debouncing**: Keep existing 500ms debounce for evaluations
2. **Batch Saves**: Save progress updates once per evaluation cycle
3. **Lazy Evaluation**: Only calculate progress for locked achievements
4. **Memoization**: Cache category groupings within evaluation cycle
5. **Signal Updates**: Use Angular signals for efficient change detection

### Firestore Write Reduction

Current issues:
- Progress updates trigger saves even when no achievements unlock
- Multiple saves per evaluation cycle

Solutions:
- Only save when achievements unlock or progress changes significantly
- Batch multiple updates into single Firestore write
- Use local state for progress bars (no need to persist)

## Code Cleanup Items

### Remove
1. Commented-out "retroactive unlock" feature in `performInitialEvaluation()`
2. Duplicate `extractCategoryFromExerciseId()` logic
3. Excessive console.log statements (keep error logs only)
4. Unused `isInitialized` flag logic
5. Redundant validation checks

### Consolidate
1. Threshold mappings into `AchievementConfig`
2. Category extraction into `AchievementUtils`
3. Date comparison logic into `AchievementUtils`
4. Score calculation logic into `AchievementUtils`

### Simplify
1. Reduce nesting in `checkPerformanceCriteria()` (currently 4-5 levels)
2. Break down long methods (100+ lines) into smaller functions
3. Extract complex conditionals into named functions
4. Use early returns to reduce nesting

## Dependencies

### External Dependencies
- `@angular/core`: Dependency injection, signals, effects
- `rxjs`: Observable operations
- `DatabaseService`: Firestore operations
- `AuthService`: User authentication
- `ProgressService`: User progress data
- `NotificationService`: Achievement notifications
- `RewardService`: Reward granting

### Internal Dependencies
```
AchievementService
  ├── AchievementCriteriaService
  │     ├── AchievementConfig
  │     └── AchievementUtils
  ├── AchievementProgressService
  │     ├── AchievementConfig
  │     └── AchievementUtils
  └── AchievementStoreService
        └── DatabaseService
```

## Backward Compatibility

### Maintained APIs
- All public methods of `AchievementService` remain unchanged
- Signal names and types remain the same
- Component integration points unchanged
- Firestore data structure unchanged

### Internal Changes Only
- Service decomposition is internal implementation detail
- No changes required in consuming components
- No changes to achievement data model
- No changes to UI

## Success Criteria

1. **Code Quality**:
   - `AchievementService` reduced to < 300 lines
   - No method longer than 50 lines
   - No nesting deeper than 3 levels
   - All magic numbers moved to configuration

2. **Testability**:
   - 80%+ code coverage for new services
   - All criteria evaluation logic unit tested
   - All progress calculations unit tested

3. **Functionality**:
   - All existing achievements still work
   - No regressions in unlock behavior
   - Migration from localStorage works
   - Reward claiming works correctly

4. **Performance**:
   - No increase in evaluation time
   - Reduced Firestore writes (< 50% of current)
   - No memory leaks

5. **Maintainability**:
   - Easy to add new achievement types
   - Easy to modify thresholds
   - Clear separation of concerns
   - Well-documented code
