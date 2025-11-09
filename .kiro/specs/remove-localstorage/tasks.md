# Implementation Plan

- [x] 1. Extend DatabaseService with achievement and reward operations


  - Add saveAchievements and loadAchievements methods to IDatabase interface
  - Add saveRewards and loadRewards methods to IDatabase interface
  - Implement these methods in FirebaseDatabase service
  - Add convenience methods (saveAchievementsAuto, loadAchievementsAuto, etc.) to DatabaseService
  - _Requirements: 2.2, 4.2, 8.5_

- [x] 2. Refactor ProgressService to remove localStorage dependencies

  - [x] 2.1 Remove localStorage-related code from ProgressService


    - Remove STORAGE_KEY_PREFIX constant
    - Remove getStorageKey() method
    - Remove saveProgress() method that writes to localStorage
    - Remove loadProgress() method that reads from localStorage
    - Remove migrateOldData() method
    - _Requirements: 1.3, 1.4, 8.2, 8.3_

  - [x] 2.2 Implement Firestore-only data loading in ProgressService


    - Create initializeUserProgress() method that loads from Firestore
    - Create loadFromFirestore() method
    - Update constructor to call initializeUserProgress() when user logs in
    - Remove real-time subscription (subscribeToProgressAuto)
    - _Requirements: 1.2, 9.1, 9.2, 9.3_

  - [x] 2.3 Implement Firestore-only data saving in ProgressService

    - Update recordAttempt() to save directly to Firestore
    - Update addBonusPoints() to save directly to Firestore
    - Remove all localStorage.setItem() calls
    - Add error handling for Firestore save operations
    - _Requirements: 1.1, 1.5, 10.1, 10.3_

  - [x] 2.4 Implement one-time migration logic in ProgressService


    - Create checkAndMigrateData() method
    - Create checkLocalStorageData() helper method
    - Create clearLocalStorageData() helper method
    - Implement migration on first login after update
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [x] 3. Refactor AchievementService to remove localStorage dependencies

  - [x] 3.1 Remove localStorage-related code from AchievementService


    - Remove STORAGE_KEY_PREFIX constant
    - Remove getStorageKey() method
    - Remove saveUserData() method
    - Remove loadUserData() method
    - Remove resetAchievements() method or update it to use Firestore
    - _Requirements: 2.3, 2.4, 8.2, 8.3_

  - [x] 3.2 Implement Firestore-only data operations in AchievementService


    - Create loadFromFirestore() method
    - Update unlockAchievement() to save to Firestore immediately
    - Update updateProgress() to save to Firestore
    - Remove real-time subscriptions
    - _Requirements: 2.1, 2.2, 9.1, 9.2_

  - [x] 3.3 Implement secure reward claiming in AchievementService


    - Update claimRewards() to save claim status to Firestore BEFORE granting rewards
    - Add error handling to prevent reward duplication
    - Implement rollback logic if Firestore save fails
    - _Requirements: 2.5, 10.1, 10.2, 10.3_

  - [x] 3.4 Implement one-time migration logic in AchievementService


    - Create checkAndMigrateData() method
    - Migrate unlocked achievements and progress data
    - Clear localStorage after successful migration
    - _Requirements: 7.1, 7.2, 7.3, 7.4_

- [x] 4. Refactor FavoriteService to remove localStorage dependencies

  - [x] 4.1 Remove localStorage-related code from FavoriteService


    - Remove STORAGE_KEY_PREFIX constant
    - Remove getStorageKey() method
    - Remove loadFavoritesFromLocalStorage() method
    - Remove saveFavoritesToLocalStorage() method
    - Remove migrateOldData() method
    - _Requirements: 3.3, 3.4, 8.2, 8.3_

  - [x] 4.2 Implement Firestore-only data operations in FavoriteService

    - Create initializeFavorites() method
    - Create loadFromFirestore() method
    - Update toggleFavorite(), addFavorite(), removeFavorite() to save to Firestore
    - Remove real-time subscription (subscribeToFavoritesAuto)
    - Add optimistic updates with rollback on error
    - _Requirements: 3.1, 3.2, 9.1, 9.2, 10.3_

  - [x] 4.3 Implement one-time migration logic in FavoriteService

    - Create checkAndMigrateData() method
    - Migrate favorites from localStorage to Firestore
    - Clear localStorage after successful migration
    - _Requirements: 7.1, 7.2, 7.3_

