# Implementation Plan

- [x] 1. Set up data models and interfaces





  - Create `CustomExercise` interface extending the base `Exercise` interface
  - Add `ExerciseGenerationRequest` and `ExerciseGenerationResponse` interfaces for AI generation
  - Update `exercise.model.ts` with new types
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.1, 2.2_

- [x] 2. Implement Custom Exercise Service




  - [x] 2.1 Create `custom-exercise.service.ts` with basic structure


    - Implement service skeleton with dependency injection
    - Set up BehaviorSubject for exercises state management
    - Define storage key constants
    - _Requirements: 1.4, 3.1, 3.2_

  - [x] 2.2 Implement LocalStorage persistence methods

    - Write `loadFromLocalStorage()` method to read custom exercises
    - Write `saveToLocalStorage()` method to persist exercises
    - Implement user-specific storage keys using AuthService
    - _Requirements: 1.4, 3.1_

  - [x] 2.3 Implement CRUD operations

    - Write `createExercise()` method with ID generation
    - Write `updateExercise()` method with timestamp updates
    - Write `deleteExercise()` method with state cleanup
    - Implement `getCustomExerciseById()` observable method
    - _Requirements: 1.4, 4.1, 4.2, 4.3, 5.1, 5.2, 5.3_

  - [x] 2.4 Implement filtering and query methods

    - Write `getCustomExercises()` to return all exercises
    - Write `getCustomExercisesByLevel()` for difficulty filtering
    - Write `getCustomExercisesByCategory()` for category filtering
    - Write `getCustomExercisesByTags()` for tag-based filtering
    - _Requirements: 3.1, 3.2, 6.1, 6.2, 6.3, 6.4_

  - [x] 2.5 Implement validation logic

    - Write `validateExercise()` method with all validation rules
    - Add title validation (3-100 characters)
    - Add source text validation (minimum 10 characters)
    - Add highlighted sentences validation (at least 1, must exist in text)
    - Add category and tag validation
    - _Requirements: 1.1, 1.2, 1.3_

  - [x] 2.6 Implement utility methods

    - Write `extractSentences()` to parse text into sentences
    - Write `generateExerciseId()` for unique ID creation
    - Add helper methods for text processing
    - _Requirements: 1.2, 1.3_

- [x] 3. Implement AI Exercise Generator Service


  - [x] 3.1 Create `exercise-generator.service.ts`


    - Set up service with AI provider injection
    - Implement provider selection logic (OpenAI/Gemini)
    - _Requirements: 2.1, 2.2_

  - [x] 3.2 Implement content generation

    - Write `generateExercise()` method
    - Build generation prompt template
    - Call appropriate AI provider
    - Parse and validate AI response
    - Handle generation errors with user-friendly messages
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

  - [x] 3.3 Add error handling for AI generation

    - Handle missing API key scenario
    - Handle network failures with retry logic
    - Handle rate limiting errors
    - Handle invalid response formats
    - _Requirements: 2.3_

- [x] 4. Create Exercise Creator Component


  - [x] 4.1 Set up component structure


    - Create component files (ts, html, scss)
    - Configure standalone component with required imports
    - Set up OnPush change detection
    - Inject required services
    - _Requirements: 1.1, 2.1_

  - [x] 4.2 Implement state management with signals

    - Create signals for form fields (title, sourceText, difficulty, etc.)
    - Create signals for UI state (isGenerating, isSaving, errors)
    - Create computed signal for edit mode detection
    - Set up form validation signals
    - _Requirements: 1.1, 1.2, 1.3, 4.1, 4.2_

  - [x] 4.3 Integrate Quill rich text editor

    - Install and configure Quill module
    - Set up editor toolbar configuration
    - Implement two-way binding with sourceText signal
    - Add editor styling
    - _Requirements: 1.1_

  - [x] 4.4 Implement sentence highlighting functionality

    - Write method to extract sentences from editor content
    - Implement click-to-highlight interaction
    - Add visual indicators for highlighted sentences
    - Write method to remove highlights
    - Update highlightedSentences signal
    - _Requirements: 1.2_

  - [x] 4.5 Implement AI generation tab

    - Create AI prompt input field
    - Write `generateWithAI()` method
    - Show loading state during generation
    - Populate editor with generated content
    - Display generation errors
    - Add retry functionality
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

  - [x] 4.6 Implement category and tag management

    - Create input fields for adding categories/tags
    - Implement chip-based display of categories/tags
    - Write methods to add/remove categories
    - Write methods to add/remove tags
    - Add validation for category/tag limits
    - _Requirements: 6.1, 6.2_

  - [x] 4.7 Implement save and edit functionality

    - Write `saveExercise()` method
    - Handle create vs update logic
    - Show saving state
    - Navigate to library on success
    - Load existing exercise data in edit mode
    - _Requirements: 1.4, 4.1, 4.2, 4.3_

  - [x] 4.8 Add form validation and error display

    - Implement real-time validation
    - Display inline error messages
    - Disable save button when invalid
    - Highlight invalid fields
    - _Requirements: 1.1, 1.2, 1.3_

