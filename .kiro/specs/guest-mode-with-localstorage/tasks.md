# Implementation Plan: Guest Mode with localStorage

- [x] 1. Create storage adapter infrastructure





  - Create `StorageAdapter` interface defining unified storage operations (save/load progress, exercise history, dictation history, stats)
  - Create `LocalStorageProvider` service implementing `StorageAdapter` for guest users with data validation and error handling
  - Create `SupabaseStorageProvider` service implementing `StorageAdapter` wrapping existing `DatabaseService`
  - Create `StorageAdapterFactory` service to select appropriate adapter based on authentication state
  - _Requirements: 1.2, 2.1, 2.4, 4.1, 4.2, 4.3_

- [x] 2. Update ProgressService to use storage adapter


  - Inject `StorageAdapterFactory` into `ProgressService`
  - Replace direct `DatabaseService` calls with `StorageAdapter` calls
  - Add effect to watch authentication state changes and switch adapters
  - Implement `handleLogin()` method to clear localStorage when user authenticates
  - Implement `handleLogout()` method to reset progress and load from localStorage
  - Update `recordAttempt()` to use storage adapter for saving
  - Update `recordDictationAttempt()` to use storage adapter for saving
  - _Requirements: 1.2, 1.3, 3.1, 3.2, 3.5, 4.2, 4.3_

- [x] 3. Add login warning modal


  - Create `LoginWarningModal` component with warning message about data loss
  - Add modal template with confirm/cancel buttons
  - Add styling for modal component
  - _Requirements: 3.3_

- [x] 4. Update AuthService with login flow


  - Add `showLoginWarning()` private method to check for guest data and show modal
  - Update `signInWithGoogle()` to show warning modal before OAuth redirect
  - Add logic to clear localStorage after successful authentication
  - Ensure localStorage is cleared before Supabase data is loaded
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 5. Update Header component for guest users


  - Add conditional rendering to show login button for guest users
  - Add "Login to Save Progress" button with appropriate styling
  - Update user menu to show for authenticated users only
  - Add computed signals for authentication state display
  - _Requirements: 6.2, 6.3_

- [x] 6. Remove authentication guards from routes


  - Update `app.routes.ts` to remove `AuthGuard` from exercise routes
  - Ensure all exercise pages are accessible without authentication
  - Keep authentication optional for all features
  - _Requirements: 1.1, 6.1, 6.4_

- [x] 7. Add error handling for storage operations


  - Implement storage quota exceeded error handling in `LocalStorageProvider`
  - Implement corrupted data error handling with automatic reset
  - Add user-friendly error messages using `ToastService`
  - Add retry logic for Supabase network errors
  - _Requirements: 1.5, 2.5_

- [x] 8. Update ExerciseService for guest compatibility



  - Ensure `ExerciseService` works without authentication
  - Remove any authentication checks from exercise loading
  - Verify exercise completion works for guest users
  - _Requirements: 6.4_

- [x] 9. Add analytics tracking for guest users






  - Store guest user identifier in localStorage
  - Track first exercise completion timestamp
  - Track total exercises completed by guest users
  - Ensure analytics data is cleared on login
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [ ]* 10. Write unit tests for storage providers
  - Test `LocalStorageProvider` save/load operations
  - Test data validation and sanitization
  - Test quota exceeded handling
  - Test corrupted data handling
  - Test `SupabaseStorageProvider` integration
  - Test `StorageAdapterFactory` adapter selection
  - _Requirements: 4.5_

- [ ]* 11. Write integration tests for auth transitions
  - Test guest user completing exercises
  - Test localStorage persistence across page refreshes
  - Test login flow with localStorage clearing
  - Test logout flow returning to guest mode
  - Test progress display for both guest and authenticated users
  - _Requirements: 1.1, 1.2, 1.3, 3.1, 3.2, 6.3_

- [x] 12. Add guest user indicators in UI







  - Add badge or indicator showing "Guest Mode" in header
  - Add tooltip explaining guest mode limitations
  - Add periodic prompts encouraging login for cloud sync
  - _Requirements: 6.2, 6.5_
