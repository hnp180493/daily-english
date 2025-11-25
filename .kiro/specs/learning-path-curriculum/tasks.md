# Implementation Plan

- [x] 1. Create data models and interfaces





  - Create TypeScript interfaces for LearningPath, LearningModule, UserPathProgress, ModuleProgress, PathCompletion in `src/app/models/learning-path.model.ts`
  - Create interfaces for DailyChallenge, StreakData, StreakHistoryEntry in `src/app/models/daily-challenge.model.ts`
  - Create interfaces for WeeklyGoal, GoalHistory in `src/app/models/weekly-goal.model.ts`
  - Create interfaces for AdaptiveRecommendation, RecommendationReason enum, PerformanceAnalysis in `src/app/models/adaptive-learning.model.ts`
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 2.2, 2.3, 3.1, 3.2, 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 2. Set up database schema and migrations






  - [x] 2.1 Create Supabase migration for learning_path_progress table

    - Write SQL migration file `supabase-migrations/07-create-learning-path-progress.sql`
    - Include table creation with columns: id, user_id, current_path_id, current_module_id, start_date, completed_modules, module_progress, path_completions
    - Add timestamps and constraints
    - _Requirements: 1.5, 6.1_
  

  - [x] 2.2 Create Supabase migration for daily_challenges table

    - Write SQL migration file `supabase-migrations/08-create-daily-challenges.sql`
    - Include table creation with columns: id, user_id, date, exercise_id, is_completed, completed_at, score, bonus_points, is_weekend_challenge
    - Add unique constraint on (user_id, date)
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_
  

  - [x] 2.3 Create Supabase migration for weekly_goals table

    - Write SQL migration file `supabase-migrations/09-create-weekly-goals.sql`
    - Include table creation with columns: id, user_id, week_start_date, target_exercises, completed_exercises, is_achieved, bonus_points_earned
    - Add unique constraint on (user_id, week_start_date)
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_
  

  - [x] 2.5 Create RLS policies for all new tables

    - Write SQL migration file `supabase-migrations/11-enable-learning-path-rls.sql`
    - Enable RLS on all four tables
    - Create SELECT, INSERT, UPDATE policies for user-owned data
    - _Requirements: 1.5, 2.1, 3.1, 7.1_

- [x] 3. Create path configuration JSON files
  - [x] 3.1 Create beginner path configuration
    - Create JSON file `public/data/learning-paths/beginner-path.json`
    - Define 3 modules: Daily Life Basics (weeks 1-4), Travel & Transportation (weeks 5-8), Education & Work (weeks 9-12)
    - Map existing exercise IDs from beginner difficulty level to each module
    - Set translation support levels: full, partial, partial
    - _Requirements: 1.1, 1.2, 1.3, 5.1, 5.2_
  
  - [x] 3.2 Create intermediate path configuration
    - Create JSON file `public/data/learning-paths/intermediate-path.json`
    - Define 4 modules covering advanced grammar, professional communication, academic writing, business contexts
    - Map existing intermediate exercise IDs to modules
    - Set translation support to minimal
    - _Requirements: 1.1, 1.2, 5.3_
  
  - [x] 3.3 Create advanced path configuration
    - Create JSON file `public/data/learning-paths/advanced-path.json`
    - Define 6 modules covering business English, technical writing, literary analysis, debate, research, presentation skills
    - Map existing advanced exercise IDs to modules
    - Set translation support to none
    - _Requirements: 1.1, 1.2, 5.4, 8.4_

