# Requirements Document

## Introduction

This feature enhances the learning dashboard to provide more engaging, data-driven insights for learners by leveraging the newly integrated exercise history data from Supabase (`user_exercise_history` table). The current dashboard has limited analytics due to historical data gaps. With the new comprehensive history tracking (including sentence attempts, time spent, hints used, and penalty metrics), we can now provide richer visualizations and actionable insights that motivate learners and help them track their progress more effectively.

## Glossary

- **Dashboard**: The main analytics and progress tracking interface where learners view their learning statistics and insights
- **Exercise History System**: The Supabase-based data storage system that records detailed exercise completion data in the `user_exercise_history` table
- **Activity Heatmap**: A calendar-style visualization showing daily exercise activity with intensity levels
- **Learning Streak**: Consecutive days of exercise completion
- **Performance Metrics**: Quantitative measurements including accuracy scores, time spent, hints used, and retry counts
- **Sentence Attempt Data**: Detailed records of individual sentence translations including user input, accuracy, and AI feedback
- **Penalty Metrics**: Score adjustments based on incorrect attempts and retries
- **Timeline Widget**: A chronological visualization of exercise completion activity
- **Practice Stats Widget**: A summary card displaying key practice statistics
- **Recent History Widget**: A list showing the most recent completed exercises
- **Progress Insights**: Data-driven recommendations and observations about learning patterns
- **Difficulty Trend Analysis**: Tracking of performance across different exercise difficulty levels over time
- **Time-of-Day Analysis**: Insights about when learners are most productive
- **Weak Areas Identification**: Detection of sentence patterns or topics where learners struggle most

## Requirements

### Requirement 1: Enhanced Activity Heatmap with Real History Data

**User Story:** As a learner, I want to see a detailed activity heatmap based on my actual exercise history, so that I can visualize my learning consistency and identify patterns in my practice habits.

#### Acceptance Criteria

1. WHEN the Dashboard loads, THE Activity Heatmap SHALL retrieve exercise completion data from the Exercise History System for the selected time range
2. THE Activity Heatmap SHALL display each day as a cell with intensity levels (0-4) based on the number of exercises completed that day
3. WHEN a learner clicks on a heatmap cell, THE Activity Heatmap SHALL display detailed information including exercise count, average score, total time spent, and list of completed exercises for that day
4. THE Activity Heatmap SHALL calculate and display current streak and longest streak based on consecutive days with at least one exercise completion
5. WHERE the learner has completed exercises on a day, THE Activity Heatmap SHALL show the intensity color corresponding to completion count (1 exercise = level 1, 2-3 = level 2, 4-5 = level 3, 6+ = level 4)

### Requirement 2: Comprehensive Practice Statistics Dashboard

**User Story:** As a learner, I want to see comprehensive statistics about my practice sessions, so that I can understand my overall progress and identify areas for improvement.

#### Acceptance Criteria

1. THE Practice Stats Widget SHALL display total exercises completed from the Exercise History System
2. THE Practice Stats Widget SHALL calculate and display average accuracy score across all completed exercises
3. THE Practice Stats Widget SHALL display total time spent practicing in hours and minutes
4. THE Practice Stats Widget SHALL calculate and display average time per exercise in minutes
5. THE Practice Stats Widget SHALL display total hints used across all exercises
6. WHERE the learner has completed at least 5 exercises, THE Practice Stats Widget SHALL display a trend indicator (improving, stable, declining) based on recent performance compared to overall average

### Requirement 3: Recent Activity Timeline with Rich Details

**User Story:** As a learner, I want to see a detailed timeline of my recent exercise completions, so that I can review my recent practice sessions and track my day-to-day progress.

#### Acceptance Criteria

1. THE Recent History Widget SHALL display the 10 most recent exercise completions from the Exercise History System
2. WHEN displaying each exercise entry, THE Recent History Widget SHALL show exercise ID, completion time, final score, time spent, and hints used
3. WHEN a learner clicks on an exercise entry, THE Recent History Widget SHALL navigate to that exercise detail page
4. THE Recent History Widget SHALL display a visual indicator for score quality (green for ≥80%, yellow for 60-79%, red for <60%)
5. WHERE no exercise history exists, THE Recent History Widget SHALL display an empty state message encouraging the learner to start practicing

### Requirement 4: Performance Trend Analysis

**User Story:** As a learner, I want to see how my performance has changed over time, so that I can understand whether my skills are improving and stay motivated.

#### Acceptance Criteria

1. THE Performance Analysis Component SHALL display a line chart showing average accuracy scores over the selected time range (7 days, 30 days, or 90 days)
2. THE Performance Analysis Component SHALL group exercise completions by day and calculate daily average scores
3. THE Performance Analysis Component SHALL display a trend line indicating overall performance direction (improving, stable, declining)
4. WHERE the learner has completed exercises on fewer than 3 different days, THE Performance Analysis Component SHALL display a message indicating insufficient data for trend analysis
5. THE Performance Analysis Component SHALL allow learners to toggle between different time ranges using time range selector buttons

### Requirement 5: Weak Areas Identification and Insights

**User Story:** As a learner, I want to identify my weak areas and receive actionable insights, so that I can focus my practice on areas that need improvement.

#### Acceptance Criteria

