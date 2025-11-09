# Requirements Document

## Introduction

The Achievement System feature gamifies the English learning experience by rewarding users for reaching milestones, maintaining streaks, demonstrating excellence, and mastering content categories. This feature increases learner motivation and engagement through a comprehensive badge system, progress tracking, notifications, and unlockable rewards. The system recognizes various achievement types including milestone completions, streak maintenance, performance excellence, and category mastery, with each achievement having a rarity level and associated rewards.

## Glossary

- **Achievement Service**: The service responsible for tracking user progress, evaluating achievement criteria, and managing badge unlocks
- **Badge**: A visual reward representing a specific accomplishment, categorized by type (Milestone, Streak, Performance, Category Master) and rarity (Common, Rare, Epic, Legendary)
- **Achievement Component**: The UI component that displays earned badges, progress toward locked achievements, and achievement details
- **Notification System**: The mechanism for alerting users when they unlock new badges or make significant progress
- **Progress Bar**: A visual indicator showing percentage completion toward unlocking a specific achievement
- **Rarity Level**: A classification system (Common, Rare, Epic, Legendary) indicating the difficulty and prestige of an achievement
- **Reward System**: The mechanism for granting benefits (themes, credits, hints, avatars) when achievements are unlocked
- **Achievement Model**: The data structure defining achievement properties including id, name, description, criteria, rarity, and reward
- **LocalStorage**: Browser-based persistent storage containing user achievement progress and unlocked badges
- **Streak**: A consecutive sequence of days where the user completed at least one exercise

## Requirements

### Requirement 1

**User Story:** As a learner, I want to earn milestone badges for completing exercises, so that I can feel a sense of accomplishment as I progress

#### Acceptance Criteria

1. WHEN the user completes their 1st exercise, THE Achievement Service SHALL unlock the "First Step" badge with Common rarity
2. WHEN the user completes their 10th exercise, THE Achievement Service SHALL unlock the "Getting Started" badge with Common rarity
3. WHEN the user completes their 50th exercise, THE Achievement Service SHALL unlock the "Dedicated Learner" badge with Rare rarity
4. WHEN the user completes their 100th exercise, THE Achievement Service SHALL unlock the "Master Student" badge with Epic rarity
5. WHEN the user completes their 500th exercise, THE Achievement Service SHALL unlock the "Legend" badge with Legendary rarity

### Requirement 2

**User Story:** As a learner, I want to earn streak badges for practicing consistently, so that I am motivated to maintain daily learning habits

#### Acceptance Criteria

1. WHEN the user completes at least one exercise per day for 7 consecutive days, THE Achievement Service SHALL unlock the "Week Warrior" badge with Rare rarity
2. WHEN the user completes at least one exercise per day for 30 consecutive days, THE Achievement Service SHALL unlock the "Month Master" badge with Epic rarity
3. WHEN the user completes at least one exercise per day for 100 consecutive days, THE Achievement Service SHALL unlock the "Unstoppable" badge with Legendary rarity
4. WHEN the user's streak is broken, THE Achievement Service SHALL retain all previously earned streak badges
5. THE Achievement Service SHALL evaluate streak achievements at midnight in the user's local timezone

### Requirement 3

**User Story:** As a learner, I want to earn performance badges for excellence, so that I am recognized for high-quality work

#### Acceptance Criteria

1. WHEN the user achieves 100 percent accuracy on any exercise, THE Achievement Service SHALL unlock the "Perfect Score" badge with Rare rarity
2. WHEN the user completes an exercise with zero grammar errors, THE Achievement Service SHALL unlock the "Grammar Guru" badge with Rare rarity
3. WHEN the user completes an Advanced level exercise using at least 5 advanced vocabulary words as identified by AI feedback, THE Achievement Service SHALL unlock the "Vocabulary Virtuoso" badge with Epic rarity
4. WHEN the user completes an exercise in under 60 seconds with a score above 90 percent, THE Achievement Service SHALL unlock the "Speed Demon" badge with Epic rarity
5. THE Achievement Service SHALL allow users to earn performance badges multiple times but SHALL only display the badge once in the collection

### Requirement 4

**User Story:** As a learner, I want to earn category master badges, so that I can demonstrate comprehensive knowledge in specific topics

#### Acceptance Criteria

1. WHEN the user completes 80 percent of available exercises in a specific category with an average score above 75 percent, THE Achievement Service SHALL unlock the category-specific master badge with Rare rarity
2. WHEN the user achieves master status in all available categories, THE Achievement Service SHALL unlock the "Ultimate Master" badge with Legendary rarity
3. THE Achievement Service SHALL create a unique badge for each of the 20 exercise categories
4. WHEN new exercises are added to a category, THE Achievement Service SHALL recalculate the 80 percent threshold and update progress accordingly
5. THE Achievement Component SHALL display the number of exercises completed and the percentage threshold for each category master badge

### Requirement 5

**User Story:** As a learner, I want to see progress bars for locked achievements, so that I know how close I am to unlocking them

#### Acceptance Criteria

1. WHEN the user views the achievements page, THE Achievement Component SHALL display all achievements grouped by type (Milestone, Streak, Performance, Category Master)
2. THE Achievement Component SHALL display a progress bar showing percentage completion for each locked achievement
3. WHEN the user hovers over a locked achievement, THE Achievement Component SHALL display a tooltip with the exact criteria and current progress (e.g., "45 out of 50 exercises completed")
4. THE Achievement Component SHALL sort achievements within each group by rarity level from Common to Legendary
5. THE Achievement Component SHALL visually distinguish locked achievements from unlocked achievements using opacity and a lock icon

