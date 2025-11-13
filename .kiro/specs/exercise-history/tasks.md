# Implementation Plan

- [x] 1. Create database migration for exercise history table





  - Create migration file `supabase-migrations/06-create-exercise-history-table.sql`
  - Define table schema with all columns (id, user_id, exercise_id, completed_at, final_score, time_spent_seconds, hints_used, sentence_attempts JSONB, penalty_metrics JSONB, created_at)
  - Add indexes for user_id, (user_id, completed_at DESC), and exercise_id
  - Implement Row Level Security policies for SELECT and INSERT
  - Add CHECK constraints for score (0-100) and time_spent_seconds (>= 0)
  - _Requirements: 1.5, 6.1, 6.2, 6.3, 6.4_

- [x] 2. Create TypeScript models for exercise history


  - Create file `src/app/models/exercise-history.model.ts`
  - Define `HistorySentenceAttempt` interface with sentenceIndex, originalText, userTranslation, accuracyScore, retryCount, aiFeedback
  - Define `HistoryPenaltyMetrics` interface with baseScore, totalIncorrectAttempts, totalRetries, totalPenalty, finalScore
  - Define `ExerciseHistoryRecord` interface with all database fields
  - Define `ExerciseHistoryStats` interface with totalExercisesCompleted, averageAccuracy, totalTimeSpentMinutes, averageTimePerExercise, bestPerformances, mostPracticed
  - Define `ActivityTimelineData` interface with date and completionCount
  - _Requirements: 1.1, 1.2, 1.3, 3.1, 3.2, 3.3, 4.1_

- [x] 3. Extend DatabaseService with exercise history methods


  - Add method `insertExerciseHistory(record: ExerciseHistoryRecord): Observable<void>` to save history records
  - Add method `loadRecentHistory(userId: string, limit: number): Observable<ExerciseHistoryRecord[]>` to fetch recent attempts
  - Add method `loadExerciseHistory(userId: string, exerciseId: string): Observable<ExerciseHistoryRecord[]>` to fetch exercise-specific history
  - Add method `loadHistoryForDateRange(userId: string, startDate: Date, endDate: Date): Observable<ExerciseHistoryRecord[]>` for timeline queries
  - Implement proper error handling with catchError operators
  - Map Supabase responses to TypeScript interfaces
  - _Requirements: 1.1, 1.4, 2.5, 6.5_

- [x] 4. Implement ExerciseHistoryService


  - Create file `src/app/services/exercise-history.service.ts`
  - Inject DatabaseService, AuthService, and ExerciseService
  - Implement `recordExerciseAttempt()` method that transforms SentenceState[] to HistorySentenceAttempt[] and calls DatabaseService
  - Implement `getRecentHistory()` method that fetches and returns recent history with exercise titles
  - Implement `getStatistics()` method that calculates all stats from history data
  - Implement `getActivityTimeline()` method that groups completions by date
  - Implement `getExerciseHistory()` method for exercise-specific queries
  - Add error handling that logs but doesn't throw exceptions
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.1, 2.5, 3.1, 3.2, 3.3, 3.4, 4.1, 4.4, 4.5, 5.2, 6.5_

- [x] 5. Integrate history recording into ExerciseDetailComponent


  - Inject ExerciseHistoryService in `exercise-detail.ts`
  - Add time tracking: store exercise start time in component initialization
  - In `completeExercise()` method, calculate time spent in seconds
  - After existing `recordingService.recordAttempt()` call, add optional call to `exerciseHistoryService.recordExerciseAttempt()`
  - Pass exerciseId, finalScore, timeSpent, hintsUsed, sentences, and penaltyMetrics
  - Wrap history recording in error handler that logs but doesn't block completion
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 5.4_

- [x] 6. Create Recent History Widget component


  - Create component files `src/app/components/dashboard/recent-history-widget/recent-history-widget.ts`, `.html`, `.scss`
  - Use standalone component with ChangeDetectionStrategy.OnPush
  - Inject ExerciseHistoryService and Router
  - Load recent history (limit 10) using toSignal() for reactive updates
  - Display exercise title, completion date (formatted), final score, time spent (formatted as minutes), hints used
  - Implement click handler to navigate to exercise detail in review mode
  - Show empty state message when no history exists
  - Handle loading state with skeleton or spinner
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 5.3_