- [x] 4. Implement Curriculum Service
  - [x] 4.1 Create base curriculum service structure
    - Create service file `src/app/services/curriculum.service.ts`
    - Inject HttpClient, DatabaseService, AuthService
    - Create signals for currentPath, currentModule, pathProgress
    - Implement path loading from JSON files
    - _Requirements: 1.1, 1.2, 1.5_
  
  - [x] 4.2 Implement path management methods
    - Write getAllPaths() to load all path configurations
    - Write getPathById() to fetch specific path
    - Write getUserCurrentPath() to get user's active path
    - Write selectPath() to set user's current path and persist to database
    - _Requirements: 1.1, 1.2, 1.5_
  
  - [x] 4.3 Implement module management methods
    - Write getCurrentModule() to get user's current module
    - Write unlockNextModule() to unlock next module based on completion
    - Write getModuleProgress() to calculate module completion percentage
    - Implement module unlock logic based on requiredScore
    - _Requirements: 1.3, 1.4_
  
  - [x] 4.4 Implement progress tracking methods
    - Write getUserPathProgress() to load from database
    - Write updateModuleProgress() to record exercise completion
    - Write calculatePathCompletion() to compute overall path progress
    - Implement progress persistence to Supabase
    - _Requirements: 1.5, 6.1, 6.2, 6.3, 6.4, 6.5_
  
  - [x] 4.5 Implement path completion methods
    - Write completeModule() to mark module as done and unlock next
    - Write completePath() to finalize path and unlock next path
    - Write generateCertificate() to create completion certificate with user name and date
    - Award 5000 bonus points on path completion
    - _Requirements: 8.1, 8.2, 8.3, 8.5_

- [x] 5. Implement Adaptive Engine Service
  - [x] 5.1 Create adaptive engine service structure
    - Create service file `src/app/services/adaptive-engine.service.ts`
    - Inject ProgressService, ExerciseService, CurriculumService
    - Create methods for performance analysis
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_
  
  - [x] 5.2 Implement performance analysis methods
    - Write analyzePerformance() to calculate category scores from last 10 exercises
    - Write identifyWeakCategories() to find categories with < 70% average
    - Write calculateTranslationDependency() to track English-only thinking progress
    - Return PerformanceAnalysis object with trends
    - _Requirements: 4.1, 4.2, 5.5, 6.3_
  
  - [x] 5.3 Implement recommendation algorithm
    - Write getNextRecommendedExercise() with multi-step logic:
      - If < 5 exercises completed, return sequential from current module
      - If weak categories exist, prioritize exercises from those categories
      - If all categories > 85%, suggest next difficulty level
      - Exclude exercises completed in last 30 days
    - Return AdaptiveRecommendation with confidence score and reason
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_
  
  - [x] 5.4 Implement daily challenge generation
    - Write generateDailyChallenge() to select appropriate exercise
    - Check if weekend (Saturday/Sunday) for special challenge
    - Use recommendation algorithm to select exercise
    - Mark as weekend challenge if applicable
    - _Requirements: 2.1, 2.5_

- [x] 6. Implement Streak Service
  - [x] 6.1 Create streak service structure
    - Create service file `src/app/services/streak.service.ts`
    - Inject DatabaseService, AuthService, ProgressService
    - Integrate with existing streak tracking in UserProgress model
    - _Requirements: 2.2, 2.3, 2.4_
  
  - [x] 6.2 Implement streak tracking methods
    - Write getCurrentStreak() to get current streak from ProgressService
    - Write getLongestStreak() to calculate from streak history
    - Write updateStreak() to handle daily completion (already exists in ProgressService, create wrapper)
    - Write getStreakHistory() to return last N days of activity
    - _Requirements: 2.2, 2.3, 6.2_
  
  - [x] 6.3 Implement streak multiplier logic
    - Write getStreakMultiplier() to return 1.0 or 1.5 based on streak >= 7
    - Write applyStreakBonus() to multiply points by multiplier
    - Integrate with exercise completion flow
    - _Requirements: 2.4_

