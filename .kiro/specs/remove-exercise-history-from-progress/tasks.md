# Implementation Plan

- [x] 1. Update UserProgress interface and add new database methods





  - Update `UserProgress` interface in `src/app/models/exercise.model.ts` to remove `exerciseHistory` field
  - Add `totalExercisesCompleted: number` field to UserProgress interface
  - Update `getDefaultProgress()` in ProgressService to include `totalExercisesCompleted: 0`
  - Add new method signatures to `IDatabase` interface in `src/app/services/database/database.interface.ts`: `loadAllHistory()`, `countUniqueExercises()`, `countHighAccuracyExercises()`, `getLatestAttemptForExercise()`
  - _Requirements: 1.1, 1.4, 2.4_

- [-] 2. Implement new database query methods in SupabaseDatabase

  - Implement `loadAllHistory(userId)` in `src/app/services/database/supabase-database.service.ts` to fetch all exercise history records for a user
  - Implement `countUniqueExercises(userId)` to count distinct exercise_id values
  - Implement `countHighAccuracyExercises(userId, threshold)` to count unique exercises with final_score >= threshold
  - Implement `getLatestAttemptForExercise(userId, exerciseId)` to fetch the most recent attempt using `.limit(1).single()`
  - Add proper error handling with catchError for all new methods
  - _Requirements: 1.3, 5.1, 5.2_

- [ ] 3. Enhance ExerciseHistoryService with new query methods
  - Add `getHighAccuracyCount(threshold: number): Observable<number>` method to ExerciseHistoryService
  - Add `getTotalExercisesCompleted(): Observable<number>` method
  - Add `getLatestAttempt(exerciseId: string): Observable<ExerciseHistoryRecord | null>` method
  - Add `getAllAttempts(): Observable<ExerciseAttempt[]>` method for backward compatibility
  - Implement `convertToExerciseAttempts(records: ExerciseHistoryRecord[]): ExerciseAttempt[]` private helper method
  - Add proper error handling with catchError returning empty/default values
  - _Requirements: 1.3, 3.1, 4.2, 5.1_

- [ ] 4. Refactor ProgressService to remove exerciseHistory management
  - Remove `exerciseHistory` field updates from `recordAttempt()` method
  - Update `recordAttempt()` to increment `totalExercisesCompleted` counter
  - Remove `getAllAttempts()` method from ProgressService
  - Update `getDefaultProgress()` to return UserProgress without exerciseHistory field
  - Remove `migrateProgressData()` logic that handles exerciseHistory array-to-object conversion
  - Remove `calculateInitialStreak()` logic that reads from exerciseHistory
  - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [ ] 5. Refactor ProgressService getExerciseStatus to use ExerciseHistoryService
  - Inject ExerciseHistoryService into ProgressService
  - Change `getExerciseStatus(exerciseId)` return type from `ExerciseStatus` to `Observable<ExerciseStatus>`
  - Implement new logic: call `exerciseHistoryService.getExerciseHistory(exerciseId)`
  - Calculate status from records: if empty return 'new', else calculate attemptCount, bestScore, perfectCompletions
  - Add error handling with catchError
  - _Requirements: 2.2, 5.1, 5.2, 5.3, 5.4_

- [ ] 6. Refactor achievement checking logic in ProgressService
  - Update `checkAchievements()` to use `progress.totalExercisesCompleted` for "first-exercise" achievement
  - For "bright-mind" achievement, call `exerciseHistoryService.getHighAccuracyCount(90)` and check if count >= 5
  - Keep streak achievements using `currentStreak` and `lastStreakDate` from UserProgress (no changes needed)
  - Create helper method `addAchievement(achievementId: string)` to add single achievement and save
  - Create helper method `addAchievements(achievementIds: string[])` to add multiple achievements at once
  - Handle async achievement checks properly with subscribe and error handling
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [ ] 7. Implement data migration logic in ProgressService
  - Create `migrateExerciseHistoryToTable(): Observable<void>` method
  - In migration: load progress, check if exerciseHistory exists and has data
  - Convert each ExerciseAttempt in exerciseHistory to ExerciseHistoryRecord format
  - Map sentenceAttempts and penaltyMetrics fields appropriately
  - Use `forkJoin()` to insert all records to database via `insertExerciseHistory()`
  - After successful migration, call `cleanupExerciseHistory()` to remove field and save
  - Add comprehensive error handling and logging
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [ ] 8. Implement cleanup logic after migration
  - Create `cleanupExerciseHistory(progress: UserProgress): void` method
  - Calculate `totalExercisesCompleted` from `Object.keys(progress.exerciseHistory).length` before removing
  - Create new UserProgress object without exerciseHistory field
  - Save cleaned progress via `databaseService.saveProgressAuto()`
  - Update both `progress$` BehaviorSubject and `progressSignal` with cleaned data
  - Log success/failure messages
  - _Requirements: 6.3, 6.5_