- [x] 5. Create Custom Exercise Library Component



  - [x] 5.1 Set up component structure


    - Create component files (ts, html, scss)
    - Configure standalone component
    - Set up OnPush change detection
    - Inject CustomExerciseService
    - _Requirements: 3.1, 3.2_

  - [x] 5.2 Implement exercise list display

    - Use toSignal to convert exercises observable
    - Create exercise card template
    - Display exercise metadata (title, level, date, categories, tags)
    - Show empty state when no exercises exist
    - _Requirements: 3.1, 3.2, 3.4_

  - [x] 5.3 Implement search functionality

    - Create search input with signal binding
    - Write search filter logic in computed signal
    - Search across title, content, categories, and tags
    - Highlight matching terms in results
    - _Requirements: 7.1, 7.2, 7.3, 7.4_

  - [x] 5.4 Implement filtering system

    - Create filter controls for difficulty level
    - Create filter controls for categories
    - Create filter controls for tags
    - Implement `filteredExercises` computed signal
    - Add clear filters functionality
    - _Requirements: 6.3, 6.4_

  - [x] 5.5 Implement CRUD actions

    - Write `createNew()` method to navigate to creator
    - Write `editExercise()` method to navigate to creator with ID
    - Write `deleteExercise()` method with confirmation dialog
    - Write `practiceExercise()` method to navigate to practice view
    - _Requirements: 3.3, 4.1, 5.1, 5.2, 5.3_

  - [x] 5.6 Add computed signals for filter options

    - Create `allCategories` computed signal from exercises
    - Create `allTags` computed signal from exercises
    - Display available filter options dynamically
    - _Requirements: 6.3, 6.4_

- [x] 6. Modify Home Component for Custom Category
  - [x] 6.1 Add custom exercise detection
    - Inject CustomExerciseService
    - Create `hasCustomExercises` computed signal
    - Filter by selected difficulty level
    - _Requirements: 1.5_

  - [x] 6.2 Update category display logic
    - Create `displayCategories` computed signal
    - Add "Custom" category when user has custom exercises
    - Update template to show custom category
    - _Requirements: 1.5_

  - [x] 6.3 Implement custom category navigation
    - Handle "Custom" category selection
    - Navigate to Custom Exercise Library
    - Pass difficulty level filter
    - _Requirements: 1.5_

- [x] 7. Modify Exercise Detail Component for Custom Exercises
  - [x] 7.1 Update exercise loading logic
    - Inject CustomExerciseService
    - Try loading from regular exercises first
    - Fallback to custom exercises if not found
    - Add `isCustomExercise` signal
    - _Requirements: 8.1_

  - [x] 7.2 Add custom exercise indicator in UI
    - Display badge or label for custom exercises
    - Show creation date for custom exercises
    - Show custom categories and tags
    - _Requirements: 8.1_

  - [x] 7.3 Ensure progress tracking works for custom exercises
    - Verify attempt recording works with custom exercise IDs
    - Verify progress display includes custom exercises
    - Test streak and points calculation
    - _Requirements: 8.2, 8.3, 8.4_

- [x] 8. Modify Exercise Service for unified exercise access
  - [x] 8.1 Add custom exercise detection method
    - Write `isCustomExercise()` method to check ID format
    - Custom exercises use "custom-" prefix
    - _Requirements: 8.1_

  - [x] 8.2 Add unified exercise getter
    - Write `getExerciseByIdUnified()` method
    - Check both regular and custom exercise sources
    - Return appropriate exercise type
    - _Requirements: 8.1_

- [x] 9. Implement Firestore synchronization for custom exercises
  - [x] 9.1 Update Firestore security rules
    - Add rules for customExercises subcollection
    - Ensure user can only access their own exercises
    - Add validation rules for exercise fields
    - _Requirements: 1.4, 4.3, 5.3_

  - [x] 9.2 Extend FirestoreSyncService
    - Write `saveCustomExercise()` method
    - Write `loadCustomExercises()` method
    - Write `deleteCustomExercise()` method
    - Write `subscribeToCustomExercises()` for real-time updates
    - _Requirements: 1.4, 4.3, 5.3_

  - [x] 9.3 Integrate Firestore sync in CustomExerciseService
    - Call Firestore sync on create/update/delete
    - Load from Firestore on service initialization
    - Merge local and cloud data on conflicts
    - Handle offline scenarios gracefully
    - _Requirements: 1.4, 4.3, 5.3_