- [x] 5. Refactor RewardService to remove localStorage dependencies

  - [x] 5.1 Remove localStorage-related code from RewardService


    - Remove STORAGE_KEY_PREFIX constant
    - Remove getStorageKey() method
    - Remove loadRewards() method
    - Remove saveRewards() method
    - _Requirements: 4.3, 4.4, 8.2, 8.3_

  - [x] 5.2 Implement Firestore-only data operations in RewardService

    - Create initializeRewards() method
    - Create loadFromFirestore() method
    - Update grantRewards() to save to Firestore immediately
    - Update unlockTheme(), unlockHints(), unlockAvatarFrame() to save to Firestore
    - _Requirements: 4.1, 4.2, 10.1, 10.3_

  - [x] 5.3 Implement one-time migration logic in RewardService

    - Create checkAndMigrateData() method
    - Migrate rewards from localStorage to Firestore
    - Clear localStorage after successful migration
    - _Requirements: 7.1, 7.2, 7.3_

- [x] 6. Add comprehensive error handling and retry logic


  - [x] 6.1 Implement retry logic for Firestore operations


    - Create saveWithRetry() utility method
    - Implement exponential backoff strategy
    - Add maximum retry limit (3 attempts)
    - _Requirements: 10.4, 10.5_

  - [x] 6.2 Add error logging and user feedback

    - Log all Firestore operation errors with context
    - Add user-friendly error messages for critical failures
    - Ensure application doesn't crash on Firestore errors
    - _Requirements: 10.1, 10.2, 10.3_

- [x] 7. Update ExercisePersistenceService documentation


  - Add code comments explaining why localStorage is retained
  - Document that this service handles temporary in-progress state only
  - Clarify that data is cleared after exercise completion
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 8.4_

- [x] 8. Update CustomExerciseService documentation


  - Add code comments explaining the dual-storage strategy
  - Document that Firestore is primary, localStorage is for offline support
  - Clarify sync behavior between localStorage and Firestore
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 8.4_

- [x] 9. Remove deprecated FirestoreSyncService


  - Update any components still using FirestoreSyncService to use DatabaseService directly
  - Remove or deprecate FirestoreSyncService file
  - Update imports across the codebase
  - _Requirements: 8.1, 8.5_

- [x] 10. Update Firestore security rules


  - Review and update firestore.rules file
  - Ensure users can only access their own data
  - Add validation rules for achievement and reward data
  - Test security rules with Firebase emulator
  - _Requirements: 2.5, 4.1, 8.5_

- [ ] 11. Testing and validation
  - [ ] 11.1 Write unit tests for migration logic
    - Test ProgressService migration
    - Test AchievementService migration
    - Test FavoriteService migration
    - Test RewardService migration
    - Test migration with missing/corrupted data
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

  - [ ] 11.2 Write unit tests for Firestore operations
    - Test save operations with mocked DatabaseService
    - Test load operations with mocked DatabaseService
    - Test error handling scenarios
    - Test retry logic
    - _Requirements: 10.1, 10.2, 10.3, 10.4_

  - [ ] 11.3 Perform manual testing
    - Test complete exercise flow with Firestore save
    - Test achievement unlock and reward claim
    - Test favorites add/remove
    - Test migration from localStorage
    - Test with cleared browser cache
    - Test offline behavior
    - _Requirements: 1.1, 2.1, 3.1, 4.1, 7.1_

- [ ] 12. Documentation and cleanup
  - Update README with new storage architecture
  - Document migration process for developers
  - Create troubleshooting guide for migration issues
  - Remove old localStorage-related comments
  - _Requirements: 8.1, 8.4_
