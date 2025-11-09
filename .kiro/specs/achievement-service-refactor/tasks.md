# Implementation Plan

- [x] 1. Create configuration and utility modules


  - Create `src/app/models/achievement-config.ts` with all threshold definitions
  - Create `src/app/utils/achievement-utils.ts` with pure utility functions
  - Extract category extraction logic to utilities
  - Extract date comparison utilities
  - Extract score calculation utilities
  - Extract grouping utilities
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 8.1, 8.2, 8.3, 8.4, 8.5_

- [x] 2. Create AchievementCriteriaService


  - Create `src/app/services/achievement-criteria.service.ts`
  - Implement `checkCriteria()` main method
  - Implement `checkMilestoneCriteria()` method
  - Implement `checkStreakCriteria()` method
  - Implement `checkPerformanceCriteria()` method
  - Implement `checkCategoryMasterCriteria()` method
  - Use `AchievementConfig` for all thresholds
  - Use `AchievementUtils` for common operations
  - Ensure all methods are pure functions (no side effects)
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 2.1 Write unit tests for AchievementCriteriaService


  - Test milestone criteria evaluation
  - Test streak criteria evaluation
  - Test performance criteria evaluation
  - Test category master criteria evaluation
  - Test edge cases (null, undefined, empty arrays)
  - Test boundary conditions
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 3. Create AchievementProgressService


  - Create `src/app/services/achievement-progress.service.ts`
  - Implement `calculateProgress()` main method
  - Implement `calculateMilestoneProgress()` method
  - Implement `calculateStreakProgress()` method
  - Implement `calculatePerformanceProgress()` method
  - Implement `calculateCategoryProgress()` method
  - Use `AchievementConfig` for thresholds
  - Use `AchievementUtils` for calculations
  - Handle edge cases gracefully with safe defaults
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 3.1 Write unit tests for AchievementProgressService


  - Test progress calculations for each achievement type
  - Test percentage calculations
  - Test description generation
  - Test error handling and safe defaults
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 4. Create AchievementStoreService


  - Create `src/app/services/achievement-store.service.ts`
  - Implement `loadAchievementData()` method
  - Implement `saveAchievementData()` method
  - Implement `migrateFromLocalStorage()` method
  - Implement `getDefaultUserData()` method
  - Wrap `DatabaseService` for achievement-specific operations
  - Return Observables for all async operations
  - Add error handling with catchError
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 4.1 Write unit tests for AchievementStoreService


  - Mock DatabaseService
  - Test load operations
  - Test save operations
  - Test migration logic
  - Test error handling
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 5. Refactor AchievementService to use new services


  - Inject `AchievementCriteriaService`
  - Inject `AchievementProgressService`
  - Inject `AchievementStoreService`
  - Replace `checkCriteria()` with `criteriaService.checkCriteria()`
  - Replace `calculateProgress()` with `progressService.calculateProgress()`
  - Replace direct Firestore calls with `storeService` methods
  - Replace `checkAndMigrateData()` with `storeService.migrateFromLocalStorage()`
  - Keep evaluation queue and debouncing logic in main service
  - Keep signal management in main service
  - Keep notification coordination in main service
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_

- [x] 6. Remove redundant code from AchievementService

  - Remove inline `checkMilestoneCriteria()` method
  - Remove inline `checkStreakCriteria()` method
  - Remove inline `checkPerformanceCriteria()` method
  - Remove inline `checkCategoryMasterCriteria()` method
  - Remove inline `calculateProgress()` method
  - Remove inline `getMilestoneThreshold()` method
  - Remove inline `getStreakThreshold()` method
  - Remove duplicate `extractCategoryFromExerciseId()` method
  - Remove commented-out code in `performInitialEvaluation()`
  - Remove excessive console.log statements (keep error logs)
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [x] 7. Optimize Firestore write operations

  - Update `updateProgress()` to accept `saveToFirestore` parameter (already exists)
  - Only save progress when achievements unlock (not on every progress update)
  - Batch progress updates within evaluation cycle
  - Remove redundant saves in `processEvaluationQueue()`
  - _Requirements: 1.5, 6.6_

- [x] 8. Simplify complex methods

  - Break down `checkPerformanceCriteria()` into smaller helper methods (now in CriteriaService)
  - Reduce nesting in evaluation methods using early returns
  - Extract complex conditionals into named functions
  - Simplify `claimRewards()` error handling
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [x] 9. Integration testing


  - Test full flow: progress update → evaluation → unlock → save
  - Test migration from localStorage to Firestore
  - Test reward claiming flow
  - Test concurrent evaluations (debouncing)
  - Verify no regressions in existing functionality
  - _Requirements: 1.5, 5.4, 6.6_

- [ ] 10. Final cleanup and documentation


  - Add JSDoc comments to public methods
  - Update service documentation
  - Verify all public APIs remain unchanged
  - Run linter and fix any issues
  - Verify code coverage meets 80% target
  - Remove any remaining TODO comments
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_
