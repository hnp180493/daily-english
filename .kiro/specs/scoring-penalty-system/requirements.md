# Requirements Document

## Introduction

This document specifies requirements for a scoring penalty system that maintains the current 90% threshold requirement to proceed to the next sentence while introducing a penalty mechanism that reduces the final exercise score based on the number of incorrect attempts and retries. This ensures that while users must achieve 90% accuracy on each sentence to progress, their final score reflects the quality of their learning journey, including mistakes and retries.

## Glossary

- **Exercise System**: The translation practice application that presents sentences for users to translate
- **Sentence Attempt**: A single submission of a translation for a specific sentence
- **Accuracy Score**: A percentage (0-100) indicating how accurate a translation is
- **Retry**: When a user chooses to redo a sentence they previously completed
- **Incorrect Attempt**: A sentence attempt that scores below 90% accuracy
- **Final Score**: The overall score for completing an entire exercise, calculated after all sentences are completed
- **Penalty**: A deduction from the final score based on performance metrics

## Requirements

### Requirement 1: Maintain Current Progression Logic

**User Story:** As a learner, I want to maintain the current requirement of achieving 90% accuracy before proceeding to the next sentence, so that I ensure quality learning before moving forward.

#### Acceptance Criteria

1. WHEN a user submits a translation for a sentence, THE Exercise System SHALL evaluate the accuracy score
2. IF the accuracy score is below 90%, THEN THE Exercise System SHALL prevent progression to the next sentence
3. WHEN the accuracy score reaches 90% or above, THE Exercise System SHALL allow the user to proceed to the next sentence
4. THE Exercise System SHALL display the current accuracy score to the user after each submission

### Requirement 2: Track Incorrect Attempts Per Sentence

**User Story:** As a learner, I want the system to track how many times I submit incorrect translations for each sentence, so that my final score reflects my learning accuracy.

#### Acceptance Criteria

1. THE Exercise System SHALL initialize an incorrect attempt counter at zero for each sentence
2. WHEN a user submits a translation with accuracy below 90%, THE Exercise System SHALL increment the incorrect attempt counter for that sentence
3. WHEN a user achieves 90% or above accuracy, THE Exercise System SHALL stop incrementing the incorrect attempt counter for that sentence
4. THE Exercise System SHALL persist the incorrect attempt count for each sentence throughout the exercise session
5. THE Exercise System SHALL include incorrect attempt counts in the final score calculation

### Requirement 3: Track Sentence Retries

**User Story:** As a learner, I want the system to track when I choose to retry sentences I've already completed, so that my final score reflects my need for additional practice.

#### Acceptance Criteria

1. THE Exercise System SHALL initialize a retry counter at zero for each sentence
2. WHEN a user explicitly chooses to retry a previously completed sentence, THE Exercise System SHALL increment the retry counter for that sentence
3. THE Exercise System SHALL reset the sentence state when a retry is initiated
4. THE Exercise System SHALL persist the retry count for each sentence throughout the exercise session
5. THE Exercise System SHALL include retry counts in the final score calculation

### Requirement 4: Calculate Penalty-Adjusted Final Score

**User Story:** As a learner, I want my final exercise score to reflect both my eventual success and the mistakes I made along the way, so that I have a realistic assessment of my performance.

#### Acceptance Criteria

1. WHEN all sentences in an exercise are completed, THE Exercise System SHALL calculate a base score from the average of all final sentence accuracy scores
2. THE Exercise System SHALL apply a penalty for each incorrect attempt across all sentences
3. THE Exercise System SHALL apply a penalty for each sentence retry across all sentences
4. THE Exercise System SHALL ensure the final score does not fall below zero
5. THE Exercise System SHALL display the penalty-adjusted final score to the user upon exercise completion

### Requirement 5: Define Penalty Calculation Formula

**User Story:** As a learner, I want a fair and transparent penalty system that appropriately reflects the severity of mistakes and retries, so that I understand how my final score is calculated.

#### Acceptance Criteria

1. THE Exercise System SHALL deduct 2 points from the final score for each incorrect attempt (submission below 90%)
2. THE Exercise System SHALL deduct 5 points from the final score for each sentence retry
3. THE Exercise System SHALL calculate the base score as the average of all final sentence accuracy scores
4. THE Exercise System SHALL apply the formula: Final Score = Base Score - (Incorrect Attempts × 2) - (Retries × 5)
5. THE Exercise System SHALL ensure the minimum final score is 0

### Requirement 6: Display Penalty Information

**User Story:** As a learner, I want to see a breakdown of how my final score was calculated, so that I understand the impact of my mistakes and retries.

#### Acceptance Criteria

1. WHEN an exercise is completed, THE Exercise System SHALL display the base score (average accuracy)
2. THE Exercise System SHALL display the total number of incorrect attempts across all sentences
3. THE Exercise System SHALL display the total number of sentence retries
4. THE Exercise System SHALL display the total penalty deducted
5. THE Exercise System SHALL display the final penalty-adjusted score

### Requirement 7: Persist Penalty Metrics

**User Story:** As a learner, I want my attempt history to include penalty metrics, so that I can review my performance over time.

#### Acceptance Criteria

1. THE Exercise System SHALL store incorrect attempt counts for each sentence in the exercise attempt record
2. THE Exercise System SHALL store retry counts for each sentence in the exercise attempt record
3. THE Exercise System SHALL store the penalty-adjusted final score in the exercise attempt record
4. THE Exercise System SHALL store the base score before penalties in the exercise attempt record
5. THE Exercise System SHALL make penalty metrics available for display in review mode