- [ ] 9. Update initializeUserProgress to trigger migration
  - Modify `initializeUserProgress()` to call `migrateExerciseHistoryToTable()` before loading
  - Chain migration with `loadFromFirestore()` using switchMap or subscribe
  - Ensure loadFromFirestore() is called even if migration fails
  - Add backward compatibility check in `loadFromFirestore()` to detect old format
  - If old format detected with exerciseHistory, trigger migration again
  - _Requirements: 6.1, 6.2, 1.5_

- [ ] 10. Refactor ReviewService to use ExerciseHistoryService
  - Inject ExerciseHistoryService into ReviewService
  - Update `getErrorPatterns()` to call `exerciseHistoryService.getAllAttempts()` instead of reading from progress.exerciseHistory
  - Change `getIncorrectQuestions(exerciseId)` return type to `Observable<SentenceAttempt[]>`
  - Implement new logic: call `exerciseHistoryService.getLatestAttempt(exerciseId)` and filter sentenceAttempts with accuracyScore < 75
  - Map HistorySentenceAttempt to SentenceAttempt format
  - Add error handling with catchError returning empty arrays
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [ ] 11. Update components that call getExerciseStatus
  - Search for all usages of `progressService.getExerciseStatus()` in components
  - Update component code to handle Observable return type (use async pipe or subscribe)
  - Update templates to use async pipe if needed: `(progressService.getExerciseStatus(id) | async)`
  - Test that exercise status displays correctly in UI
  - _Requirements: 5.1, 5.2, 5.5_

- [ ] 12. Update components that call getIncorrectQuestions
  - Search for all usages of `reviewService.getIncorrectQuestions()` in components
  - Update component code to handle Observable return type
  - Update templates to use async pipe or subscribe pattern
  - Test that review mode displays incorrect questions correctly
  - _Requirements: 3.3, 3.4, 3.5_

- [ ] 13. Add database indexes for performance optimization
  - Create migration file `supabase-migrations/07-add-exercise-history-indexes.sql`
  - Add index: `CREATE INDEX IF NOT EXISTS idx_user_exercise_history_score ON user_exercise_history(user_id, final_score DESC)`
  - Verify existing indexes: `idx_user_exercise_history_user_completed` and `idx_user_exercise_history_exercise`
  - Run migration on Supabase database
  - _Requirements: 8.2, 8.4_

- [ ] 14. Implement caching in ExerciseHistoryService
  - Add private cache Map: `private historyCache = new Map<string, ExerciseHistoryRecord[]>()`
  - Add cache timestamp: `private cacheTimestamp = 0`
  - Add cache duration constant: `private readonly CACHE_DURATION = 5 * 60 * 1000`
  - Implement `isCacheValid()` helper method
  - Update query methods to check cache before database query
  - Implement `invalidateCache()` method to clear cache
  - _Requirements: 8.5_

- [ ] 15. Add error handling and retry logic
  - Add `retry(2)` operator to all ExerciseHistoryService database queries
  - Add ToastService injection to ExerciseHistoryService
  - Show user-friendly error messages when queries fail: "Không thể tải lịch sử bài tập"
  - Ensure all catchError handlers return appropriate default values (empty arrays, null, 0)
  - Add detailed console.error logging for debugging
  - _Requirements: 9.1, 9.2, 9.3, 9.4_

- [ ] 16. Update migration error handling
  - Add try-catch blocks in migration logic
  - Log detailed error information with exercise IDs that failed
  - Continue migration for remaining exercises if one fails
  - Add monitoring service integration if available: `monitoringService?.logError('migration_failed', error)`
  - Ensure app remains functional even if migration fails completely
  - _Requirements: 9.2, 9.5_

