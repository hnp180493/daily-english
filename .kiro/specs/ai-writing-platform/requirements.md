# Requirements Document

## Introduction

This document outlines the requirements for an AI-powered English writing practice platform. The system enables users to practice writing skills through structured exercises across multiple difficulty levels and categories. The platform integrates AI services (Azure OpenAI or Google Gemini) to provide intelligent feedback on user submissions, helping learners improve their English writing through immediate, contextual corrections and suggestions.

## Glossary

- **Writing Platform**: The web-based Angular application that provides the user interface and manages user interactions
- **Exercise System**: The component responsible for managing, displaying, and tracking writing exercises
- **AI Service**: Either Azure OpenAI or Google Gemini API used for analyzing and providing feedback on user text
- **Feedback Engine**: The system component that processes user submissions through the AI Service and presents results
- **User Session**: A temporary state that tracks user progress, selections, and submissions during browser usage
- **Difficulty Level**: A classification of exercises as Beginner, Intermediate, or Advanced
- **Exercise Category**: A topical grouping of exercises (e.g., Personal & Communication, Everyday Life, etc.)
- **Translation Input**: User-provided English text entered directly in the browser for evaluation
- **Accuracy Score**: A percentage value indicating the quality of the user's translation or writing

## Requirements

### Requirement 1

**User Story:** As a language learner, I want to select my skill level and exercise category, so that I can practice writing appropriate to my abilities and interests

#### Acceptance Criteria

1. WHEN the User Session begins, THE Writing Platform SHALL display three difficulty level options: Beginner, Intermediate, and Advanced
2. WHEN the user selects a difficulty level, THE Writing Platform SHALL display at least 12 exercise categories with distinct icons and descriptions
3. WHEN the user selects a category, THE Exercise System SHALL filter and display only exercises matching both the selected difficulty level and category
4. THE Writing Platform SHALL maintain the user's level and category selections throughout the User Session
5. THE Writing Platform SHALL allow users to change their difficulty level or category selection at any time during the User Session

### Requirement 2

**User Story:** As a language learner, I want to view available exercises in my chosen category, so that I can select specific topics to practice

#### Acceptance Criteria

1. WHEN exercises are displayed, THE Exercise System SHALL show the exercise title, difficulty badge, category tag, and brief description for each exercise
2. THE Exercise System SHALL display a status indicator showing whether each exercise is "New", "Not Started", or "Attempt X" (where X is the attempt number)
3. WHEN the user clicks on an exercise, THE Writing Platform SHALL navigate to the exercise detail page
4. THE Exercise System SHALL support pagination when more than 6 exercises exist in a category
5. THE Exercise System SHALL display the total count of available exercises in the current filter

### Requirement 3

**User Story:** As a language learner, I want to read a source text and provide my English translation, so that I can practice my writing skills

#### Acceptance Criteria

1. WHEN an exercise loads, THE Exercise System SHALL display the source text prominently with proper formatting
2. THE Writing Platform SHALL provide a text input area where users can enter their Translation Input directly in the browser
3. THE Writing Platform SHALL highlight specific sentences or phrases in the source text that require translation
4. WHEN the user types in the input area, THE Writing Platform SHALL preserve all entered text without data loss
5. THE Exercise System SHALL display a progress indicator showing the user's current position in the exercise sequence

### Requirement 4

**User Story:** As a language learner, I want to submit my translation and receive AI-powered feedback, so that I can understand my mistakes and improve

#### Acceptance Criteria

1. WHEN the user clicks the submit button, THE Feedback Engine SHALL send the Translation Input to the AI Service for analysis
2. WHILE the AI Service processes the submission, THE Writing Platform SHALL display a loading indicator
3. WHEN the AI Service returns results, THE Feedback Engine SHALL display an Accuracy Score as a percentage
4. WHEN feedback is available, THE Feedback Engine SHALL highlight errors in the user's text with color-coded annotations
5. THE Feedback Engine SHALL display suggested improvements with explanations for each identified error
6. THE Feedback Engine SHALL categorize feedback by error type (grammar, vocabulary, structure, etc.)

### Requirement 5

**User Story:** As a language learner, I want to use either Azure OpenAI or Google Gemini for feedback, so that I have flexibility in AI service selection

#### Acceptance Criteria

1. THE Writing Platform SHALL support configuration for Azure OpenAI API credentials (endpoint, API key, deployment name)
2. THE Writing Platform SHALL support configuration for Google Gemini API credentials (API key, model name)
3. WHEN the system initializes, THE AI Service SHALL validate the configured credentials before allowing exercise submissions
4. THE Feedback Engine SHALL format prompts appropriately for the selected AI Service provider
5. IF the AI Service returns an error, THEN THE Feedback Engine SHALL display a user-friendly error message and allow resubmission

### Requirement 6

**User Story:** As a language learner, I want to see my progress and achievements, so that I can track my learning journey

#### Acceptance Criteria

1. THE Exercise System SHALL track and display the user's current streak (consecutive days of practice)
2. THE Exercise System SHALL display earned credits based on completed exercises
3. THE Exercise System SHALL display earned points based on accuracy scores
4. WHEN an exercise is completed, THE Exercise System SHALL update the user's statistics immediately
5. THE Writing Platform SHALL display achievement badges for milestones (e.g., "Bright Mind", "1 Day Streak")

### Requirement 7

**User Story:** As a language learner, I want to access hint functionality during exercises, so that I can get help when stuck

#### Acceptance Criteria

1. WHEN viewing an exercise, THE Writing Platform SHALL display a "Hint" button
2. WHEN the user clicks the hint button, THE Exercise System SHALL reveal contextual guidance without providing the complete answer
3. THE Exercise System SHALL track hint usage and may adjust scoring accordingly
4. THE Writing Platform SHALL allow users to request multiple hints per exercise if available

### Requirement 8

**User Story:** As a language learner, I want the interface to be responsive and visually appealing, so that I can practice comfortably on any device

#### Acceptance Criteria

1. THE Writing Platform SHALL render correctly on desktop browsers with viewport widths of 1024 pixels or greater
2. THE Writing Platform SHALL render correctly on tablet devices with viewport widths between 768 and 1023 pixels
3. THE Writing Platform SHALL render correctly on mobile devices with viewport widths of 767 pixels or less
4. THE Writing Platform SHALL use a consistent color scheme with high contrast for readability
5. THE Writing Platform SHALL display all interactive elements with clear hover and focus states
