# Implementation Plan: Scoring Penalty System

- [x] 1. Update data models with penalty tracking fields





  - Add `incorrectAttempts` and `retryCount` fields to `SentenceProgress` interface in `exercise-state.service.ts`
  - Add `baseScore`, `totalIncorrectAttempts`, `totalRetries`, and `totalPenalty` fields to `ExerciseAttempt` interface in `exercise.model.ts`
  - Add `incorrectAttempts` and `retryCount` fields to `SentenceAttempt` interface in `exercise.model.ts`
  - _Requirements: 2.4, 3.4, 7.1, 7.2_

- [x] 2. Implement penalty tracking in ExerciseStateService





- [x] 2.1 Update sentence initialization

  - Modify `initializeSentences()` to initialize `incorrectAttempts` and `retryCount` to 0 for each sentence
  - _Requirements: 2.1, 3.1_


- [x] 2.2 Add penalty tracking methods

  - Implement `incrementIncorrectAttempt(index: number)` method to increment incorrect attempt counter
  - Implement `incrementRetryCount(index: number)` method to increment retry counter
  - Implement `getPenaltyMetrics()` method to calculate total incorrect attempts and retries across all sentences
  - _Requirements: 2.2, 2.4, 3.2, 3.4_

- [x] 2.3 Update markSentenceCompleted method


  - Modify `markSentenceCompleted()` to increment `incorrectAttempts` when score < 90%
  - Preserve existing `incorrectAttempts` count when score >= 90%
  - _Requirements: 2.2, 2.3_

- [x] 2.4 Update retrySentence method


  - Modify `retrySentence()` to call `incrementRetryCount()` before resetting sentence state
  - Ensure `incorrectAttempts` and `retryCount` are preserved when resetting sentence
  - _Requirements: 3.2, 3.3_

- [x] 3. Implement penalty calculation in ExerciseRecordingService



- [x] 3.1 Add penalty constants

  - Define `INCORRECT_ATTEMPT_PENALTY = 2` constant
  - Define `RETRY_PENALTY = 5` constant
  - _Requirements: 5.1, 5.2_


- [x] 3.2 Update recordAttempt method

  - Calculate base score as average of all sentence accuracy scores
  - Call `stateService.getPenaltyMetrics()` to get penalty metrics
  - Calculate total penalty using formula: `(incorrectAttempts × 2) + (retries × 5)`
  - Calculate final score: `Math.max(0, baseScore - totalPenalty)`
  - Update `ExerciseAttempt` object to include `baseScore`, `totalIncorrectAttempts`, `totalRetries`, and `totalPenalty`
  - Set `accuracyScore` to the penalty-adjusted final score
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 5.3, 5.4, 5.5_


- [x] 3.3 Update sentence attempts creation


  - Include `incorrectAttempts` and `retryCount` in each `SentenceAttempt` object
  - _Requirements: 7.1_

- [x] 4. Add penalty display to ExerciseDetailComponent


- [x] 4.1 Create computed signals for penalty metrics


  - Implement `penaltyMetrics` computed signal for review mode display
  - Implement `currentPenaltyMetrics` computed signal for live progress tracking during exercise
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_


- [x] 4.2 Update exercise detail template

  - Add penalty breakdown section in review mode showing base score, incorrect attempts, retries, total penalty, and final score
  - Add current penalty indicator during exercise showing current average and penalties
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 4.3 Add styling for penalty display


  - Create CSS classes for penalty breakdown section
  - Style penalty items, totals, and final score display
  - Add visual indicators for penalties (e.g., red color for negative values)
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_


- [x] 5. Handle backward compatibility and data migration

  - Add default value handling in `penaltyMetrics` computed signal for attempts without penalty fields
  - Ensure existing ExerciseAttempt records display correctly with default values (baseScore = accuracyScore, penalties = 0)
  - _Requirements: 7.3, 7.4_

- [-] 6. Validate and test the implementation

- [ ] 6.1 Test penalty tracking during exercise
  - Submit translations with accuracy < 90% and verify incorrect attempts increment
  - Retry completed sentences and verify retry counter increments
  - Verify penalty metrics persist across page refreshes
  - _Requirements: 2.2, 2.3, 3.2, 3.3_

- [ ] 6.2 Test penalty calculation on completion
  - Complete exercise with various scenarios (perfect run, multiple failures, retries)
  - Verify base score calculation is correct
  - Verify penalty calculation matches formula
  - Verify final score is clamped to minimum of 0
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 5.1, 5.2, 5.3, 5.4, 5.5_

- [ ] 6.3 Test penalty display in review mode
  - Load completed exercise in review mode
  - Verify penalty breakdown displays all metrics correctly
  - Test with exercises completed before penalty system (backward compatibility)
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 7.5_


- [ ] 6.4 Write unit tests for penalty tracking methods

  - Test `incrementIncorrectAttempt()` in ExerciseStateService
  - Test `incrementRetryCount()` in ExerciseStateService
  - Test `getPenaltyMetrics()` in ExerciseStateService
  - Test penalty calculation in ExerciseRecordingService
  - _Requirements: 2.2, 3.2, 4.2, 5.4_