- [ ]* 17. Write unit tests for ProgressService refactoring
  - Create test file `src/app/services/progress.service.spec.ts` if not exists
  - Test `recordAttempt()` updates totalExercisesCompleted and does not update exerciseHistory
  - Test `getExerciseStatus()` returns Observable and delegates to ExerciseHistoryService
  - Test `checkAchievements()` uses totalExercisesCompleted for first-exercise achievement
  - Test `checkAchievements()` calls ExerciseHistoryService for bright-mind achievement
  - Test `migrateExerciseHistoryToTable()` converts data correctly
  - Test `cleanupExerciseHistory()` removes exerciseHistory field
  - Mock ExerciseHistoryService and DatabaseService in all tests
  - _Requirements: 10.1_

- [ ]* 18. Write unit tests for ExerciseHistoryService new methods
  - Create test file `src/app/services/exercise-history.service.spec.ts` if not exists
  - Test `getHighAccuracyCount()` returns correct count from filtered records
  - Test `getTotalExercisesCompleted()` counts unique exercise IDs
  - Test `getLatestAttempt()` returns most recent record by completedAt date
  - Test `getAllAttempts()` converts ExerciseHistoryRecord to ExerciseAttempt format correctly
  - Test `convertToExerciseAttempts()` maps all fields properly
  - Test error handling returns empty/default values
  - Mock DatabaseService in all tests
  - _Requirements: 10.2_

- [ ]* 19. Write integration tests for migration process
  - Create test file `src/app/services/progress-migration.spec.ts`
  - Test migration with old format containing exerciseHistory
  - Test migrated data matches original data structure
  - Test exerciseHistory is removed after successful migration
  - Test totalExercisesCompleted is calculated correctly
  - Test migration handles empty exerciseHistory gracefully
  - Test migration continues on partial failures
  - Mock DatabaseService and AuthService
  - _Requirements: 10.3_

- [ ]* 20. Write integration tests for ReviewService refactoring
  - Create test file `src/app/services/review.service.spec.ts` if not exists
  - Test `getErrorPatterns()` uses ExerciseHistoryService.getAllAttempts()
  - Test `getIncorrectQuestions()` returns Observable with filtered sentences
  - Test error handling returns empty arrays on failures
  - Test caching still works after refactor
  - Mock ExerciseHistoryService, ProgressService, and DatabaseService
  - _Requirements: 10.4, 10.5_

- [ ]* 21. Write E2E tests for complete flow
  - Create test file `e2e/exercise-history-refactor.spec.ts`
  - Test: Complete exercise → verify data saved to user_exercise_history table
  - Test: Load exercise list → verify exercise status displays correctly
  - Test: Complete exercise → verify achievement awarded correctly
  - Test: Navigate to review queue → verify review system functions properly
  - Test: View dashboard → verify analytics show correct data
  - Test: User with old data logs in → verify migration happens automatically
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

- [ ]* 22. Performance testing and optimization
  - Measure UserProgress load time (target: < 100ms)
  - Measure exercise status query time (target: < 200ms)
  - Measure achievement check time (target: < 500ms)
  - Measure dashboard analytics load time (target: < 1s)
  - Profile database queries and identify slow queries
  - Verify database indexes are being used (check query plans)
  - Optimize queries that exceed target times
  - _Requirements: 8.1, 8.2, 8.3, 8.4_

- [ ] 23. Update documentation and comments
  - Update JSDoc comments in ProgressService to reflect new behavior
  - Update JSDoc comments in ExerciseHistoryService for new methods
  - Update README or ARCHITECTURE.md if exists to document the refactor
  - Add migration notes to CHANGELOG.md
  - Document the new UserProgress structure
  - _Requirements: 1.1, 1.2, 1.3_

- [ ] 24. Manual QA testing checklist
  - Test exercise completion flow end-to-end
  - Test exercise status display on exercise list page
  - Test achievement notifications appear correctly
  - Test review queue displays correct exercises
  - Test dashboard analytics show accurate data
  - Test with user who has old data format (migration scenario)
  - Test with new user who has no data
  - Test error scenarios (database unavailable, network issues)
  - _Requirements: 1.5, 3.4, 4.5, 5.5, 9.3, 9.4_

- [ ] 25. Prepare rollback plan and deploy
  - Create feature branch backup before merging
  - Document rollback steps in deployment notes
  - Prepare database rollback scripts if needed
  - Deploy to staging environment first
  - Monitor for errors and performance issues
  - If successful after 24 hours, deploy to production
  - Monitor production for 1 week for any issues
  - _Requirements: 1.5, 9.5_
