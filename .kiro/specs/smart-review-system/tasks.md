# Implementation Plan

- [x] 1. Create data models and interfaces





  - Define TypeScript interfaces for ReviewData, ReviewQueueItem, ReviewStats, ErrorPattern, and WeakPoint
  - Create ReviewHistoryEntry, GrammarLesson, and VocabularyDrill interfaces
  - Add enums for urgency levels and review status
  - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.2, 2.3, 3.1, 4.1_

- [x] 2. Implement Spaced Repetition Algorithm




- [x] 2.1 Create spaced-repetition.algorithm.ts utility


  - Implement SM-2 algorithm with calculateNextInterval method
  - Write getPerformanceGrade function to map scores to grades (1-5)
  - Implement adjustEasinessFactor method with SM-2 formula
  - Add validation for input parameters
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [ ]* 2.2 Write unit tests for spaced repetition algorithm
  - Test interval calculations for all performance grades
  - Test easiness factor adjustments
  - Test edge cases (first review, perfect scores, failures)
  - _Requirements: 3.1, 3.2, 3.3_

- [ ] 3. Implement Error Pattern Analyzer
- [x] 3.1 Create error-pattern-analyzer.ts service


  - Implement analyzePatterns method to group errors by type
  - Write identifyWeakPoints method to find recurring patterns
  - Implement frequency calculation logic
  - Add suggestGrammarLessons method to map errors to lessons
  - Create generateVocabularyDrill method for targeted practice
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_

- [ ]* 3.2 Write unit tests for error pattern analyzer
  - Test pattern identification with mock feedback data
  - Test weak point categorization
  - Test frequency calculations
  - _Requirements: 4.1, 4.5_

- [ ] 4. Extend Database Service for review data
- [x] 4.1 Add review data CRUD methods to database.service.ts


  - Implement saveReviewData method for Firestore persistence
  - Create loadReviewData method to fetch review data by exerciseId
  - Add loadAllReviewData method to fetch user's complete review history
  - Implement updateReviewSchedule method for next review date updates
  - Add deleteReviewData method for cleanup
  - _Requirements: 3.1, 3.2, 3.5_

- [x] 4.2 Add Firestore security rules for review collection


  - Create security rules in firestore.rules for users/{userId}/reviews
  - Ensure users can only access their own review data
  - Add validation rules for review data structure
  - _Requirements: 3.1, 3.5_

- [x] 5. Implement Review Service


- [ ] 5.1 Create review.service.ts core service
  - Inject ProgressService, ExerciseService, DatabaseService, and algorithm utilities
  - Implement getReviewQueue method to generate prioritized queue
  - Create getReviewQueueSignal using Angular signals
  - Add scheduleNextReview method to calculate and save next review date
  - Implement getNextReviewDate method to retrieve scheduled date
  - Create getDueReviews method to filter exercises due for review

  - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 2.3, 2.4, 3.1, 3.2, 3.6_

- [x] 5.2 Add error pattern analysis methods to review.service.ts

  - Implement getErrorPatterns method using ErrorPatternAnalyzer
  - Create getWeakPoints method to identify user's weak areas
  - Add generateCustomExercise method for targeted practice
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [x] 5.3 Add statistics and history methods to review.service.ts


  - Implement getReviewStats method to calculate weekly stats
  - Create getReviewHistory method to fetch exercise review history
  - Add getIncorrectQuestions method for quick review mode
  - Implement consistency tracking for 30-day view
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [ ]* 5.4 Write unit tests for review service
  - Test queue generation and sorting logic
  - Test review scheduling with mock data
  - Test statistics calculations
  - _Requirements: 1.1, 2.1, 6.1_

- [-] 6. Create Review Queue Item Component

- [x] 6.1 Generate review-queue-item component

  - Create standalone component with selector 'app-review-queue-item'
  - Define input signals for ReviewQueueItem data
  - Define output events for startReview and startQuickReview
  - Set changeDetection to OnPush
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_



- [x] 6.2 Implement review-queue-item template

  - Display exercise title and difficulty badge
  - Add urgency indicator with color coding (red/yellow/green)
  - Show last attempt score and next review date
  - Display estimated time and incorrect question count
  - Add "Start Review" and "Quick Review" buttons


  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

