# Implementation Plan

- [x] 1. Create data models and interfaces





  - Create `src/app/models/dictation.model.ts` with all dictation-related interfaces
  - Define `DictationSentence`, `DictationFeedback`, `TextDifference`, `MistakeCategory`, `DictationPracticeAttempt`, and `DictationProgress` interfaces
  - _Requirements: 1.1, 1.3, 1.4, 1.5_

- [x] 2. Update UserProgress model to include dictation history





  - Modify `src/app/models/exercise.model.ts` to add `dictationHistory` field to `UserProgress` interface
  - _Requirements: 1.5, 7.1_

- [x] 3. Implement DictationPracticeService core functionality



- [x] 3.1 Create service file and basic structure

  - Create `src/app/services/dictation-practice.service.ts`
  - Set up dependency injection for DatabaseService and AuthService
  - Add providedIn: 'root' configuration
  - _Requirements: 1.1, 1.5_


- [x] 3.2 Implement text splitting and session initialization

  - Write `initializeDictationSession()` method to split translated text into sentences
  - Use regex pattern to split on sentence boundaries (., !, ?)
  - Create `DictationSentence` objects for each sentence
  - _Requirements: 1.3, 3.1_



- [x] 3.3 Implement accuracy calculation algorithm
  - Install `fast-levenshtein` package for string distance calculation
  - Write `calculateAccuracy()` method using Levenshtein distance
  - Implement character-level accuracy calculation
  - Implement word-level accuracy calculation with tokenization
  - Normalize text (trim, lowercase) before comparison

  - _Requirements: 1.4, 4.1, 4.2_


- [x] 3.4 Implement difference detection and mistake categorization
  - Write diff algorithm to detect text differences (match, insert, delete, replace)
  - Implement `categorizeMistakes()` method to identify missing, extra, and misspelled words
  - Track position indices for highlighting
  - Return `DictationFeedback` object with all analysis results


  - _Requirements: 4.2, 4.3, 4.4_

- [x] 3.5 Implement data persistence methods
  - Write `saveDictationAttempt()` method to save attempts to Firestore
  - Write `loadDictationHistory()` method to retrieve dictation progress
  - Write `getBestDictationAttempt()` method to get latest attempt for an exercise
  - Write `getTranslatedText()` method to retrieve translation from exercise history
  - Use Firestore path: `users/{userId}/dictationProgress`
  - _Requirements: 1.5, 5.1, 5.3, 5.4, 5.5_

- [x] 4. Update ProgressService for dictation tracking



- [x] 4.1 Add dictation history management

  - Modify `src/app/services/progress.service.ts` to handle `dictationHistory` field
  - Update `getDefaultProgress()` to initialize empty `dictationHistory` object
  - Update `migrateProgressData()` to handle dictation history migration
  - _Requirements: 7.1, 7.2_


- [x] 4.2 Implement dictation attempt recording

  - Write `recordDictationAttempt()` method similar to `recordAttempt()`
  - Update dictation history with latest attempt per exercise
  - Update streak calculation to include dictation practice
  - Save to Firestore after recording
  - _Requirements: 1.5, 7.1, 7.5_


- [x] 4.3 Add dictation-specific achievements
  - Add achievement checks for `first-dictation`, `dictation-master`, and `perfect-dictation`
  - Update `checkAchievements()` method to include dictation criteria
  - Award points for dictation completion
  - _Requirements: 7.5_

- [x] 5. Create DictationFeedbackComponent


- [x] 5.1 Create component files and basic structure


  - Create `src/app/components/dictation-feedback/` directory
  - Create `dictation-feedback.ts`, `dictation-feedback.html`, and `dictation-feedback.scss`
  - Set up component with standalone configuration and OnPush change detection
  - Define input signals for feedback data
  - _Requirements: 1.4, 4.2, 4.3, 4.4, 6.5_


- [x] 5.2 Implement feedback display template
  - Display overall accuracy score
  - Show original text vs user input with highlighting
  - Display character and word accuracy metrics
  - Show categorized mistakes (missing, extra, misspelled words)
  - Use color coding for different error types (red for errors, green for correct)
  - _Requirements: 4.2, 4.3, 4.4, 6.2_


- [x] 5.3 Style feedback component
  - Apply Tailwind CSS classes for consistent styling
  - Implement dark mode support
  - Add animations for feedback appearance
  - Ensure responsive design for mobile devices
  - Match styling with existing FeedbackPanelComponent
  - _Requirements: 6.1, 6.2, 6.5_

- [x] 6. Create DictationPracticeComponent


- [x] 6.1 Create component files and basic structure


  - Create `src/app/components/dictation-practice/` directory
  - Create `dictation-practice.ts`, `dictation-practice.html`, and `dictation-practice.scss`
  - Set up component with standalone configuration and OnPush change detection
  - Inject required services (DictationPracticeService, TTSService, ProgressService, Router, ActivatedRoute)
  - _Requirements: 1.1, 1.2, 6.1_