- [x] 7. Implement Notification Service
  - [x] 7.1 Create notification service structure
    - Create service file `src/app/services/notification.service.ts`
    - Inject DatabaseService, AuthService
    - Request browser notification permissions
    - Load user notification preferences from database
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_
  
  - [x] 7.2 Implement notification configuration methods
    - Write enableNotifications() to request permissions and save preference
    - Write disableNotifications() to update preference
    - Write setReminderTime() to customize notification time
    - _Requirements: 7.5_
  
  - [x] 7.3 Implement notification scheduling
    - Write sendDailyChallengeReminder() to schedule at user's preferred time (default 19:00)
    - Write sendUrgentReminder() to alert 2 hours before midnight if challenge incomplete
    - Use browser Notification API with title, body, icon
    - Check if notifications are enabled before sending
    - _Requirements: 7.1, 7.2, 7.3, 7.4_
  
  - [x] 7.4 Implement goal and achievement notifications
    - Write sendGoalProgressUpdate() to notify when within 2 exercises of goal
    - Write sendGoalAchievement() to celebrate goal completion
    - Write sendStreakMilestone() to notify on 5, 7, 14, 30 day streaks
    - Write sendPathCompletion() to congratulate on path completion
    - _Requirements: 3.5, 7.3_

- [x] 8. Create Path Selector Component
  - [x] 8.1 Create path selector component files
    - Create component file `src/app/components/learning-path/path-selector/path-selector.ts`
    - Create template file `src/app/components/learning-path/path-selector/path-selector.html`
    - Create styles file `src/app/components/learning-path/path-selector/path-selector.scss`
    - Set up standalone component with required imports
    - _Requirements: 1.1, 1.2_
  
  - [x] 8.2 Implement path selector component logic
    - Inject CurriculumService
    - Load all paths using getAllPaths()
    - Create signal for selected path
    - Implement selectPath() method to set user's path
    - Check unlock requirements for each path
    - _Requirements: 1.1, 1.2, 8.2, 8.3_
  
  - [x] 8.3 Create path selector template
    - Display path cards in grid layout using @for loop
    - Show path name, duration, description
    - Display module badges with topics
    - Show lock icon for locked paths
    - Add "Start Path" or "Continue" button
    - Show current progress percentage if path is active
    - _Requirements: 1.1, 1.2, 1.3_
  
  - [x] 8.4 Style path selector component
    - Create card-based layout with Tailwind classes
    - Add hover effects and transitions
    - Style locked state with opacity and disabled cursor
    - Add responsive grid (1 column mobile, 3 columns desktop)
    - Use theme colors for primary actions
    - _Requirements: 1.1_

- [x] 9. Create Daily Challenge Component
  - [x] 9.1 Create daily challenge component files
    - Create component file `src/app/components/learning-path/daily-challenge/daily-challenge.ts`
    - Create template file `src/app/components/learning-path/daily-challenge/daily-challenge.html`
    - Create styles file `src/app/components/learning-path/daily-challenge/daily-challenge.scss`
    - Set up standalone component with RouterModule import
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_
  
  - [x] 9.2 Implement daily challenge component logic
    - Inject CurriculumService, AdaptiveEngineService, StreakService, DatabaseService
    - Load today's daily challenge from database
    - If no challenge exists, generate using AdaptiveEngineService
    - Create signal for challenge state (exercise, isCompleted, streak, timeRemaining)
    - Implement countdown timer using setInterval
    - Calculate bonus multiplier from streak
    - _Requirements: 2.1, 2.2, 2.4, 2.5_
  
  - [x] 9.3 Create daily challenge template
    - Display challenge card with exercise title and description
    - Show current streak with fire icon and count
    - Display countdown timer until midnight
    - Show bonus multiplier badge if streak >= 7
    - Add "Start Challenge" button linking to exercise detail
    - Show completion checkmark if already completed
    - Display "Come back tomorrow" message if completed
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_
  
  - [x] 9.4 Style daily challenge component
    - Create prominent card with gradient background
    - Animate streak counter with pulse effect
    - Style timer with large, readable font
    - Add celebration animation on completion
    - Use warm colors for streak elements
    - _Requirements: 2.1, 2.2_

