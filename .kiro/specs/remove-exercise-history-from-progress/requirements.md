# Requirements Document

## Introduction

This feature refactors the data architecture to remove the `exerciseHistory` field from the `UserProgress` JSON object stored in the database. Currently, exercise attempt data is duplicated in two places: within the `user_progress` document (as `exerciseHistory`) and in the dedicated `user_exercise_history` table. This duplication causes data bloat, synchronization issues, and scalability concerns. The refactor will establish the `user_exercise_history` table as the single source of truth for all exercise attempt data, while maintaining all existing functionality.

## Glossary

- **UserProgress**: A JSON document stored in the database containing user statistics (points, credits, streak, achievements)
- **exerciseHistory**: A field within UserProgress that stores a map of exercise attempts (currently being removed)
- **user_exercise_history**: A dedicated database table that stores detailed exercise attempt records
- **ProgressService**: Angular service managing user progress data and statistics
- **ExerciseHistoryService**: Angular service managing exercise attempt history via the database table
- **ReviewService**: Angular service managing the spaced repetition review system
- **Achievement System**: Logic that tracks and awards user achievements based on activity
- **Streak Calculation**: Logic that calculates consecutive days of user activity
- **Migration**: Process of transferring existing exerciseHistory data to the user_exercise_history table

## Requirements

### Requirement 1: Data Architecture Refactoring

**User Story:** As a system architect, I want to eliminate data duplication between UserProgress and user_exercise_history, so that the system has a single source of truth and improved scalability.

#### Acceptance Criteria

1. WHEN the system loads user progress, THE ProgressService SHALL NOT include exerciseHistory in the UserProgress object
2. WHEN the system saves user progress, THE ProgressService SHALL NOT write exerciseHistory to the database
3. WHEN exercise attempt data is needed, THE system SHALL query the user_exercise_history table via ExerciseHistoryService
4. THE UserProgress interface SHALL contain only: totalCredits, totalPoints, lastActivityDate, currentStreak, lastStreakDate, achievements, and totalExercisesCompleted
5. THE system SHALL maintain backward compatibility during migration by handling both old and new data formats

### Requirement 2: Progress Service Refactoring

**User Story:** As a developer, I want ProgressService to manage only aggregate statistics, so that it has a clear single responsibility.

#### Acceptance Criteria

1. WHEN ProgressService records an attempt, THE service SHALL update only aggregate fields (totalPoints, totalCredits, streak, lastActivityDate)
2. WHEN ProgressService needs exercise status, THE service SHALL query ExerciseHistoryService instead of reading from exerciseHistory
3. THE ProgressService SHALL remove the getAllAttempts() method
4. THE ProgressService SHALL remove the recordAttempt() method's logic that updates exerciseHistory
5. THE ProgressService SHALL add a totalExercisesCompleted counter field to avoid frequent database queries

### Requirement 3: Review Service Integration

**User Story:** As a user, I want the review system to continue working seamlessly, so that I can practice my weak areas without interruption.

#### Acceptance Criteria

1. WHEN ReviewService analyzes error patterns, THE service SHALL query exercise attempts from ExerciseHistoryService
2. WHEN ReviewService identifies incorrect questions, THE service SHALL fetch sentence attempts from user_exercise_history table
3. THE ReviewService SHALL NOT access progress.exerciseHistory
4. WHEN ReviewService generates review questions, THE system SHALL maintain the same quality and accuracy as before
5. THE ReviewService SHALL handle cases where no exercise history exists gracefully

### Requirement 4: Achievement System Refactoring

**User Story:** As a user, I want to continue earning achievements based on my activity, so that I stay motivated to practice.

#### Acceptance Criteria

1. WHEN checking for "first exercise" achievement, THE system SHALL query totalExercisesCompleted from UserProgress
2. WHEN checking for "bright mind" achievement, THE system SHALL query high-accuracy attempts from user_exercise_history table
3. WHEN checking for streak achievements, THE system SHALL use currentStreak and lastStreakDate from UserProgress
4. THE achievement checking logic SHALL NOT access exerciseHistory
5. THE system SHALL award achievements with the same criteria as before the refactor

