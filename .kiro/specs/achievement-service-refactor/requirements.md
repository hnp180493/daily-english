# Requirements Document

## Introduction

The Achievement Service has grown to over 800 lines of code with multiple responsibilities including achievement evaluation, progress tracking, data persistence, migration, and reward claiming. This refactoring aims to break down the monolithic service into smaller, focused services following the Single Responsibility Principle, improving maintainability, testability, and code clarity.

## Glossary

- **Achievement System**: The complete system for tracking, evaluating, and unlocking user achievements
- **Criteria Evaluator**: Component responsible for checking if achievement criteria are met
- **Progress Tracker**: Component that calculates and updates achievement progress
- **Achievement Store**: Component managing achievement data persistence and retrieval
- **Migration Service**: Component handling data migration from localStorage to Firestore
- **Reward Claimer**: Component managing the reward claiming process
- **User Progress**: Data structure containing user's exercise completion history and statistics

## Requirements

### Requirement 1

**User Story:** As a developer, I want the achievement service to be broken into smaller, focused services, so that the codebase is easier to maintain and test

#### Acceptance Criteria

1. THE Achievement System SHALL separate criteria evaluation logic into a dedicated AchievementCriteriaService
2. THE Achievement System SHALL separate progress calculation logic into a dedicated AchievementProgressService
3. THE Achievement System SHALL separate data persistence logic into a dedicated AchievementStoreService
4. THE Achievement System SHALL maintain the existing AchievementService as a facade that coordinates between specialized services
5. THE Achievement System SHALL ensure all existing functionality continues to work after refactoring

### Requirement 2

**User Story:** As a developer, I want redundant and unused code removed, so that the codebase is cleaner and easier to understand

#### Acceptance Criteria

1. THE Achievement System SHALL remove duplicate category extraction logic
2. THE Achievement System SHALL remove commented-out code and disabled features
3. THE Achievement System SHALL consolidate threshold mapping logic
4. THE Achievement System SHALL remove unnecessary console.log statements in production code
5. THE Achievement System SHALL eliminate redundant validation checks

### Requirement 3

**User Story:** As a developer, I want achievement criteria evaluation to be isolated and testable, so that I can easily add new achievement types

#### Acceptance Criteria

1. THE AchievementCriteriaService SHALL provide methods for evaluating each achievement type
2. THE AchievementCriteriaService SHALL accept UserProgress and Achievement as parameters
3. THE AchievementCriteriaService SHALL return boolean results indicating if criteria are met
4. THE AchievementCriteriaService SHALL be stateless and pure (no side effects)
5. THE AchievementCriteriaService SHALL use helper methods to extract reusable evaluation logic

### Requirement 4

**User Story:** As a developer, I want progress calculation to be separated from evaluation logic, so that progress updates don't interfere with achievement unlocking

#### Acceptance Criteria

1. THE AchievementProgressService SHALL calculate progress for all achievement types
2. THE AchievementProgressService SHALL return AchievementProgress objects with current/required/percentage values
3. THE AchievementProgressService SHALL be stateless and not trigger side effects
4. THE AchievementProgressService SHALL use threshold configuration from a centralized location
5. THE AchievementProgressService SHALL handle edge cases (null values, empty arrays) gracefully

### Requirement 5

**User Story:** As a developer, I want data persistence logic separated, so that I can easily switch storage implementations or add caching

#### Acceptance Criteria

1. THE AchievementStoreService SHALL handle all Firestore read/write operations
2. THE AchievementStoreService SHALL manage UserAchievementData synchronization
3. THE AchievementStoreService SHALL provide methods for loading, saving, and updating achievement data
4. THE AchievementStoreService SHALL handle migration from localStorage to Firestore
5. THE AchievementStoreService SHALL return Observables for all async operations

### Requirement 6

**User Story:** As a developer, I want the main AchievementService to be a clean coordinator, so that the overall flow is easy to understand

#### Acceptance Criteria

1. THE AchievementService SHALL delegate criteria evaluation to AchievementCriteriaService
2. THE AchievementService SHALL delegate progress calculation to AchievementProgressService
3. THE AchievementService SHALL delegate data persistence to AchievementStoreService
4. THE AchievementService SHALL maintain signals for reactive state management
5. THE AchievementService SHALL coordinate the evaluation queue and debouncing logic
6. THE AchievementService SHALL handle notification triggering for unlocked achievements

### Requirement 7

**User Story:** As a developer, I want achievement configuration centralized, so that thresholds and criteria are easy to modify

#### Acceptance Criteria

1. THE Achievement System SHALL create an achievement-config.ts file with all thresholds
2. THE Achievement System SHALL define milestone thresholds in configuration
3. THE Achievement System SHALL define streak thresholds in configuration
4. THE Achievement System SHALL define category requirements in configuration
5. THE Achievement System SHALL allow easy modification of achievement criteria without changing service code

### Requirement 8

**User Story:** As a developer, I want helper utilities extracted, so that common operations are reusable

#### Acceptance Criteria

1. THE Achievement System SHALL create an achievement-utils.ts file for shared utilities
2. THE Achievement System SHALL extract category extraction logic to utilities
3. THE Achievement System SHALL extract date/time comparison logic to utilities
4. THE Achievement System SHALL extract score calculation logic to utilities
5. THE Achievement System SHALL ensure utilities are pure functions with no side effects