- [x] 6.2 Implement component state management

  - Define signals for exercise, translatedText, sentences, currentSentenceIndex, userInput
  - Define signals for audio state (isPlaying, isPaused, playbackSpeed)
  - Define signals for feedback display (showFeedback, currentAccuracy)
  - Create computed signals for currentSentence, progressPercentage, isComplete
  - _Requirements: 1.3, 1.4, 3.2, 3.3_



- [x] 6.3 Implement component initialization

  - Write `ngOnInit()` to load exercise ID from route params
  - Retrieve translated text from exercise history via DictationPracticeService
  - Initialize dictation session with sentence splitting
  - Handle error cases (no translation available, invalid exercise ID)
  - _Requirements: 1.1, 5.3, 5.4_




- [x] 6.4 Implement audio playback controls

  - Write `playAudio()` method to speak current sentence using TTSService
  - Write `pauseAudio()` method to pause playback
  - Write `stopAudio()` method to stop playback
  - Write `adjustSpeed()` method to change playback speed (0.5x, 1x, 1.5x, 2x)
  - Update audio state signals based on TTS events
  - _Requirements: 1.2, 2.1, 2.2, 2.3_





- [x] 6.5 Implement sentence navigation

  - Write `nextSentence()` method to advance to next sentence
  - Write `previousSentence()` method to go back to previous sentence
  - Write `goToSentence(index)` method for direct navigation
  - Update currentSentenceIndex signal
  - Reset userInput and feedback when navigating
  - _Requirements: 3.1, 3.2, 3.4_





- [x] 6.6 Implement answer submission and feedback

  - Write `submitAnswer()` method to check user input
  - Call DictationPracticeService.calculateAccuracy() to get feedback
  - Update currentAccuracy signal with score
  - Show feedback component with results
  - Mark sentence as completed if accuracy >= 75%
  - Auto-advance to next sentence if passing score
  - _Requirements: 1.4, 4.1, 4.2, 4.3, 4.4_





- [x] 6.7 Implement session completion

  - Write `completeSession()` method triggered when all sentences are done
  - Calculate overall accuracy from all sentence attempts
  - Create DictationPracticeAttempt object with all session data
  - Save attempt via DictationPracticeService
  - Record attempt in ProgressService
  - Show completion summary with final score
  - _Requirements: 1.5, 7.1, 7.2, 7.3, 7.4_





- [x] 6.8 Implement keyboard shortcuts

  - Add keydown event listener for Enter (submit answer or next sentence)
  - Add keydown event listener for Space (play/pause audio)
  - Add keydown event listener for Arrow keys (navigate sentences)
  - Add keydown event listener for R (replay audio)
  - Ensure shortcuts don't interfere with text input

  - _Requirements: 6.3_




- [x] 6.9 Create component template

  - Add header with exercise title and progress indicator
  - Add audio controls section (play, pause, stop, speed selector)
  - Add sentence counter display (e.g., "Sentence 3 of 10")
  - Add text input area for user answer
  - Add action buttons (Check Answer, Replay Audio, Skip, Next)
  - Integrate DictationFeedbackComponent for showing results
  - Add completion summary section


  - _Requirements: 1.1, 1.2, 1.3, 1.4, 3.2, 6.1, 6.2_



- [x] 6.10 Style dictation practice component

  - Apply Tailwind CSS classes for layout and styling
  - Implement dark mode support
  - Ensure responsive design for mobile devices
  - Match styling with ExerciseDetailComponent for consistency
  - Add loading states and transitions
  - Style audio controls and progress indicators
  - _Requirements: 6.1, 6.2, 6.5_

- [x] 7. Modify ExerciseDetailComponent to add dictation option


- [x] 7.1 Add "Practice Dictation" button in review mode


  - Modify `src/app/components/exercise-detail/exercise-detail.html`
  - Add button in review actions section
  - Show button only when in review mode and translation exists
  - Add icon (🎧) and tooltip for the button
  - _Requirements: 1.1, 5.1, 5.2, 6.1_

- [x] 7.2 Implement navigation to dictation practice

  - Write `onPracticeDictation()` method in `exercise-detail.ts`
  - Navigate to `/exercises/:id/dictation` route
  - Pass exercise ID as route parameter
  - _Requirements: 1.1, 5.3_

- [x] 7.3 Style dictation button

  - Apply distinct color (purple accent) to differentiate from other buttons
  - Ensure button is accessible and has proper focus states
  - Match styling with other action buttons
  - _Requirements: 6.1, 6.2_

- [x] 8. Add routing for dictation practice


  - Modify `src/app/app.routes.ts` to add new route
  - Add route: `{ path: 'exercises/:id/dictation', component: DictationPracticeComponent, title: 'Dictation Practice' }`
  - Ensure route is properly configured with lazy loading if needed
  - _Requirements: 1.1, 5.3_


- [x] 9. Implement error handling


