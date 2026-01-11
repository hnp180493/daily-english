# Implementation Plan: Memory Retention System

## Overview

Triển khai Memory Retention System theo từng bước, bắt đầu từ data models, services, rồi đến components. Sử dụng fast-check cho property-based testing.

## Tasks

- [x] 1. Set up data models and interfaces
  - [x] 1.1 Create memory-retention.model.ts with all interfaces
    - Define QuizQuestion, QuizAnswer, QuizResult interfaces
    - Define KeyVocabulary, MainIdea, ContentSummaryData interfaces
    - Define Flashcard, FlashcardFilter, FlashcardStats interfaces
    - Define MemoryData and MemoryRetentionStorage interfaces
    - _Requirements: 1.3, 2.2, 2.3, 3.2, 7.4_
  - [ ]* 1.2 Write property test for data model completeness
    - **Property 2: Quiz Question Structure Completeness**
    - **Property 6: Vocabulary Item Completeness**
    - **Property 8: Flashcard Structure Completeness**
    - **Validates: Requirements 1.3, 2.3, 3.2, 7.4**

- [x] 2. Implement FlashcardService with Spaced Repetition
  - [x] 2.1 Create flashcard.service.ts
    - Implement signal-based state management
    - Implement addFlashcards, markCard, deleteCard methods
    - Implement dueFlashcards computed signal
    - Implement filterCards method
    - Implement stats computed signal
    - _Requirements: 3.1, 3.4, 3.5, 3.6, 3.7, 5.2, 5.6, 5.7, 7.1, 7.2, 7.3, 7.5_
  - [ ]* 2.2 Write property tests for FlashcardService
    - **Property 9: Spaced Repetition Interval Adjustment**
    - **Property 10: Due Cards Calculation**
    - **Property 11: Flashcard Sorting by Urgency**
    - **Property 12: Flashcard Filter Correctness**
    - **Property 16: Flashcard Deletion Completeness**
    - **Validates: Requirements 3.5, 3.6, 5.2, 5.6, 5.7, 7.2, 7.3, 7.5**

- [x] 3. Implement QuizGeneratorService
  - [x] 3.1 Create quiz-generator.service.ts
    - Implement generateQuiz method with AI prompt
    - Implement parseQuizResponse for JSON parsing
    - Implement error handling with graceful fallback
    - _Requirements: 1.1, 1.2, 1.4_
  - [ ]* 3.2 Write unit tests for QuizGeneratorService
    - Test prompt building
    - Test JSON parsing
    - Test error handling
    - _Requirements: 1.1, 1.4_

- [x] 4. Implement SummaryGeneratorService
  - [x] 4.1 Create summary-generator.service.ts
    - Implement generateSummary method with AI prompt
    - Implement parseSummaryResponse for JSON parsing
    - Implement createFallbackSummary for error cases
    - _Requirements: 2.1, 2.2, 2.5_
  - [ ]* 4.2 Write property test for vocabulary extraction
    - **Property 5: Vocabulary Extraction Bounds**
    - **Property 7: Main Ideas Bilingual Completeness**
    - **Validates: Requirements 2.2, 2.6**

- [x] 5. Implement MemoryRetentionService
  - [x] 5.1 Create memory-retention.service.ts
    - Implement generateMemoryContent with forkJoin
    - Implement caching with memoryDataCache signal
    - Implement saveQuizResult and loadMemoryData
    - Implement createFlashcardsFromSummary
    - _Requirements: 4.6, 6.1, 6.5, 6.6_
  - [ ]* 5.2 Write property test for caching behavior
    - **Property 17: Memory Data Caching**
    - **Validates: Requirements 6.5**

- [x] 6. Checkpoint - Ensure all service tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Implement ComprehensionQuiz component
  - [x] 7.1 Create comprehension-quiz component files
    - Create comprehension-quiz.ts with signals and computed
    - Create comprehension-quiz.html with question display
    - Create comprehension-quiz.scss with styling
    - Implement answer selection and feedback display
    - _Requirements: 1.5, 1.6, 1.7_
  - [ ]* 7.2 Write property tests for quiz component
    - **Property 3: Quiz Answer Feedback Immediacy**
    - **Property 4: Quiz Summary Accuracy**
    - **Validates: Requirements 1.6, 1.7**

