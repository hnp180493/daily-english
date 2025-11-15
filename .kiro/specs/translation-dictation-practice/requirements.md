# Requirements Document

## Introduction

The Translation Dictation Practice feature enables learners to practice dictation using their own translated text after completing a translation exercise. This feature extends the learning experience by allowing learners to reinforce their understanding through audio-based practice of their translations, similar to the original listen-and-type exercise format but using the learner's translated content as the source material.

## Glossary

- **Translation Exercise**: An exercise where learners translate source text from one language to another
- **Dictation Practice**: An audio-based exercise where learners listen to spoken text and type what they hear
- **Translation Dictation Mode**: A practice mode that uses the learner's translated text as the source for dictation practice
- **Exercise Completion**: The state when a learner has submitted their translation and received feedback
- **Text-to-Speech Service**: A service that converts written text to spoken audio
- **Practice Session**: A single instance of dictation practice using translated text
- **User Translation**: The text that a learner has submitted as their translation of the source material

## Requirements

### Requirement 1

**User Story:** As a language learner, I want to practice dictation using my own translations after completing an exercise, so that I can reinforce my learning through audio-based practice.

#### Acceptance Criteria

1. WHEN a learner completes a translation exercise, THE System SHALL display an option to start dictation practice with their translation
2. WHEN a learner selects the dictation practice option, THE System SHALL generate audio from the learner's translated text
3. WHEN the dictation practice starts, THE System SHALL present the audio playback interface with sentence-by-sentence navigation
4. WHEN a learner types their response during dictation practice, THE System SHALL compare it against the original translated text
5. WHEN a learner completes the dictation practice, THE System SHALL provide accuracy feedback and scoring

### Requirement 2

**User Story:** As a language learner, I want to hear my translations spoken aloud, so that I can improve my listening comprehension in the target language.

#### Acceptance Criteria

1. THE System SHALL convert the learner's translated text to speech using a text-to-speech service
2. THE System SHALL support playback controls including play, pause, and replay for each sentence
3. THE System SHALL allow learners to adjust playback speed between 0.5x and 2.0x
4. WHEN audio generation fails, THE System SHALL display an error message and provide a retry option
5. THE System SHALL cache generated audio to improve performance for repeated practice sessions

### Requirement 3

**User Story:** As a language learner, I want to practice dictation sentence by sentence, so that I can focus on smaller chunks of text and track my progress.

#### Acceptance Criteria

1. THE System SHALL split the translated text into individual sentences for dictation practice
2. THE System SHALL display a progress indicator showing current sentence position and total sentence count
3. WHEN a learner completes a sentence, THE System SHALL automatically advance to the next sentence
4. THE System SHALL allow learners to navigate between sentences using previous and next controls
5. THE System SHALL save progress so learners can resume incomplete practice sessions

### Requirement 4

**User Story:** As a language learner, I want to receive feedback on my dictation accuracy, so that I can identify areas for improvement.

#### Acceptance Criteria

1. THE System SHALL calculate accuracy score by comparing typed text with the original translation
2. THE System SHALL highlight differences between typed text and original translation
3. THE System SHALL provide character-level and word-level accuracy metrics
4. THE System SHALL display a summary of mistakes including missing words, extra words, and spelling errors
5. THE System SHALL store dictation practice results in the learner's exercise history

### Requirement 5

**User Story:** As a language learner, I want to access my previous translations for dictation practice, so that I can review and practice older exercises.

#### Acceptance Criteria

1. THE System SHALL display a list of completed exercises with available translations for dictation practice
2. WHEN a learner views their exercise history, THE System SHALL indicate which exercises have translations available for dictation practice
3. THE System SHALL allow learners to start dictation practice from any completed exercise with a saved translation
4. THE System SHALL retrieve the learner's most recent translation for each exercise
5. WHERE a learner has multiple translation attempts, THE System SHALL allow selection of which translation to use for dictation practice

### Requirement 6

**User Story:** As a language learner, I want the dictation practice interface to be similar to the original exercise interface, so that I have a consistent and familiar experience.

#### Acceptance Criteria

1. THE System SHALL use the same audio player component for dictation practice as used in original exercises
2. THE System SHALL maintain consistent visual design and layout between exercise modes
3. THE System SHALL provide the same keyboard shortcuts and navigation controls across both modes
4. THE System SHALL display hints and help text in the same format as original exercises
5. THE System SHALL use the same scoring and feedback visualization components

### Requirement 7

**User Story:** As a language learner, I want to track my dictation practice performance separately from translation exercises, so that I can monitor my progress in both skills.

#### Acceptance Criteria

1. THE System SHALL store dictation practice attempts separately from translation exercise attempts
2. THE System SHALL display dictation practice statistics on the learner's dashboard
3. THE System SHALL calculate separate accuracy averages for translation and dictation practice
4. THE System SHALL track the number of dictation practice sessions completed
5. THE System SHALL include dictation practice performance in achievement and streak calculations