- [x] 10. Create Progress Dashboard Component
  - [x] 10.1 Create progress dashboard component files
    - Create component file `src/app/components/learning-path/progress-dashboard/progress-dashboard.ts`
    - Create template file `src/app/components/learning-path/progress-dashboard/progress-dashboard.html`
    - Create styles file `src/app/components/learning-path/progress-dashboard/progress-dashboard.scss`
    - Set up standalone component with chart library imports (if needed)
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_
  
  - [x] 10.2 Implement progress dashboard component logic
    - Inject CurriculumService, AdaptiveEngineService, ProgressService
    - Load user path progress using getUserPathProgress()
    - Calculate completion percentage using calculatePathCompletion()
    - Get performance analysis using analyzePerformance()
    - Calculate estimated completion date based on current pace
    - Create signals for all dashboard data
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 5.5_
  
  - [x] 10.3 Create progress dashboard template
    - Display current path name and completion percentage with progress bar
    - Show module timeline with completed/current/upcoming indicators
    - Display category performance with visual indicators (bars or radar chart)
    - Show translation dependency score with progress indicator
    - Display estimated completion date
    - Show recent activity feed (last 5 exercises)
    - Add statistics cards: total exercises, average score, longest streak
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 5.5_
  
  - [x] 10.4 Style progress dashboard component
    - Create dashboard grid layout with Tailwind
    - Style progress bars with gradient fills
    - Add card-based sections for different metrics
    - Use color coding for performance levels (red < 70%, yellow 70-85%, green > 85%)
    - Add responsive layout for mobile and desktop
    - _Requirements: 6.1, 6.2, 6.3_

- [x] 11. Create Goal Tracker Component
  - [x] 11.1 Create goal tracker component files
    - Create component file `src/app/components/learning-path/goal-tracker/goal-tracker.ts`
    - Create template file `src/app/components/learning-path/goal-tracker/goal-tracker.html`
    - Create styles file `src/app/components/learning-path/goal-tracker/goal-tracker.scss`
    - Set up standalone component
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_
  
  - [x] 11.2 Implement goal tracker component logic
    - Inject DatabaseService, ProgressService, NotificationService
    - Load current week's goal from weekly_goals table
    - Calculate week start date (Monday 00:00)
    - Track completed exercises this week from exercise history
    - Update goal progress on exercise completion
    - Check if goal is achieved and award 500 bonus points
    - Send notification when within 2 exercises of goal
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_
  
  - [x] 11.3 Create goal tracker template
    - Display goal setting interface with number input (3-50 range)
    - Show circular progress ring with percentage
    - Display completed/target exercises count
    - Show days remaining in week
    - Add motivational message based on progress
    - Display "Goal Achieved!" celebration when complete
    - Show historical achievement rate
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_
  
  - [x] 11.4 Style goal tracker component
    - Create circular progress visualization with SVG
    - Animate progress ring on updates
    - Style goal input with clear labels
    - Add success state styling for achieved goals
    - Use encouraging colors (green for on track, yellow for behind)
    - _Requirements: 3.1, 3.2, 3.3_

- [x] 12. Create main Learning Path page component
  - [x] 12.1 Create learning path page component files
    - Create component file `src/app/components/learning-path/learning-path.ts`
    - Create template file `src/app/components/learning-path/learning-path.html`
    - Create styles file `src/app/components/learning-path/learning-path.scss`
    - Set up standalone component importing all sub-components
    - _Requirements: 1.1, 2.1, 3.1, 6.1_
  
  - [x] 12.2 Implement learning path page layout
    - Create tab navigation for: Path Overview, Daily Challenge, Progress, Goals
    - Conditionally render selected tab content
    - Show path selector if user has no active path
    - Display daily challenge prominently on main view
    - Add quick stats summary at top
    - _Requirements: 1.1, 2.1, 3.1, 6.1_
  
  - [x] 12.3 Add route for learning path page
    - Add route entry in `src/app/app.routes.ts` for '/learning-path'
    - Apply authGuard to protect route
    - Add SEO metadata with Vietnamese translations
    - Set preload priority to high
    - _Requirements: 1.1_

- [x] 13. Integrate learning path with exercise completion flow
  - [x] 13.1 Update exercise detail component
    - Modify `src/app/components/exercise-detail/exercise-detail.ts`
    - Inject CurriculumService and StreakService
    - On exercise completion, update module progress via CurriculumService
    - Apply streak multiplier to points earned
    - Check if exercise is daily challenge and mark as completed
    - Update weekly goal progress
    - _Requirements: 1.4, 2.2, 2.3, 2.4, 3.2_
  
  - [x] 13.2 Update progress service integration
    - Modify recordAttempt() in ProgressService to notify CurriculumService
    - Trigger module unlock check after exercise completion
    - Update daily challenge completion status
    - Increment weekly goal counter
    - _Requirements: 1.4, 2.2, 3.2_

