# Requirements Document

## Introduction

This specification addresses the removal of localStorage dependencies from the language learning application to prevent data inconsistencies, cheating opportunities, and cache-related bugs. The system currently stores user progress, achievements, favorites, and rewards in localStorage, which creates vulnerabilities when users clear their browser cache or manipulate local data. The refactoring will migrate all persistent user data to server-side storage (Firebase/Firestore) while maintaining localStorage only for temporary in-progress exercise state and custom exercises.

## Glossary

- **LocalStorage**: Browser-based client-side storage mechanism that persists data across sessions
- **Firestore**: Cloud-based NoSQL database service provided by Firebase
- **ProgressService**: Service managing user exercise attempts, points, credits, and streak data
- **AchievementService**: Service managing user achievement unlocks and progress tracking
- **FavoriteService**: Service managing user's favorited exercises
- **RewardService**: Service managing unlocked themes, hints, and avatar frames
- **ExercisePersistenceService**: Service managing temporary in-progress exercise state
- **CustomExerciseService**: Service managing user-created custom exercises
- **DatabaseService**: Service providing abstraction layer for Firestore operations
- **User Progress Data**: Includes attempts, totalCredits, totalPoints, currentStreak, lastStreakDate, achievements
- **Achievement Data**: Includes unlocked achievements, progress tracking, and reward claim status
- **Favorite Data**: Includes list of favorited exercise IDs with timestamps
- **Reward Data**: Includes unlocked themes, available hints, and avatar frames
- **In-Progress State**: Temporary exercise state saved during active exercise sessions
- **Custom Exercise**: User-created exercise content stored persistently

## Requirements

### Requirement 1

**User Story:** As a system administrator, I want all user progress data stored exclusively on the server, so that users cannot manipulate their progress by clearing browser cache or editing localStorage

#### Acceptance Criteria

1. WHEN the ProgressService records an exercise attempt, THE System SHALL save the complete progress data to Firestore immediately
2. WHEN the ProgressService loads user progress, THE System SHALL retrieve data exclusively from Firestore
3. THE System SHALL remove all localStorage read operations from ProgressService except for migration purposes
4. THE System SHALL remove all localStorage write operations from ProgressService
5. WHEN a user completes an exercise, THE System SHALL persist totalPoints, totalCredits, currentStreak, and lastStreakDate to Firestore

### Requirement 2

**User Story:** As a system administrator, I want all achievement data stored exclusively on the server, so that users cannot claim rewards multiple times by manipulating local data

#### Acceptance Criteria

1. WHEN the AchievementService unlocks an achievement, THE System SHALL save the unlock data to Firestore immediately
2. WHEN the AchievementService loads achievement data, THE System SHALL retrieve data exclusively from Firestore
3. THE System SHALL remove all localStorage read operations from AchievementService except for migration purposes
4. THE System SHALL remove all localStorage write operations from AchievementService
5. WHEN a user claims achievement rewards, THE System SHALL persist the claim status to Firestore before granting rewards

### Requirement 3

**User Story:** As a system administrator, I want all favorite exercise data stored exclusively on the server, so that users' favorites are consistent across devices and cannot be lost

#### Acceptance Criteria

1. WHEN the FavoriteService adds or removes a favorite, THE System SHALL save the updated favorites list to Firestore immediately
2. WHEN the FavoriteService loads favorites, THE System SHALL retrieve data exclusively from Firestore
3. THE System SHALL remove all localStorage read operations from FavoriteService except for migration purposes
4. THE System SHALL remove all localStorage write operations from FavoriteService

### Requirement 4

**User Story:** As a system administrator, I want all reward data stored exclusively on the server, so that unlocked themes, hints, and avatar frames cannot be manipulated locally

#### Acceptance Criteria

1. WHEN the RewardService grants rewards, THE System SHALL save the updated reward data to Firestore immediately
2. WHEN the RewardService loads reward data, THE System SHALL retrieve data exclusively from Firestore
3. THE System SHALL remove all localStorage read operations from RewardService except for migration purposes
4. THE System SHALL remove all localStorage write operations from RewardService

### Requirement 5

**User Story:** As a user, I want my in-progress exercise state preserved during my session, so that I can reload the page without losing my current work

#### Acceptance Criteria

1. WHEN a user is actively working on an exercise, THE System SHALL save the in-progress state to localStorage
2. WHEN a user reloads the page during an exercise, THE System SHALL restore the in-progress state from localStorage
3. WHEN a user completes an exercise, THE System SHALL clear the in-progress state from localStorage
4. THE System SHALL maintain the ExercisePersistenceService localStorage operations unchanged

### Requirement 6

**User Story:** As a user, I want my custom exercises stored persistently, so that I can access them across sessions and devices

#### Acceptance Criteria

1. WHEN a user creates a custom exercise, THE System SHALL save it to both localStorage and Firestore
2. WHEN a user loads custom exercises, THE System SHALL retrieve data from Firestore and sync with localStorage
3. THE System SHALL maintain the CustomExerciseService localStorage operations for offline support
4. WHEN a user deletes a custom exercise, THE System SHALL remove it from both localStorage and Firestore

### Requirement 7

**User Story:** As a user with existing localStorage data, I want my data automatically migrated to the server, so that I don't lose my progress when the system is updated

#### Acceptance Criteria

1. WHEN a user logs in with existing localStorage data, THE System SHALL detect unmigrated data
2. WHEN unmigrated data is detected, THE System SHALL upload the data to Firestore automatically
3. WHEN migration is complete, THE System SHALL remove the migrated localStorage keys
4. THE System SHALL log migration success or failure for debugging purposes
5. WHEN migration fails, THE System SHALL preserve the localStorage data and retry on next login

### Requirement 8

**User Story:** As a developer, I want clear separation between temporary and persistent storage, so that the codebase is maintainable and the storage strategy is explicit

#### Acceptance Criteria

1. THE System SHALL document which services use localStorage and for what purpose
2. THE System SHALL remove all STORAGE_KEY_PREFIX constants from services that no longer use localStorage
3. THE System SHALL remove all getStorageKey() methods from services that no longer use localStorage
4. THE System SHALL add code comments explaining why ExercisePersistenceService and CustomExerciseService retain localStorage
5. THE System SHALL ensure all Firestore operations include error handling and logging

### Requirement 9

**User Story:** As a system administrator, I want real-time synchronization disabled for write operations, so that we avoid race conditions and ensure data consistency

#### Acceptance Criteria

1. WHEN a service saves data to Firestore, THE System SHALL use direct write operations without real-time listeners
2. THE System SHALL remove or disable subscribeToProgressAuto, subscribeToFavoritesAuto, and similar real-time subscription methods
3. WHEN a user loads data, THE System SHALL fetch from Firestore once at initialization
4. THE System SHALL not automatically sync local changes from other devices during active sessions
5. WHEN a user refreshes the page, THE System SHALL load the latest data from Firestore

### Requirement 10

**User Story:** As a developer, I want comprehensive error handling for all Firestore operations, so that users receive clear feedback when data operations fail

#### Acceptance Criteria

1. WHEN a Firestore save operation fails, THE System SHALL log the error with context information
2. WHEN a Firestore load operation fails, THE System SHALL display a user-friendly error message
3. WHEN a Firestore operation fails, THE System SHALL not crash the application
4. THE System SHALL implement retry logic for transient Firestore errors
5. WHEN offline, THE System SHALL queue write operations and retry when connection is restored
