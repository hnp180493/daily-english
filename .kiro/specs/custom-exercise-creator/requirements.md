# Requirements Document

## Introduction

The Custom Exercise Creator feature enables users to create, manage, and practice their own personalized English writing exercises. Users can either manually compose exercises using a rich text editor or generate them using AI by providing a topic or prompt. This feature extends the existing exercise system by allowing users to build a personal library of custom exercises that integrate seamlessly with the platform's existing difficulty levels, categories, and practice workflow.

## Glossary

- **Exercise Creator**: The system component that provides the interface and functionality for users to create custom exercises
- **Custom Exercise**: A user-generated exercise that includes source text, highlighted sentences for translation, and a difficulty level
- **Rich Text Editor**: A WYSIWYG editor component (Quill or TinyMCE) that allows formatted text input
- **AI Generator**: The system component that uses Azure OpenAI or Google Gemini to generate exercise content from user prompts
- **Custom Exercise Library**: The collection of all exercises created by a specific user
- **Custom Category**: A special category that appears on the home screen when a user has created at least one custom exercise
- **Exercise Management Interface**: The UI that allows users to view, edit, and delete their custom exercises
- **Firestore**: Cloud database service for storing custom exercises and enabling community sharing

## Requirements

### Requirement 1

**User Story:** As a learner, I want to create custom exercises with my own content, so that I can practice translations that are relevant to my specific needs and interests

#### Acceptance Criteria

1. WHEN the user navigates to the exercise creator, THE Exercise Creator SHALL display a rich text editor for composing source text
2. WHEN the user enters text in the editor, THE Exercise Creator SHALL allow formatting and highlighting of sentences for translation
3. WHEN the user selects a difficulty level, THE Exercise Creator SHALL associate that level with the custom exercise
4. WHEN the user saves the exercise, THE Exercise Creator SHALL store the exercise in the Custom Exercise Library with all specified attributes
5. WHERE the user has created at least one custom exercise, THE Exercise Creator SHALL display a "Custom" category on the home screen filtered by the selected difficulty level

### Requirement 2

**User Story:** As a learner, I want to generate exercise content using AI by providing a topic or prompt, so that I can quickly create relevant exercises without manually writing all the content

#### Acceptance Criteria

1. WHEN the user enters a topic or prompt in the AI generator input, THE AI Generator SHALL send the prompt to the configured AI provider (Azure OpenAI or Google Gemini)
2. WHEN the AI provider returns generated content, THE AI Generator SHALL populate the rich text editor with the generated source text
3. IF the AI generation fails, THEN THE AI Generator SHALL display an error message and allow the user to retry or switch to manual input
4. WHEN AI-generated content is loaded, THE Exercise Creator SHALL allow the user to edit and refine the content before saving

### Requirement 3

**User Story:** As a learner, I want to view all my custom exercises in one place, so that I can easily access and manage my personal exercise library

#### Acceptance Criteria

1. WHEN the user navigates to the Custom Exercise Library, THE Exercise Management Interface SHALL display a list of all custom exercises created by the user
2. WHEN displaying exercises, THE Exercise Management Interface SHALL show the exercise title, difficulty level, creation date, and custom categories or tags
3. WHEN the user selects an exercise from the library, THE Exercise Management Interface SHALL navigate to the practice view for that exercise
4. WHEN the library contains no exercises, THE Exercise Management Interface SHALL display a message prompting the user to create their first exercise

### Requirement 4

**User Story:** As a learner, I want to edit my custom exercises, so that I can improve or update the content as my learning needs change

#### Acceptance Criteria

1. WHEN the user selects the edit action on a custom exercise, THE Exercise Management Interface SHALL load the exercise content into the Exercise Creator
2. WHEN the user modifies the exercise content, THE Exercise Creator SHALL preserve the exercise identifier and update history
3. WHEN the user saves the edited exercise, THE Exercise Creator SHALL update the stored exercise with the new content and timestamp
4. WHEN editing is complete, THE Exercise Management Interface SHALL reflect the updated exercise in the Custom Exercise Library

### Requirement 5

**User Story:** As a learner, I want to delete custom exercises I no longer need, so that I can keep my library organized and relevant

#### Acceptance Criteria

1. WHEN the user selects the delete action on a custom exercise, THE Exercise Management Interface SHALL display a confirmation dialog
2. WHEN the user confirms deletion, THE Exercise Management Interface SHALL remove the exercise from the Custom Exercise Library
3. IF the deleted exercise was the last exercise in a custom category, THEN THE Exercise Management Interface SHALL remove that category from the home screen
4. WHEN deletion is complete, THE Exercise Management Interface SHALL update the library view to reflect the removal

### Requirement 6

**User Story:** As a learner, I want to organize my custom exercises with categories and tags, so that I can easily find and filter exercises by topic or theme

#### Acceptance Criteria

1. WHEN creating or editing an exercise, THE Exercise Creator SHALL allow the user to assign custom categories to the exercise
2. WHEN creating or editing an exercise, THE Exercise Creator SHALL allow the user to add multiple tags to the exercise
3. WHEN viewing the Custom Exercise Library, THE Exercise Management Interface SHALL provide filtering options by category and tags
4. WHEN the user applies a filter, THE Exercise Management Interface SHALL display only exercises matching the selected criteria

### Requirement 7

**User Story:** As a learner, I want to search my custom exercises by keywords, so that I can quickly find specific exercises in my library

#### Acceptance Criteria

1. WHEN the user enters text in the search field, THE Exercise Management Interface SHALL filter exercises by matching keywords in title, content, categories, or tags
2. WHEN search results are displayed, THE Exercise Management Interface SHALL highlight matching terms in the exercise preview
3. WHEN the search field is cleared, THE Exercise Management Interface SHALL display all exercises in the library
4. WHEN no exercises match the search criteria, THE Exercise Management Interface SHALL display a message indicating no results found

### Requirement 8

**User Story:** As a learner, I want my custom exercises to integrate with the existing practice workflow, so that I can practice them just like built-in exercises

#### Acceptance Criteria

1. WHEN the user selects a custom exercise to practice, THE Exercise Creator SHALL load the exercise into the standard practice interface
2. WHEN practicing a custom exercise, THE Exercise Creator SHALL apply the same AI feedback and scoring mechanisms as built-in exercises
3. WHEN the user completes a custom exercise, THE Exercise Creator SHALL track attempts and progress using the existing progress tracking system
4. WHEN viewing exercise history, THE Exercise Creator SHALL display custom exercises alongside built-in exercises with appropriate indicators
