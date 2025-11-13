# Requirements Document

## Introduction

This document specifies requirements for implementing a comprehensive exercise history tracking system for the English Practice application. The system will record detailed information about each exercise attempt, including timestamps, scores, sentence-level performance, and AI feedback. This data will enable users to review their learning journey and provide insights through dashboard reports. The feature is designed as a standalone module that can be removed without affecting core application functionality.

## Glossary

- **Exercise History System**: The complete feature set for tracking, storing, and displaying user exercise attempts
- **Exercise Attempt**: A single instance of a user completing or attempting an exercise
- **Sentence Attempt**: A record of a user's translation attempt for a single sentence within an exercise
- **History Record**: A database entry containing all data about one exercise attempt
- **Dashboard Report**: Visual analytics and statistics displayed on the user dashboard
- **Supabase**: The PostgreSQL database backend used for data persistence
- **Exercise Detail Component**: The Angular component where users complete translation exercises
- **Dashboard Component**: The Angular component displaying user statistics and progress

## Requirements

### Requirement 1

**User Story:** As a learner, I want my exercise attempts to be automatically recorded with detailed information, so that I can track my learning progress over time

#### Acceptance Criteria

1. WHEN a user completes an exercise in the Exercise Detail Component, THE Exercise History System SHALL create a new History Record containing exercise ID, completion timestamp, final accuracy score, total time spent, hints used count, and sentence-level performance data
2. WHEN a user completes an exercise, THE Exercise History System SHALL store each Sentence Attempt with the original text, user translation, accuracy score, number of retries, and AI feedback received
3. WHEN a user completes an exercise, THE Exercise History System SHALL calculate and store penalty metrics including total incorrect attempts, total retries, base score, total penalty, and final score
4. WHEN a user completes an exercise, THE Exercise History System SHALL record the attempt without modifying existing user_progress or user_reviews table data
5. THE Exercise History System SHALL store all History Records in a dedicated user_exercise_history table with proper foreign key relationships to the users table

### Requirement 2

**User Story:** As a learner, I want to see my recent exercise history on the dashboard, so that I can quickly review my recent practice sessions

#### Acceptance Criteria

1. THE Dashboard Component SHALL display a "Recent Exercise History" section showing the 10 most recent History Records
2. WHEN displaying recent history, THE Dashboard Component SHALL show exercise title, completion date, final score, time spent, and hints used for each History Record
3. WHEN a user clicks on a History Record in the recent history list, THE Dashboard Component SHALL navigate to the exercise detail page in review mode
4. WHERE the user has no History Records, THE Dashboard Component SHALL display a message encouraging the user to complete exercises
5. THE Dashboard Component SHALL load recent history data without blocking other dashboard components from rendering

### Requirement 3

**User Story:** As a learner, I want to see statistics about my exercise completion patterns, so that I can understand my learning habits

#### Acceptance Criteria

1. THE Dashboard Component SHALL display a "Practice Statistics" report showing total exercises completed, average accuracy score, total time spent practicing, and average time per exercise
2. THE Dashboard Component SHALL display a "Best Performances" report showing the top 5 exercises with highest accuracy scores
3. THE Dashboard Component SHALL display a "Most Practiced" report showing the top 5 exercises with the most attempts
4. WHEN calculating statistics, THE Dashboard Component SHALL use only data from the user_exercise_history table
5. THE Dashboard Component SHALL update all statistics in real-time when new History Records are created

### Requirement 4

**User Story:** As a learner, I want to see my practice activity over time, so that I can identify patterns in my learning schedule

#### Acceptance Criteria

1. THE Dashboard Component SHALL display a "Practice Activity Timeline" showing exercise completion counts grouped by day for the selected time range
2. WHEN the user selects a time range filter (7 days, 30 days, 90 days), THE Dashboard Component SHALL update the Practice Activity Timeline to show data for that period
3. THE Dashboard Component SHALL display the Practice Activity Timeline as a simple chart or list showing date and completion count
4. WHERE a day has no exercise completions, THE Dashboard Component SHALL display zero or omit that day from the timeline
5. THE Dashboard Component SHALL calculate timeline data from the user_exercise_history table completion timestamps

### Requirement 5

**User Story:** As a developer, I want the history system to be completely independent from existing features, so that it can be removed without breaking the application

#### Acceptance Criteria

1. THE Exercise History System SHALL store all data in a separate user_exercise_history table with no foreign key dependencies from other tables
2. THE Exercise History System SHALL implement all functionality in dedicated service classes that are not required by existing services
3. THE Exercise History System SHALL implement all UI components as optional imports that can be removed from the Dashboard Component
4. WHEN the Exercise History System is removed, THE Exercise Detail Component SHALL continue to function normally for exercise completion
5. WHEN the Exercise History System is removed, THE Dashboard Component SHALL continue to display existing analytics without errors

### Requirement 6

**User Story:** As a learner, I want my exercise history to be stored securely and efficiently, so that my data is protected and the application remains fast

#### Acceptance Criteria

1. THE Exercise History System SHALL enforce Row Level Security (RLS) policies ensuring users can only access their own History Records
2. THE Exercise History System SHALL create database indexes on user_id and created_at columns for efficient query performance
3. THE Exercise History System SHALL store sentence-level data as JSONB to optimize storage and query flexibility
4. WHEN storing a History Record, THE Exercise History System SHALL validate that the user_id matches the authenticated user
5. THE Exercise History System SHALL handle database errors gracefully without causing exercise completion to fail