- [x] 10. Add routing for new components
  - [x] 10.1 Add routes to app.routes.ts
    - Add route for exercise creator: `/exercise/create`
    - Add route for exercise editor: `/exercise/edit/:id`
    - Add route for custom library: `/exercises/custom`
    - Apply auth guard to all routes
    - _Requirements: 1.1, 3.1, 4.1_

  - [x] 10.2 Add navigation links
    - Add "Create Exercise" button in header or navigation
    - Add "My Exercises" link to custom library
    - Update exercise list to link to custom library when appropriate
    - _Requirements: 1.1, 3.1_

- [x] 11. Implement error handling and user feedback
  - [x] 11.1 Add error handling in CustomExerciseService
    - Handle LocalStorage quota exceeded
    - Handle parse errors with graceful fallback
    - Log errors for debugging
    - _Requirements: 1.4, 2.3, 4.3, 5.3_

  - [x] 11.2 Add user-facing error messages
    - Display toast notifications for errors
    - Show inline validation errors in forms
    - Provide actionable error messages
    - Add retry options where appropriate
    - _Requirements: 2.3, 4.3, 5.3_

  - [x] 11.3 Add loading states
    - Show spinner during AI generation
    - Show spinner during save operations
    - Show skeleton loaders for exercise list
    - Disable buttons during async operations
    - _Requirements: 2.1, 4.3_

- [x] 12. Style components with Tailwind CSS
  - [x] 12.1 Style Exercise Creator component
    - Create responsive layout for creator form
    - Style rich text editor with custom theme
    - Style sentence highlighting with visual feedback
    - Style category/tag chips
    - Add animations for state transitions
    - _Requirements: 1.1, 1.2, 1.3_

  - [x] 12.2 Style Custom Exercise Library component
    - Create responsive grid layout for exercise cards
    - Style search and filter controls
    - Style empty state with illustration
    - Add hover effects and transitions
    - Style confirmation dialogs
    - _Requirements: 3.1, 3.2, 3.3, 3.4_

  - [x] 12.3 Update Home component styles
    - Style custom category card
    - Ensure consistent styling with existing categories
    - Add custom category icon
    - _Requirements: 1.5_

- [x] 13. Implement accessibility features
  - [x] 13.1 Add keyboard navigation
    - Ensure all interactive elements are keyboard accessible
    - Add proper tab order
    - Implement keyboard shortcuts for common actions
    - Add focus indicators
    - _Requirements: All_

  - [x] 13.2 Add ARIA attributes
    - Add labels to form inputs
    - Add roles to custom components
    - Add aria-live regions for dynamic content
    - Add aria-labels for icon buttons
    - _Requirements: All_

  - [x] 13.3 Ensure screen reader compatibility
    - Test with NVDA/JAWS
    - Add descriptive text for screen readers
    - Announce state changes
    - Provide alternative text for visual elements
    - _Requirements: All_

- [ ] 14. Write unit tests for services
  - [ ] 14.1 Test CustomExerciseService
    - Test CRUD operations
    - Test validation logic
    - Test filtering methods
    - Test LocalStorage operations
    - _Requirements: 1.4, 3.1, 4.3, 5.3, 6.3, 7.1_

  - [ ] 14.2 Test ExerciseGeneratorService
    - Test prompt building
    - Test response parsing
    - Test error handling
    - Test provider selection
    - _Requirements: 2.1, 2.2, 2.3_

- [ ] 15. Write component tests
  - [ ] 15.1 Test Exercise Creator component
    - Test form validation
    - Test sentence highlighting
    - Test category/tag management
    - Test save/cancel actions
    - Test AI generation flow
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.1, 4.1_

  - [ ] 15.2 Test Custom Exercise Library component
    - Test search functionality
    - Test filtering
    - Test CRUD actions
    - Test empty state
    - _Requirements: 3.1, 5.1, 6.3, 7.1_

- [ ] 16. Perform integration testing
  - [ ] 16.1 Test end-to-end workflows
    - Test create → save → practice flow
    - Test AI generate → edit → save flow
    - Test search and filter flow
    - Test edit → update → verify flow
    - Test delete → confirm removal flow
    - _Requirements: All_

  - [ ] 16.2 Test Firestore synchronization
    - Test create → sync to cloud
    - Test update → sync to cloud
    - Test delete → sync to cloud
    - Test load from cloud on login
    - Test offline → online sync
    - _Requirements: 1.4, 4.3, 5.3_

- [ ] 17. Perform accessibility testing
  - [ ] 17.1 Run automated accessibility tests
    - Run Axe DevTools scan
    - Fix all critical and serious issues
    - Document minor issues for future improvement
    - _Requirements: All_

  - [ ] 17.2 Perform manual accessibility testing
    - Test keyboard navigation
    - Test with screen reader
    - Test color contrast
    - Verify ARIA attributes
    - _Requirements: All_