- [x] 14. Add navigation and UI integration
  - [x] 14.1 Update header navigation
    - Modify `src/app/components/header/header.ts` and template
    - Add "Learning Path" navigation link
    - Show daily challenge indicator badge if incomplete
    - Display current streak count in header
    - _Requirements: 1.1, 2.1, 2.2_
  
  - [x] 14.2 Update home page with learning path widgets
    - Modify `src/app/components/home/home.ts` and template
    - Add daily challenge card widget
    - Add weekly goal progress widget
    - Add "Continue Learning" button linking to current module
    - Show path progress summary
    - _Requirements: 1.1, 2.1, 3.1, 6.1_

- [x] 15. Implement database service extensions
  - [x] 15.1 Extend database interface
    - Modify `src/app/services/database/database.interface.ts`
    - Add method signatures for learning path operations:
      - saveLearningPathProgress, loadLearningPathProgress
      - saveDailyChallenge, loadDailyChallenge, loadDailyChallengeByDate
      - saveWeeklyGoal, loadWeeklyGoal, loadWeeklyGoalByDate
    - _Requirements: 1.5, 2.1, 3.1_
  
  - [x] 15.2 Implement Supabase database methods
    - Modify `src/app/services/database/supabase-database.service.ts`
    - Implement all learning path database methods
    - Add error handling and retry logic
    - Use RLS policies for security
    - _Requirements: 1.5, 2.1, 3.1, 7.1_
  
  - [x] 15.3 Add convenience methods to DatabaseService
    - Modify `src/app/services/database/database.service.ts`
    - Add auto methods that use AuthService to get userId:
      - saveLearningPathProgressAuto, loadLearningPathProgressAuto
      - saveDailyChallengeAuto, loadTodaysDailyChallengeAuto
      - saveWeeklyGoalAuto, loadCurrentWeeklyGoalAuto
    - _Requirements: 1.5, 2.1, 3.1_

- [x] 16. Create path completion certificate feature
  - [x] 16.1 Create certificate component
    - Create component file `src/app/components/learning-path/certificate/certificate.ts`
    - Create template file `src/app/components/learning-path/certificate/certificate.html`
    - Create styles file `src/app/components/learning-path/certificate/certificate.scss`
    - Design certificate layout with user name, path name, completion date
    - Add download as image functionality
    - _Requirements: 8.1_
  
  - [x] 16.2 Integrate certificate generation
    - Trigger certificate display on path completion
    - Store certificate ID in path_completions
    - Add "View Certificates" section in learning path page
    - Allow sharing certificate on social media
    - _Requirements: 8.1_

- [ ]* 17. Add analytics and tracking
  - [ ]* 17.1 Implement analytics events
    - Add tracking for path selection
    - Track daily challenge completion rate
    - Monitor goal achievement rate
    - Track module completion time
    - _Requirements: 6.1, 6.2, 6.3, 6.4_
  
  - [ ]* 17.2 Create admin dashboard for path analytics
    - Create component for viewing aggregate statistics
    - Show popular paths and modules
    - Display average completion times
    - Track user engagement metrics
    - _Requirements: 6.1, 6.2, 6.3_

- [ ]* 18. Implement notification scheduling system
  - [ ]* 18.1 Create background notification scheduler
    - Use Web Workers or Service Workers for background tasks
    - Schedule daily reminders at user's preferred time
    - Handle browser notification permissions
    - Queue notifications when offline
    - _Requirements: 7.1, 7.2, 7.3, 7.4_
  
  - [ ]* 18.2 Add notification preferences UI
    - Create settings page for notification configuration
    - Add time picker for reminder time
    - Add toggles for different notification types
    - Test notification delivery
    - _Requirements: 7.5_