- [x] 6.3 Style review-queue-item component

  - Apply Tailwind utility classes for card layout
  - Implement urgency color scheme (red: #EF4444, yellow: #F59E0B, green: #10B981)
  - Add hover effects and transitions


  - Ensure responsive design for mobile
  - _Requirements: 2.1, 2.2, 2.3_

- [x] 7. Create Review Stats Component


- [x] 7.1 Generate review-stats component

  - Create standalone component with selector 'app-review-stats'
  - Define input signal for ReviewStats data
  - Set changeDetection to OnPush
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_




- [x] 7.2 Implement review-stats template

  - Display reviews completed this week counter
  - Show average score improvement percentage
  - Display weak points improved count
  - Add current streak indicator
  - Create 30-day consistency chart using simple bar visualization
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 7.3 Style review-stats component

  - Apply Tailwind grid layout for stat cards
  - Use theme colors for visual consistency
  - Add icons for each stat metric
  - Implement responsive design
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 8. Create Review Queue Component

- [x] 8.1 Generate review-queue component


  - Create standalone component with selector 'app-review-queue'
  - Inject ReviewService using inject() function
  - Create computed signals for filtered queue
  - Set changeDetection to OnPush
  - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.5_


- [x] 8.2 Implement review-queue component logic

  - Subscribe to reviewQueue signal from ReviewService
  - Implement filterByUrgency method for urgency filtering
  - Add sortQueue method with options (urgency, date, difficulty)
  - Create startReview method to navigate to exercise detail
  - Implement startQuickReview method with quick mode parameter
  - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.5, 2.6_


- [x] 8.3 Implement review-queue template

  - Add app-review-stats component at top
  - Create filter buttons for urgency levels
  - Add sort dropdown for queue ordering
  - Use @for to iterate over filteredQueue signal
  - Render app-review-queue-item for each item
  - Handle empty state with encouraging message
  - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.5, 2.6_


- [x] 8.4 Style review-queue component

  - Apply Tailwind container and spacing utilities
  - Style filter buttons with active states
  - Implement responsive grid for queue items
  - Add loading spinner for async data
  - _Requirements: 2.1_

- [x] 9. Create Error Patterns Component

- [x] 9.1 Generate error-patterns component


  - Create standalone component with selector 'app-error-patterns'
  - Inject ReviewService using inject() function
  - Create signals for error patterns and weak points
  - Set changeDetection to OnPush
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_


- [x] 9.2 Implement error-patterns component logic

  - Subscribe to errorPatterns from ReviewService
  - Implement viewGrammarLesson method to show lesson details
  - Add startVocabularyDrill method to launch practice
  - Create generateCustomExercise method for weak points
  - _Requirements: 4.2, 4.3, 4.4_


- [x] 9.3 Implement error-patterns template

  - Display list of error patterns with frequency charts
  - Show weak point cards with improvement rates
  - Add grammar lesson recommendation buttons
  - Include vocabulary drill generator
  - Display custom exercise creation option
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_


- [x] 9.4 Style error-patterns component

  - Apply Tailwind card layouts for patterns
  - Use color coding for error types
  - Add progress bars for improvement tracking
  - Ensure responsive design
  - _Requirements: 4.5, 4.6_

- [ ] 10. Enhance Exercise Detail Component for Quick Review Mode
- [x] 10.1 Add quick review mode support to exercise-detail component


  - Add quickReviewMode input signal to component
  - Inject ReviewService to get incorrect sentence indices
  - Create computed signal to filter sentences for quick review
  - Update sentence iteration to show only incorrect ones in quick mode
  - _Requirements: 2.6, 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 10.2 Update exercise-detail template for quick review

  - Add quick review mode indicator banner
  - Display original incorrect answer alongside new input
  - Show progress indicator (X of Y incorrect questions)
  - Add "Exit Quick Review" button to switch to full mode
  - Update completion message for quick review
  - _Requirements: 2.6, 5.2, 5.3, 5.4, 5.5_


- [x] 10.3 Update exercise completion logic for reviews

  - Call ReviewService.scheduleNextReview after exercise completion
  - Pass performance score to update review schedule
  - Update ReviewData with new attempt information
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 5.2_

- [-] 11. Add review queue badge to Header Component

- [x] 11.1 Update header component with review notification

  - Inject ReviewService in header component
  - Create computed signal for due review count
  - Add badge display next to navigation items
  - Implement click handler to navigate to review queue
  - _Requirements: 3.6_

- [x] 11.2 Update header template with review badge


  - Add review queue link with badge indicator
  - Display count of urgent reviews (red badge)
  - Add icon for review section
  - Style badge with Tailwind utilities
  - _Requirements: 3.6_

- [x] 12. Add routing for review pages



- [x] 12.1 Update app.routes.ts with review routes

  - Add route for '/review-queue' pointing to ReviewQueueComponent
  - Add route for '/error-patterns' pointing to ErrorPatternsComponent
  - Configure lazy loading if needed
  - _Requirements: 1.1, 4.1_

- [ ] 13. Initialize review data for existing users
- [x] 13.1 Create migration utility for review data initialization


  - Write migration function to create ReviewData from existing ExerciseAttempts
  - Calculate initial intervals based on last attempt scores
  - Set default easiness factors (2.5)
  - Determine next review dates using spaced repetition algorithm
  - _Requirements: 3.1, 3.5_

- [x] 13.2 Add migration trigger to review service initialization


  - Check if user has review data on first load
  - Run migration if review collection is empty but progress exists
  - Log migration results for debugging
  - _Requirements: 3.5_

- [x] 14. Implement review notifications
- [x] 14.1 Add notification logic to review service


  - Create checkDueReviews method to identify reviews due within 24 hours
  - Implement notification display using toast UI system
  - Add notification scheduling on app initialization
  - Created ToastService and ToastContainer component
  - Added test utilities for development
  - _Requirements: 3.6_

- [ ]* 14.2 Write integration tests for review flow
  - Test complete review flow from queue to completion
  - Test quick review mode activation and completion
  - Test review schedule updates after exercise completion
  - _Requirements: 5.1, 5.2, 5.4_

- [ ] 15. Add accessibility features
- [x] 15.1 Implement keyboard navigation for review queue


  - Add tabindex to review queue items
  - Implement Enter key handler to start review
  - Add arrow key navigation between items
  - Ensure focus indicators are visible
  - _Requirements: 2.1_

- [x] 15.2 Add ARIA labels and screen reader support


  - Add aria-label to urgency indicators
  - Include aria-live regions for dynamic updates
  - Add descriptive labels to all buttons
  - Ensure color is not the only indicator (add text labels)
  - _Requirements: 2.1, 2.2, 2.3_

- [ ] 16. Performance optimization
- [x] 16.1 Implement virtual scrolling for large review queues


  - Add CDK virtual scroll to review queue list
  - Configure item size and buffer
  - Test with large datasets (100+ items)
  - _Requirements: 2.1_

- [x] 16.2 Add caching for review data


  - Implement in-memory cache for review queue
  - Add cache invalidation on updates
  - Reduce Firestore reads with cached data
  - _Requirements: 1.5, 2.1_

- [x] 17. Final integration and testing
- [x] 17.1 Test complete user flow


  - Verify review queue displays correctly with real data
  - Test review scheduling after exercise completion
  - Validate error pattern detection with multiple attempts
  - Test quick review mode functionality
  - Verify statistics calculations are accurate
  - _Requirements: 1.1, 2.1, 3.1, 4.1, 5.1, 6.1_

- [x] 17.2 Verify responsive design on mobile devices


  - Test review queue on mobile viewport
  - Verify touch interactions work correctly
  - Ensure text is readable on small screens
  - Test navigation between review pages
  - _Requirements: 2.1_

- [ ]* 17.3 Run accessibility audit
  - Run AXE accessibility checker on all review components
  - Fix any WCAG AA violations
  - Test with screen reader
  - Verify keyboard navigation works throughout
  - _Requirements: 2.1_