1. THE Weak Areas Component SHALL analyze sentence attempt data from the Exercise History System to identify patterns in low-scoring sentences
2. WHERE a learner has completed at least 10 exercises, THE Weak Areas Component SHALL display the top 3 most challenging sentence patterns based on average accuracy scores
3. THE Weak Areas Component SHALL display the average retry count for each identified weak area
4. THE Weak Areas Component SHALL provide actionable recommendations for each weak area (e.g., "Practice sentences with passive voice")
5. WHEN a learner clicks on a weak area, THE Weak Areas Component SHALL display example sentences from their history where they struggled

### Requirement 6: Time-of-Day Productivity Analysis

**User Story:** As a learner, I want to understand when I'm most productive during the day, so that I can schedule my practice sessions at optimal times.

#### Acceptance Criteria

1. THE Time Analysis Component SHALL analyze completion timestamps from the Exercise History System to determine practice patterns
2. THE Time Analysis Component SHALL group exercises by time of day (morning: 6-12, afternoon: 12-18, evening: 18-24, night: 0-6)
3. THE Time Analysis Component SHALL display average accuracy scores for each time period
4. THE Time Analysis Component SHALL display the count of exercises completed in each time period
5. WHERE the learner has completed at least 20 exercises, THE Time Analysis Component SHALL highlight the most productive time period with a visual indicator

### Requirement 7: Best Performances Showcase

**User Story:** As a learner, I want to see my best performances, so that I can celebrate my achievements and stay motivated.

#### Acceptance Criteria

1. THE Best Performances Component SHALL display the top 5 highest-scoring exercise completions from the Exercise History System
2. WHEN displaying each best performance, THE Best Performances Component SHALL show exercise ID, score, completion date, and time spent
3. THE Best Performances Component SHALL sort performances by final score in descending order
4. WHEN a learner clicks on a best performance entry, THE Best Performances Component SHALL navigate to that exercise detail page
5. WHERE the learner has completed fewer than 5 exercises, THE Best Performances Component SHALL display all available completions

### Requirement 8: Most Practiced Exercises Tracking

**User Story:** As a learner, I want to see which exercises I've practiced most frequently, so that I can diversify my practice or focus on mastering specific exercises.

#### Acceptance Criteria

1. THE Most Practiced Component SHALL analyze the Exercise History System to count completion frequency for each exercise
2. THE Most Practiced Component SHALL display the top 5 most frequently practiced exercises
3. WHEN displaying each exercise, THE Most Practiced Component SHALL show exercise ID, attempt count, and average score across all attempts
4. THE Most Practiced Component SHALL display a progress indicator showing improvement trend (comparing first attempt to most recent attempt)
5. WHEN a learner clicks on an exercise entry, THE Most Practiced Component SHALL navigate to that exercise detail page

### Requirement 9: Learning Velocity Metrics

**User Story:** As a learner, I want to understand my learning velocity, so that I can set realistic goals and track my pace of improvement.

#### Acceptance Criteria

1. THE Learning Velocity Component SHALL calculate exercises completed per week based on the Exercise History System
2. THE Learning Velocity Component SHALL display average exercises per week for the selected time range
3. THE Learning Velocity Component SHALL compare current week's activity to the average and display a percentage difference
4. THE Learning Velocity Component SHALL display a mini bar chart showing weekly exercise counts for the past 4 weeks
5. WHERE the learner's current week activity is below average, THE Learning Velocity Component SHALL display an encouraging message to maintain consistency

### Requirement 10: Hints Usage Analysis

**User Story:** As a learner, I want to understand my hint usage patterns, so that I can work towards becoming more independent in my translations.

#### Acceptance Criteria

1. THE Hints Analysis Component SHALL calculate total hints used from the Exercise History System
2. THE Hints Analysis Component SHALL calculate average hints per exercise
3. THE Hints Analysis Component SHALL display a trend showing whether hint usage is increasing or decreasing over time
4. THE Hints Analysis Component SHALL compare hint usage in recent exercises (last 10) to overall average
5. WHERE hint usage is decreasing, THE Hints Analysis Component SHALL display a congratulatory message acknowledging improved independence

### Requirement 11: Responsive Dashboard Layout

**User Story:** As a learner using different devices, I want the dashboard to adapt to my screen size, so that I can access my analytics on mobile, tablet, or desktop.

#### Acceptance Criteria

1. THE Dashboard SHALL use a responsive grid layout that adapts to screen width
2. WHEN viewed on mobile devices (width < 768px), THE Dashboard SHALL display widgets in a single column layout
3. WHEN viewed on tablet devices (width 768px-1024px), THE Dashboard SHALL display widgets in a two-column layout
4. WHEN viewed on desktop devices (width > 1024px), THE Dashboard SHALL display widgets in a three-column layout where appropriate
5. THE Dashboard SHALL ensure all interactive elements have touch-friendly sizes (minimum 44x44px) on mobile devices

### Requirement 12: Data Export and Reporting

**User Story:** As a learner, I want to export my detailed exercise history and analytics, so that I can track my progress externally or share it with instructors.

#### Acceptance Criteria

1. THE Dashboard SHALL provide an "Export Data" button that triggers data export functionality
2. WHEN the learner clicks "Export Data", THE Dashboard SHALL generate a JSON file containing all exercise history records and calculated statistics
3. THE exported file SHALL include exercise completions, scores, timestamps, sentence attempts, and penalty metrics
4. THE Dashboard SHALL name the exported file with the format "daily-english-history-YYYY-MM-DD.json"
5. THE Dashboard SHALL trigger a browser download of the exported file
