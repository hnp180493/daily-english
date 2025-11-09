# Implementation Plan

- [x] 1. Setup Supabase project và database schema





  - Create Supabase project và copy URL + anon key
  - Run database schema SQL để tạo tables (users, user_progress, user_favorites, custom_exercises, user_achievements, user_rewards)
  - Setup Row Level Security policies cho tất cả tables
  - Enable Realtime cho các tables cần sync (user_progress, user_favorites, custom_exercises)
  - Configure Google OAuth provider trong Supabase Authentication settings
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_

- [x] 2. Install dependencies và setup Supabase client






  - Install @supabase/supabase-js package
  - Create src/app/services/supabase.client.ts với Supabase client configuration
  - Update environment.ts để ensure supabase config có sẵn
  - _Requirements: 6.1, 6.2_

- [x] 3. Implement SupabaseDatabase service



  - [x] 3.1 Create supabase-database.service.ts implementing IDatabase interface

    - Create file src/app/services/database/supabase-database.service.ts
    - Implement class structure với inject supabaseClient
    - Add providedIn: 'root' decorator
    - _Requirements: 3.1_

  - [x] 3.2 Implement user profile operations

    - Implement saveUserProfile method với upsert vào users table
    - Implement loadUserProfile method với query từ users table
    - Handle date conversions giữa PostgreSQL và TypeScript
    - _Requirements: 3.2, 3.3_


  - [ ] 3.3 Implement progress operations
    - Implement saveProgress method với upsert vào user_progress table
    - Implement loadProgress method với query từ user_progress table
    - Implement subscribeToProgress method với Supabase Realtime channel
    - Handle JSONB data serialization/deserialization
    - _Requirements: 3.4, 3.5, 3.6_


  - [ ] 3.4 Implement favorites operations
    - Implement saveFavorites method với delete + insert pattern
    - Implement loadFavorites method với query và date transformation
    - Implement subscribeToFavorites method với Realtime channel

    - _Requirements: 3.7, 3.8, 3.9_

  - [ ] 3.5 Implement custom exercise operations
    - Implement saveCustomExercise method với upsert vào custom_exercises table
    - Implement loadCustomExercises method với query tất cả exercises của user
    - Implement deleteCustomExercise method với delete operation

    - Implement subscribeToCustomExercises method với Realtime channel
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

  - [ ] 3.6 Implement achievement và reward operations
    - Implement saveAchievements method với upsert vào user_achievements table
    - Implement loadAchievements method với JSONB data transformation

    - Implement saveRewards method với upsert vào user_rewards table
    - Implement loadRewards method với array type handling
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

  - [ ] 3.7 Add error handling và logging
    - Add try-catch blocks cho tất cả operations
    - Implement error transformation từ Supabase errors
    - Add console logging cho debugging
    - Return appropriate Observable errors
    - _Requirements: 3.1_

- [x] 4. Update AuthService để sử dụng Supabase Auth



  - [x] 4.1 Replace Firebase Auth imports với Supabase client

    - Remove @angular/fire/auth imports
    - Import supabaseClient từ supabase.client.ts
    - Update class properties để use Supabase types
    - _Requirements: 8.1_

  - [x] 4.2 Implement authentication methods

    - Implement signInWithGoogle method với supabase.auth.signInWithOAuth
    - Implement signOut method với supabase.auth.signOut
    - Update constructor để call getSession và setup onAuthStateChange
    - _Requirements: 8.2, 8.3, 8.4, 8.5_


  - [x] 4.3 Update user state management

    - Create helper method để map Supabase User to app User type
    - Update currentUser signal với mapped user data
    - Update isAuthenticated signal based on session
    - Maintain backward compatibility với existing getter methods
    - _Requirements: 8.6, 1.3_



  - [ ] 4.4 Handle authentication state changes
    - Subscribe to onAuthStateChange trong constructor
    - Update signals when auth state changes
    - Trigger user profile save on successful login
    - _Requirements: 1.5, 8.5_

- [x] 5. Update DatabaseService configuration


  - Update database injection từ FirebaseDatabase sang SupabaseDatabase
  - Verify tất cả existing methods vẫn work (no changes needed)
  - _Requirements: 6.4_

- [x] 6. Update app.config.ts


  - Remove provideFirebaseApp, provideAuth, provideFirestore providers
  - Verify application vẫn bootstrap correctly
  - _Requirements: 6.3_

- [ ] 7. Test authentication flow
  - Test Google login redirects correctly và returns với user data
  - Test user profile được created/updated trong Supabase
  - Test signOut clears session
  - Test auth state persistence across page reloads
  - Verify currentUser signal updates correctly
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 10.1_

- [ ] 8. Test database operations
  - Test saveProgress và loadProgress với sample data
  - Test subscribeToProgress receives realtime updates
  - Test saveFavorites và loadFavorites
  - Test subscribeToFavorites receives realtime updates
  - Test custom exercise CRUD operations
  - Test achievement và reward operations
  - Verify data persists across sessions
  - _Requirements: 10.2, 10.3, 10.4, 10.5, 10.6, 10.7_

- [x] 9. Cleanup Firebase dependencies


  - Remove @angular/fire package từ package.json
  - Remove firebase package từ package.json
  - Delete src/app/services/database/firebase-database.service.ts
  - Remove firebase config từ environment.ts
  - Run npm install để update dependencies
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

- [x] 10. Update documentation



  - Update README.md với Supabase setup instructions
  - Document environment variables needed
  - Add troubleshooting section
  - _Requirements: 6.5_
