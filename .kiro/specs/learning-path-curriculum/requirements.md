# Requirements Document

## Introduction

The Learning Path & Curriculum feature provides a structured, adaptive learning journey for English learners. The system guides users through progressive difficulty levels with daily challenges, personalized recommendations, and goal tracking to help them achieve fluency and develop the ability to think in English naturally.

## Glossary

- **Learning Path System**: The complete curriculum management system that organizes exercises into structured learning journeys
- **Path**: A predefined sequence of learning modules organized by proficiency level (Beginner, Intermediate, Advanced)
- **Daily Challenge**: A single exercise assigned to the user each day based on their current path and progress
- **Streak**: The number of consecutive days a user has completed their daily challenge
- **Adaptive Engine**: The AI-powered recommendation system that suggests next exercises based on user performance
- **Weekly Goal**: A user-defined target for the number of exercises to complete within a week
- **Curriculum Service**: The backend service that manages path data, progress tracking, and recommendations
- **Learning Module**: A thematic grouping of exercises within a path (e.g., "Daily Life Basics", "Travel & Transportation")

## Requirements

### Requirement 1

**User Story:** As a beginner English learner, I want to follow a structured learning path, so that I can progress systematically from basic to advanced topics.

#### Acceptance Criteria

1. WHEN the user first accesses the Learning Path System, THE Learning Path System SHALL display three available paths: Beginner Path (3 months), Intermediate Path (4 months), and Advanced Path (6 months)
2. WHEN the user selects a Path, THE Learning Path System SHALL display the complete curriculum structure including all Learning Modules with their week ranges and topics
3. WHEN the user views a Path, THE Learning Path System SHALL indicate which Learning Modules are currently unlocked based on the user's progress
4. WHEN the user completes all exercises in a Learning Module, THE Learning Path System SHALL unlock the next Learning Module in sequence
5. THE Learning Path System SHALL persist the user's selected Path and current position across sessions

### Requirement 2

**User Story:** As a daily learner, I want to receive a daily challenge, so that I can maintain consistent practice and build a learning habit.

#### Acceptance Criteria

1. WHEN a new day begins (00:00 local time), THE Learning Path System SHALL generate a Daily Challenge for the user based on their current Path position
2. WHEN the user completes the Daily Challenge, THE Learning Path System SHALL increment their Streak counter by one
3. IF the user fails to complete the Daily Challenge before the day ends, THEN THE Learning Path System SHALL reset the Streak counter to zero
4. WHEN the user has an active Streak of 7 days or more, THE Learning Path System SHALL apply a score multiplier of 1.5x to all completed exercises
5. WHEN the day is Saturday or Sunday, THE Learning Path System SHALL generate a special weekend challenge with bonus points worth 2x the standard value

### Requirement 3

**User Story:** As a goal-oriented learner, I want to set and track weekly goals, so that I can measure my progress and stay motivated.

#### Acceptance Criteria

1. WHEN the user accesses the goal settings, THE Learning Path System SHALL allow the user to set a Weekly Goal between 3 and 50 exercises per week
2. WHEN the user completes an exercise, THE Learning Path System SHALL update the weekly progress counter and display the percentage toward the Weekly Goal
3. WHEN the user achieves their Weekly Goal, THE Learning Path System SHALL award 500 bonus points and display a congratulatory notification
4. WHEN a new week begins (Monday 00:00 local time), THE Learning Path System SHALL reset the weekly progress counter to zero
5. WHEN the user is within 2 exercises of their Weekly Goal, THE Learning Path System SHALL display a reminder notification encouraging completion

### Requirement 4

**User Story:** As a learner with varying performance, I want the system to recommend exercises that match my current skill level, so that I can focus on areas where I need improvement.

#### Acceptance Criteria

1. WHEN the user requests the next recommended exercise, THE Adaptive Engine SHALL analyze the user's recent performance from the last 10 completed exercises
2. WHEN the user has scored below 70% on exercises in a specific category, THE Adaptive Engine SHALL prioritize recommending exercises from that category
3. WHEN the user has completed fewer than 5 exercises, THE Adaptive Engine SHALL recommend exercises from the current Learning Module in sequential order
4. WHEN the user consistently scores above 85% in their current difficulty level, THE Adaptive Engine SHALL recommend exercises from the next difficulty level
5. THE Adaptive Engine SHALL ensure recommended exercises have not been completed by the user within the last 30 days

### Requirement 5

**User Story:** As a learner who wants to think in English, I want exercises that progressively reduce translation dependency, so that I can develop natural English thinking patterns.

#### Acceptance Criteria

1. WHEN the user is in the Beginner Path (weeks 1-4), THE Learning Path System SHALL include exercises with Vietnamese translations and explanations
2. WHEN the user progresses to the Beginner Path (weeks 5-12), THE Learning Path System SHALL reduce translation support to 50% of exercises
3. WHEN the user is in the Intermediate Path or higher, THE Learning Path System SHALL provide exercises with English-only instructions and minimal translation support
4. WHEN the user completes an Advanced Path exercise, THE Learning Path System SHALL require responses that demonstrate contextual understanding without translation prompts
5. THE Learning Path System SHALL track the user's translation dependency score and display progress toward English-only thinking

### Requirement 6

**User Story:** As a learner tracking my progress, I want to see detailed statistics about my learning journey, so that I can understand my strengths and areas for improvement.

#### Acceptance Criteria

1. WHEN the user views their learning path dashboard, THE Learning Path System SHALL display the current Path name, completion percentage, and estimated completion date
2. WHEN the user views progress statistics, THE Learning Path System SHALL show the total number of exercises completed, current Streak, and longest Streak achieved
3. WHEN the user views performance analytics, THE Learning Path System SHALL display average scores by category and difficulty level for the last 30 days
4. WHEN the user views their learning pace, THE Learning Path System SHALL calculate and display the average number of exercises completed per week
5. THE Learning Path System SHALL provide a visual progress indicator showing completed, current, and upcoming Learning Modules

### Requirement 7

**User Story:** As a busy learner, I want to receive reminder notifications, so that I don't forget to complete my daily challenge and maintain my streak.

#### Acceptance Criteria

1. WHEN the user enables notifications, THE Learning Path System SHALL send a daily reminder at the user's preferred time (default 19:00 local time)
2. WHEN the user has not completed their Daily Challenge and it is 2 hours before midnight, THE Learning Path System SHALL send an urgent reminder notification
3. WHEN the user has an active Streak of 5 days or more and has not completed the Daily Challenge, THE Learning Path System SHALL include the Streak count in the reminder message
4. WHEN the user completes their Daily Challenge, THE Learning Path System SHALL not send any additional reminders for that day
5. THE Learning Path System SHALL allow users to customize notification times or disable notifications entirely

### Requirement 8

**User Story:** As a learner who completed a path, I want to receive a certificate and unlock advanced content, so that I feel accomplished and can continue learning.

#### Acceptance Criteria

1. WHEN the user completes all Learning Modules in a Path, THE Learning Path System SHALL generate a completion certificate with the user's name, Path name, and completion date
2. WHEN the user completes the Beginner Path, THE Learning Path System SHALL automatically unlock the Intermediate Path
3. WHEN the user completes the Intermediate Path, THE Learning Path System SHALL automatically unlock the Advanced Path
4. WHEN the user completes the Advanced Path, THE Learning Path System SHALL unlock a "Master" mode with expert-level challenges
5. THE Learning Path System SHALL award 5000 bonus points upon completion of any Path