- [x] 7. Create Practice Statistics Widget component


  - Create component files `src/app/components/dashboard/practice-stats-widget/practice-stats-widget.ts`, `.html`, `.scss`
  - Use standalone component with ChangeDetectionStrategy.OnPush
  - Inject ExerciseHistoryService
  - Load statistics using toSignal() for reactive updates
  - Display total exercises completed, average accuracy (formatted as percentage), total time spent (formatted as hours/minutes), average time per exercise
  - Display "Best Performances" section with top 5 exercises (title, score, date)
  - Display "Most Practiced" section with top 5 exercises (title, attempt count)
  - Show empty state when no data available
  - Handle loading state
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 5.3_

- [x] 8. Create Activity Timeline Widget component


  - Create component files `src/app/components/dashboard/activity-timeline-widget/activity-timeline-widget.ts`, `.html`, `.scss`
  - Use standalone component with ChangeDetectionStrategy.OnPush
  - Inject ExerciseHistoryService
  - Accept time range input from parent component (7d, 30d, 90d)
  - Calculate start and end dates based on time range
  - Load activity timeline data using computed() that reacts to time range changes
  - Display simple list or chart showing date and completion count
  - Omit or show zero for days with no completions
  - Handle loading state
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 5.3_

- [x] 9. Integrate widgets into Dashboard component



  - Import the three new widget components in `dashboard.ts`
  - Add widget components to the imports array
  - Add widgets to dashboard template in appropriate sections
  - Ensure widgets are optional imports that can be removed without breaking dashboard
  - Pass time range signal to Activity Timeline Widget
  - Test that dashboard renders correctly with and without widgets
  - _Requirements: 2.5, 3.5, 5.3, 5.5_

- [ ]* 10. Write unit tests for ExerciseHistoryService
  - Create test file `src/app/services/exercise-history.service.spec.ts`
  - Test `recordExerciseAttempt()` creates correct database record structure
  - Test `getRecentHistory()` returns sorted results by date descending
  - Test `getStatistics()` calculates correct averages and aggregations
  - Test `getActivityTimeline()` groups completions by date correctly
  - Test error handling doesn't throw exceptions
  - Mock DatabaseService, AuthService, and ExerciseService
  - _Requirements: 1.1, 1.2, 1.3, 2.1, 3.1, 3.2, 3.3, 4.1, 6.5_

- [ ]* 11. Write component tests for dashboard widgets
  - Create test files for each widget component
  - Test Recent History Widget renders with empty data
  - Test Recent History Widget renders with sample data
  - Test Recent History Widget click handler navigates correctly
  - Test Practice Statistics Widget renders with empty data
  - Test Practice Statistics Widget renders with sample data and calculations
  - Test Activity Timeline Widget renders with empty data
  - Test Activity Timeline Widget renders with sample data
  - Test Activity Timeline Widget updates when time range changes
  - Mock ExerciseHistoryService in all tests
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 3.1, 3.2, 3.3, 4.1, 4.2_

- [ ]* 12. Perform integration testing
  - Run database migration on test Supabase instance
  - Verify RLS policies prevent cross-user access
  - Complete a test exercise and verify history record created
  - Navigate to dashboard and verify widgets display new data
  - Click on history item and verify navigation to exercise review
  - Test with multiple users to verify data isolation
  - Verify cascade delete when user account is deleted
  - Test performance with large datasets (100+ history records)
  - _Requirements: 1.1, 1.5, 2.1, 2.3, 5.4, 6.1, 6.2, 6.4_

- [ ]* 13. Verify feature independence and removability
  - Comment out widget imports in DashboardComponent
  - Verify dashboard still renders without errors
  - Comment out history service call in ExerciseDetailComponent
  - Complete an exercise and verify existing flow still works
  - Verify ProgressService and ReviewService continue to function
  - Test that no console errors appear when history service is not called
  - Document removal steps in code comments
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_