- [x] 8. Implement ContentSummary component
  - [x] 8.1 Create content-summary component files
    - Create content-summary.ts with TTS integration
    - Create content-summary.html with vocabulary list
    - Create content-summary.scss with styling
    - Implement playPronunciation method
    - _Requirements: 2.3, 2.4, 2.6_
  - [ ]* 8.2 Write unit tests for ContentSummary
    - Test TTS trigger on vocabulary click
    - Test vocabulary expansion toggle
    - _Requirements: 2.4_

- [x] 9. Implement FlashcardReview component
  - [x] 9.1 Create flashcard-review component files
    - Create flashcard-review.ts with flip logic
    - Create flashcard-review.html with card display
    - Create flashcard-review.scss with flip animation
    - Implement markCard and navigation
    - _Requirements: 3.3, 3.4_
  - [ ]* 9.2 Write unit tests for FlashcardReview
    - Test flip animation trigger
    - Test card navigation
    - _Requirements: 3.3_

- [x] 10. Implement MemoryBoost container component
  - [x] 10.1 Create memory-boost component files
    - Create memory-boost.ts with tab management
    - Create memory-boost.html with tab layout
    - Create memory-boost.scss with styling
    - Integrate Quiz, Summary, Flashcard components
    - Implement bonus points logic
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_
  - [ ]* 10.2 Write property tests for MemoryBoost
    - **Property 1: Quiz Generation Threshold**
    - **Property 15: Quiz Bonus Points Award**
    - **Validates: Requirements 1.1, 4.1, 4.4**

- [x] 11. Checkpoint - Ensure all component tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 12. Implement FlashcardDeck page
  - [x] 12.1 Create flashcard-deck component files
    - Create flashcard-deck.ts with review session logic
    - Create flashcard-deck.html with deck display
    - Create flashcard-deck.scss with styling
    - Implement filter UI and session stats
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7_
  - [ ]* 12.2 Write property test for session statistics
    - **Property 13: Session Statistics Accuracy**
    - **Validates: Requirements 5.4, 5.5**

- [x] 13. Integrate with ExerciseDetail component
  - [x] 13.1 Update exercise-detail to show MemoryBoost
    - Add MemoryBoost component to imports
    - Add conditional rendering when score >= 75%
    - Pass exercise, userTranslation, score as inputs
    - Handle bonusPointsAwarded output
    - _Requirements: 4.1_
  - [ ]* 13.2 Write integration test for exercise completion flow
    - Test MemoryBoost appears on completion
    - Test bonus points are awarded
    - _Requirements: 4.1, 4.4_

- [x] 14. Implement storage persistence
  - [x] 14.1 Extend StorageAdapter interface
    - Add saveMemoryData method
    - Add loadMemoryData method
    - Add saveFlashcards method
    - Add loadFlashcards method
    - _Requirements: 6.1, 6.2, 6.3_
  - [x] 14.2 Implement LocalStorageProvider extensions
    - Implement memory data persistence
    - Implement flashcard persistence
    - _Requirements: 6.3_
  - [x] 14.3 Implement SupabaseStorageProvider extensions
    - Implement memory data sync
    - Implement flashcard sync
    - _Requirements: 6.2_
  - [ ]* 14.4 Write property test for storage routing
    - **Property 14: Storage Routing by Auth State**
    - **Validates: Requirements 6.2, 6.3**

- [x] 15. Add routing for FlashcardDeck page
  - [x] 15.1 Update app.routes.ts
    - Add /flashcards route
    - Configure lazy loading
    - _Requirements: 5.1_
  - [x] 15.2 Add navigation link in header/menu
    - Add Flashcards link to navigation
    - _Requirements: 5.1_

- [x] 16. Implement data merge on login
  - [x] 16.1 Update auth flow to merge flashcards
    - Detect guest flashcards on login
    - Merge with cloud flashcards
    - Clear local after merge
    - _Requirements: 6.4_
  - [ ]* 16.2 Write unit test for merge logic
    - Test duplicate detection
    - Test merge ordering
    - _Requirements: 6.4_

- [x] 17. Final checkpoint - Full integration test
  - Ensure all tests pass, ask the user if questions arise.
  - Test complete flow: exercise → quiz → summary → flashcards → review

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties using fast-check
- Unit tests validate specific examples and edge cases