- [x] 9.1 Handle missing translation scenario

  - Check if translation exists before starting dictation
  - Display error message: "Complete the translation exercise first"
  - Redirect to exercise page if no translation found
  - _Requirements: 5.1, 5.2, 5.3_


- [x] 9.2 Handle TTS not supported scenario

  - Check if `window.speechSynthesis` exists
  - Display error message: "Text-to-speech not supported in your browser"
  - Provide text-only mode option as fallback
  - _Requirements: 2.1, 2.4_


- [x] 9.3 Handle audio playback failures

  - Monitor TTS error events
  - Display error message: "Audio playback failed. Please try again."
  - Provide retry button and show text as fallback

  - _Requirements: 2.4_

- [x] 9.4 Handle save attempt failures

  - Monitor Firestore save errors
  - Display error message: "Failed to save progress. Check your connection."
  - Implement retry logic with exponential backoff
  - Cache attempt locally if offline
  - _Requirements: 1.5, 7.1_


- [x] 9.5 Handle invalid exercise ID

  - Verify exercise exists when loading
  - Display 404 error message
  - Redirect to exercises list
  - _Requirements: 5.1, 5.3_

- [x] 10. Add dictation practice indicators to exercise list
- [x] 10.1 Modify exercise card component
  - Add badge or icon to indicate dictation practice available
  - Show badge only for exercises with completed translations
  - Add "Practice Dictation" action to exercise card menu
  - _Requirements: 5.1, 5.2_

- [x] 10.2 Update exercise list filtering
  - Add filter option to show only exercises with dictation available
  - Update exercise status to include dictation completion status
  - _Requirements: 5.1, 5.2_

- [x] 11. Implement progress persistence
- [x] 11.1 Save in-progress dictation sessions
  - Save current sentence index and user inputs to localStorage
  - Load saved progress when returning to dictation practice
  - Clear progress when session is completed
  - _Requirements: 3.5_

- [x] 11.2 Implement resume functionality
  - Detect incomplete dictation sessions on component init
  - Prompt user to resume or start fresh
  - Restore sentence states and user inputs
  - _Requirements: 3.5_

- [x] 12. Add accessibility features
- [x] 12.1 Implement keyboard navigation
  - Ensure all interactive elements are keyboard accessible
  - Add proper tab order for controls
  - Add focus indicators for all focusable elements
  - _Requirements: 6.3_

- [x] 12.2 Add ARIA labels and screen reader support
  - Add ARIA labels to all buttons and controls
  - Add ARIA live regions for feedback announcements
  - Add descriptive alt text for icons
  - Announce progress updates to screen readers
  - _Requirements: 6.3_

- [x] 12.3 Ensure color contrast and visual accessibility
  - Verify color contrast ratio >= 4.5:1 for all text
  - Ensure focus indicators are visible
  - Don't rely on color alone for information
  - Test with browser zoom up to 200%
  - _Requirements: 6.1, 6.2_

- [x] 13. Optimize performance
- [x] 13.1 Implement text processing optimizations
  - Pre-split sentences on component initialization
  - Cache accuracy calculations to avoid recalculation
  - Debounce input comparison (300ms delay)
  - _Requirements: 1.3, 1.4_

- [x] 13.2 Optimize Firestore operations
  - Load dictation history once on component init
  - Use local state during active session
  - Batch save operations when possible
  - Implement offline support with local caching
  - _Requirements: 1.5, 7.1_

- [x] 14. Add analytics and tracking
- [x] 14.1 Track dictation practice events
  - Log when dictation practice is started
  - Log completion events with accuracy scores
  - Track average time per sentence
  - Track common mistakes and error patterns
  - _Requirements: 7.2, 7.3, 7.4_

- [x] 14.2 Display dictation statistics on dashboard
  - Add dictation practice section to user dashboard
  - Show total dictation practices completed
  - Show average dictation accuracy
  - Show recent dictation practice history
  - _Requirements: 7.2, 7.3, 7.4_

- [ ]* 15. Write unit tests
- [ ]* 15.1 Test DictationPracticeService
  - Test accuracy calculation with various input combinations
  - Test sentence splitting with different text formats
  - Test difference detection algorithm
  - Test mistake categorization logic
  - Mock Firestore operations
  - _Requirements: 1.3, 1.4, 4.1, 4.2, 4.3, 4.4_

- [ ]* 15.2 Test DictationPracticeComponent
  - Test sentence navigation logic
  - Test input validation
  - Test completion detection
  - Test progress calculation
  - Mock service dependencies
  - _Requirements: 1.3, 3.2, 3.4, 3.5_

- [ ]* 15.3 Test DictationFeedbackComponent
  - Test feedback rendering with different data
  - Test difference highlighting
  - Test accuracy display formatting
  - Test mistake categorization display
  - _Requirements: 4.2, 4.3, 4.4_

- [ ]* 15.4 Test ProgressService modifications
  - Test dictation attempt recording
  - Test dictation history management
  - Test achievement unlocking for dictation
  - Test streak calculation with dictation practice
  - _Requirements: 7.1, 7.2, 7.5_