### Requirement 5: Exercise Status and Metadata

**User Story:** As a user, I want to see which exercises I've completed and my best scores, so that I can track my progress on individual exercises.

#### Acceptance Criteria

1. WHEN the system displays exercise status, THE system SHALL query the latest attempt from user_exercise_history table
2. WHEN getExerciseStatus() is called, THE ProgressService SHALL delegate to ExerciseHistoryService
3. THE system SHALL return status containing: attemptCount, bestScore, and perfectCompletions
4. WHEN no attempt exists for an exercise, THE system SHALL return status "new" with attemptCount 0
5. THE exercise status query SHALL complete within 200ms for optimal user experience

### Requirement 6: Data Migration

**User Story:** As a system administrator, I want existing user data to be migrated safely, so that no user loses their progress history.

#### Acceptance Criteria

1. WHEN a user with old data format logs in, THE system SHALL detect exerciseHistory in their UserProgress
2. WHEN exerciseHistory is detected, THE system SHALL migrate each attempt to user_exercise_history table
3. AFTER successful migration, THE system SHALL remove exerciseHistory from UserProgress and save the cleaned version
4. IF migration fails for any attempt, THE system SHALL log the error but continue with remaining attempts
5. THE migration SHALL preserve all attempt data including: exerciseId, scores, timestamps, hints, and sentence attempts

### Requirement 7: Streak Calculation Optimization

**User Story:** As a user, I want my daily streak to be calculated accurately and efficiently, so that I'm motivated to practice daily.

#### Acceptance Criteria

1. WHEN calculating streak on app load, THE system SHALL use currentStreak and lastStreakDate from UserProgress
2. WHEN recording a new attempt, THE system SHALL update currentStreak and lastStreakDate based on the current date
3. THE system SHALL NOT query user_exercise_history table for streak calculation
4. WHEN initializing streak for migrated users, THE system SHALL calculate initial streak from user_exercise_history once
5. THE streak calculation SHALL handle timezone differences correctly using local date strings

### Requirement 8: Performance Optimization

**User Story:** As a user, I want the app to load quickly and respond smoothly, so that I have a pleasant learning experience.

#### Acceptance Criteria

1. WHEN loading user progress, THE system SHALL load only the lightweight UserProgress object without exerciseHistory
2. WHEN displaying dashboard statistics, THE system SHALL use cached or pre-computed values from UserProgress
3. THE system SHALL reduce UserProgress JSON size by at least 80% compared to the current implementation
4. WHEN querying exercise history, THE system SHALL use database indexes for optimal performance
5. THE system SHALL implement caching strategies in ExerciseHistoryService to minimize redundant queries

### Requirement 9: Error Handling and Resilience

**User Story:** As a user, I want the app to handle errors gracefully, so that temporary issues don't disrupt my learning.

#### Acceptance Criteria

1. WHEN ExerciseHistoryService queries fail, THE system SHALL return empty arrays or default values without crashing
2. WHEN migration fails, THE system SHALL log detailed error information for debugging
3. IF user_exercise_history table is unavailable, THE system SHALL allow users to continue practicing with degraded features
4. THE system SHALL display user-friendly error messages when exercise history cannot be loaded
5. WHEN saving progress fails, THE system SHALL retry up to 3 times before showing an error

### Requirement 10: Testing and Validation

**User Story:** As a developer, I want comprehensive tests to ensure the refactor doesn't break existing functionality, so that users have a reliable experience.

#### Acceptance Criteria

1. THE system SHALL include unit tests for ProgressService covering all refactored methods
2. THE system SHALL include unit tests for ExerciseHistoryService integration points
3. THE system SHALL include integration tests for the migration process
4. THE system SHALL include tests verifying achievement logic works with the new architecture
5. THE system SHALL include tests confirming ReviewService functions correctly with ExerciseHistoryService
