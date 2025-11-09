# Requirements Document

## Introduction

This feature addresses the user experience in the Next Sentence translation exercise interface. Currently, when a user submits their translation and achieves sufficient accuracy to proceed, the full text display immediately replaces the Vietnamese sentence with the English translation. This creates confusion as users expect to see the original Vietnamese text until they explicitly click "Next Sentence" to move forward. This improvement will maintain the original Vietnamese sentence visibility until the user actively advances to the next sentence.

## Glossary

- **Exercise Interface**: The main translation practice screen where users translate Vietnamese sentences to English
- **Full Text Display**: The paragraph view at the top of the exercise showing all sentences in the exercise
- **Current Sentence**: The sentence the user is actively translating, highlighted in the full text display
- **Completed Sentence**: A sentence that has been submitted and received feedback with sufficient accuracy
- **Next Sentence Button**: The button that appears after successful submission, allowing users to advance to the next sentence
- **Translation State**: The current status of a sentence (pending, in-progress, or completed)

## Requirements

### Requirement 1

**User Story:** As a language learner, I want to see the original Vietnamese sentence in the full text display even after I submit my translation, so that I can review the source text before moving to the next sentence.

#### Acceptance Criteria

1. WHEN the user submits a translation with sufficient accuracy, THE Exercise Interface SHALL continue displaying the original Vietnamese sentence in the full text display
2. WHILE the "Next Sentence" button is visible, THE Exercise Interface SHALL maintain the Vietnamese sentence display in the full text area
3. WHEN the user clicks the "Next Sentence" button, THEN THE Exercise Interface SHALL replace the Vietnamese sentence with the user's English translation in the full text display
4. THE Exercise Interface SHALL apply the completed sentence styling (e.g., color, background) to indicate the sentence is ready to advance

### Requirement 2

**User Story:** As a language learner, I want a clear visual indication that my translation was accepted while still seeing the original text, so that I understand my progress without losing context.

#### Acceptance Criteria

1. WHEN a translation is submitted successfully, THE Exercise Interface SHALL display visual feedback (accuracy score, feedback panel) in the right column
2. WHILE waiting for the user to click "Next Sentence", THE Exercise Interface SHALL show the "Next Sentence" button in an enabled state
3. THE Exercise Interface SHALL maintain the current sentence highlighting on the Vietnamese text until the user advances
4. WHEN the user advances to the next sentence, THE Exercise Interface SHALL update the highlighting to the new current sentence

### Requirement 3

**User Story:** As a language learner, I want the translation to be stored and displayed correctly in review mode, so that I can see my completed work after finishing the exercise.

#### Acceptance Criteria

1. WHEN the user clicks "Next Sentence", THE Exercise Interface SHALL store the user's translation for that sentence
2. WHEN the exercise is completed, THE Exercise Interface SHALL display all Vietnamese sentences with their corresponding English translations in review mode
3. THE Exercise Interface SHALL display the accuracy score for each completed sentence in review mode
4. WHEN the user returns to a previously started exercise, THE Exercise Interface SHALL display completed sentences with their English translations and incomplete sentences with Vietnamese text
