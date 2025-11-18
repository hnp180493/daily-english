# Requirements Document

## Introduction

This feature enables guest users (non-authenticated users) to use the language learning application without requiring login. Guest users can complete exercises and their progress will be stored in browser localStorage. When a guest user decides to log in, their localStorage data will be cleared and they will transition to using Supabase for data persistence. This creates a low-friction onboarding experience while maintaining data integrity for authenticated users.

## Glossary

- **Guest User**: A user who accesses the application without authentication
- **Authenticated User**: A user who has logged in via Google authentication
- **Progress Service**: The Angular service responsible for managing user progress data
- **Exercise Service**: The Angular service that handles exercise data and completion
- **Storage Adapter**: An abstraction layer that handles data persistence to either localStorage or Supabase
- **Auth Service**: The service managing user authentication state
- **localStorage**: Browser-based client-side storage mechanism
- **Supabase**: Cloud-based database service for authenticated users

## Requirements

### Requirement 1

**User Story:** As a guest user, I want to complete exercises without logging in, so that I can try the application before committing to create an account

#### Acceptance Criteria

1. WHEN a guest user accesses the application, THE Application SHALL allow full access to all exercises without requiring authentication
2. WHEN a guest user completes an exercise, THE Progress Service SHALL store the completion data in localStorage
3. WHEN a guest user navigates between pages, THE Application SHALL persist their progress data across sessions
4. THE Application SHALL display progress statistics (completed exercises, streak, etc.) for guest users based on localStorage data
5. WHEN localStorage storage quota is exceeded, THE Application SHALL handle the error gracefully and notify the user

### Requirement 2

**User Story:** As a guest user, I want my progress to be saved locally, so that I can continue where I left off when I return to the application

#### Acceptance Criteria

1. THE Storage Adapter SHALL store exercise completion records in localStorage with a structured JSON format
2. THE Storage Adapter SHALL store user statistics (total exercises completed, current streak, last activity date) in localStorage
3. WHEN the application loads, THE Progress Service SHALL retrieve and parse localStorage data for guest users
4. THE Storage Adapter SHALL implement data validation to ensure localStorage data integrity
5. WHEN localStorage data is corrupted, THE Application SHALL reset the guest user's progress and log the error

### Requirement 3

**User Story:** As a guest user who decides to log in, I want to start fresh with cloud-based storage, so that my data is properly synchronized across devices

#### Acceptance Criteria

1. WHEN a guest user initiates login, THE Auth Service SHALL clear all localStorage progress data before completing authentication
2. WHEN authentication completes successfully, THE Progress Service SHALL switch to using Supabase for all data operations
3. THE Application SHALL display a warning message to guest users before login explaining that localStorage data will be cleared
4. WHEN a user logs out, THE Application SHALL NOT restore any previous localStorage data
5. THE Application SHALL prevent any localStorage data from being written after successful authentication

### Requirement 4

**User Story:** As a developer, I want a clean abstraction between localStorage and Supabase storage, so that the codebase remains maintainable and testable

#### Acceptance Criteria

1. THE Storage Adapter SHALL provide a unified interface for both localStorage and Supabase operations
2. THE Progress Service SHALL use the Storage Adapter without knowing the underlying storage mechanism
3. THE Storage Adapter SHALL automatically select localStorage for guest users and Supabase for authenticated users
4. THE Storage Adapter SHALL implement the same data structure for both storage mechanisms where possible
5. THE Application SHALL include unit tests for both localStorage and Supabase storage paths

### Requirement 5

**User Story:** As a product owner, I want to track guest user engagement, so that I can understand conversion rates and user behavior

#### Acceptance Criteria

1. THE Application SHALL store a guest user identifier in localStorage for analytics purposes
2. WHEN a guest user completes their first exercise, THE Application SHALL record the timestamp in localStorage
3. THE Application SHALL track the number of exercises completed by guest users in localStorage
4. THE Application SHALL NOT send guest user data to Supabase or any external analytics service
5. WHEN a guest user logs in, THE Application SHALL clear all guest analytics data from localStorage

### Requirement 6

**User Story:** As a user, I want the application to work consistently regardless of my authentication status, so that I have a seamless experience

#### Acceptance Criteria

1. THE Application SHALL display the same UI components for both guest and authenticated users
2. THE Application SHALL show a login prompt in the header for guest users
3. WHEN displaying progress statistics, THE Application SHALL use the appropriate data source based on authentication status
4. THE Exercise Service SHALL function identically for both guest and authenticated users
5. THE Application SHALL NOT display features that require authentication (e.g., cross-device sync) to guest users