### Requirement 6

**User Story:** As a learner, I want to receive notifications when I unlock badges, so that I am immediately aware of my accomplishments

#### Acceptance Criteria

1. WHEN the user unlocks a new badge, THE Achievement Service SHALL trigger a notification that displays for 5 seconds
2. THE notification SHALL display the badge icon, name, rarity level, and a congratulatory message
3. WHEN the user unlocks a badge during exercise completion, THE notification SHALL appear after the feedback screen is displayed
4. THE Achievement Component SHALL provide a "View Achievement" button in the notification that navigates to the achievements page
5. WHEN multiple badges are unlocked simultaneously, THE Achievement Service SHALL queue notifications and display them sequentially with a 1 second delay between each

### Requirement 7

**User Story:** As a learner, I want to unlock rewards when I earn achievements, so that I receive tangible benefits for my accomplishments

#### Acceptance Criteria

1. WHEN the user unlocks their first Common badge, THE Achievement Service SHALL grant 50 bonus credits
2. WHEN the user unlocks their first Rare badge, THE Achievement Service SHALL grant 100 bonus credits and unlock one special theme
3. WHEN the user unlocks their first Epic badge, THE Achievement Service SHALL grant 250 bonus credits and unlock three exclusive hints
4. WHEN the user unlocks their first Legendary badge, THE Achievement Service SHALL grant 500 bonus credits and unlock custom avatar frames
5. THE Achievement Service SHALL persist all unlocked rewards in LocalStorage and make them immediately available in the application

### Requirement 8

**User Story:** As a learner, I want to showcase my achievements in my profile, so that I can display my accomplishments

#### Acceptance Criteria

1. WHEN the user views their profile, THE Achievement Component SHALL display a showcase section containing the 3 most recently unlocked badges
2. THE Achievement Component SHALL display the total count of unlocked achievements and the percentage of all available achievements
3. WHERE the user has unlocked at least one Legendary badge, THE Achievement Component SHALL display a special "Elite Learner" indicator in the profile header
4. THE Achievement Component SHALL allow the user to select up to 5 featured badges to display prominently in their profile
5. THE Achievement Component SHALL display the rarity distribution of unlocked badges as a summary statistic (e.g., "5 Common, 3 Rare, 1 Epic")

### Requirement 9

**User Story:** As a learner, I want to see detailed information about each achievement, so that I understand what is required to unlock it

#### Acceptance Criteria

1. WHEN the user clicks on any achievement, THE Achievement Component SHALL display a detail modal containing the badge name, description, rarity level, unlock criteria, and associated rewards
2. WHERE the achievement is locked, THE Achievement Component SHALL display the current progress with specific metrics (e.g., "Current streak: 5 days, Required: 7 days")
3. WHERE the achievement is unlocked, THE Achievement Component SHALL display the unlock date and time
4. THE Achievement Component SHALL display tips or suggestions for unlocking the achievement when available
5. THE detail modal SHALL include a "Close" button and SHALL close when the user clicks outside the modal area

### Requirement 10

**User Story:** As a learner, I want the achievement system to evaluate my progress efficiently, so that it does not impact application performance

#### Acceptance Criteria

1. WHEN the user completes an exercise, THE Achievement Service SHALL evaluate all relevant achievement criteria within 100 milliseconds
2. THE Achievement Service SHALL check only achievements that could potentially be affected by the completed exercise based on achievement type
3. THE Achievement Service SHALL cache achievement progress in memory and persist to LocalStorage only when progress changes
4. WHEN the application loads, THE Achievement Service SHALL initialize achievement data from LocalStorage within 50 milliseconds
5. THE Achievement Service SHALL use debouncing to batch multiple rapid achievement checks into a single evaluation cycle

### Requirement 11

**User Story:** As a learner, I want to filter and search my achievements, so that I can easily find specific badges

#### Acceptance Criteria

1. WHEN the user views the achievements page, THE Achievement Component SHALL provide filter options for achievement type (All, Milestone, Streak, Performance, Category Master)
2. THE Achievement Component SHALL provide filter options for status (All, Unlocked, Locked, In Progress)
3. THE Achievement Component SHALL provide filter options for rarity level (All, Common, Rare, Epic, Legendary)
4. WHEN the user applies multiple filters, THE Achievement Component SHALL display only achievements matching all selected criteria
5. THE Achievement Component SHALL display the count of achievements matching the current filter selection

### Requirement 12

**User Story:** As a learner, I want to share my achievements on social media, so that I can celebrate my accomplishments with others

#### Acceptance Criteria

1. WHEN the user clicks the share button on an unlocked achievement, THE Achievement Component SHALL generate a shareable image containing the badge icon, name, unlock date, and application branding
2. THE Achievement Component SHALL provide share options for common platforms including Twitter, Facebook, and LinkedIn
3. THE generated share image SHALL be 1200 pixels by 630 pixels to meet social media platform requirements
4. THE share text SHALL include a congratulatory message and a link to the application
5. WHERE the browser does not support the Web Share API, THE Achievement Component SHALL provide a "Copy Link" option as a fallback
