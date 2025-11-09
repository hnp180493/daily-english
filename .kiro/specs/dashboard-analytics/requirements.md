# Requirements Document

## Introduction

The Dashboard & Analytics feature provides users with comprehensive insights into their English learning progress. This feature transforms raw exercise data into meaningful visualizations and statistics, helping learners understand their strengths, weaknesses, and overall improvement trajectory. The dashboard will display progress charts, performance analysis, activity heatmaps, and vocabulary statistics to create a complete picture of the user's learning journey.

## Glossary

- **Dashboard Component**: The main UI component that displays all analytics visualizations and statistics
- **Analytics Service**: The service responsible for aggregating and computing statistics from user exercise data
- **Progress Chart**: Visual representation of score trends over time using line charts
- **Activity Heatmap**: Calendar-style visualization showing daily exercise completion intensity
- **Performance Analysis**: Computed metrics identifying user strengths and weaknesses across categories and grammar topics
- **Vocabulary Stats**: Aggregated data about new words learned and words requiring review
- **LocalStorage**: Browser-based persistent storage containing user exercise history and progress data
- **Chart Library**: Third-party visualization library (Chart.js or Apache ECharts) for rendering interactive charts

## Requirements

### Requirement 1

**User Story:** As a learner, I want to see my score trends over time, so that I can track my improvement and identify patterns in my learning progress

#### Acceptance Criteria

1. WHEN the user navigates to the dashboard, THE Dashboard Component SHALL display a line chart showing accuracy scores plotted against completion dates for the last 30 days
2. WHEN the user hovers over a data point on the line chart, THE Dashboard Component SHALL display a tooltip containing the exact date, score percentage, and exercise title
3. WHEN the user has completed fewer than 2 exercises, THE Dashboard Component SHALL display a message stating "Complete more exercises to see your progress trends"
4. WHERE the user has completed exercises across multiple difficulty levels, THE Dashboard Component SHALL provide filter options to view scores by difficulty level separately
5. WHILE viewing the progress chart, THE Dashboard Component SHALL display the average score as a horizontal reference line with a label

### Requirement 2

**User Story:** As a learner, I want to see which exercise categories I've completed most, so that I can identify gaps in my practice coverage

#### Acceptance Criteria

1. WHEN the user views the dashboard, THE Dashboard Component SHALL display a bar chart showing the count of completed exercises grouped by category
2. WHEN the user clicks on a category bar, THE Dashboard Component SHALL navigate to the exercise list filtered by that category
3. THE Dashboard Component SHALL sort category bars in descending order by exercise count
4. WHEN the user has not completed any exercises, THE Dashboard Component SHALL display a message stating "Start practicing to see your category distribution"
5. THE Dashboard Component SHALL display the total number of unique categories practiced as a summary statistic

### Requirement 3

**User Story:** As a learner, I want to see a visual breakdown of exercises by difficulty level, so that I can ensure I'm challenging myself appropriately

#### Acceptance Criteria

1. WHEN the user views the dashboard, THE Dashboard Component SHALL display a pie chart showing the percentage distribution of completed exercises across Beginner, Intermediate, and Advanced difficulty levels
2. WHEN the user hovers over a pie chart segment, THE Dashboard Component SHALL display the difficulty level name, count, and percentage
3. WHEN the user clicks on a pie chart segment, THE Dashboard Component SHALL navigate to the exercise list filtered by that difficulty level
4. THE Dashboard Component SHALL use distinct colors for each difficulty level consistent with the application theme
5. WHEN all completed exercises are of the same difficulty level, THE Dashboard Component SHALL display a single-color pie chart with 100 percent label

### Requirement 4

**User Story:** As a learner, I want to see my top 5 most common errors, so that I can focus my study efforts on specific weaknesses

#### Acceptance Criteria

1. WHEN the user views the performance analysis section, THE Analytics Service SHALL identify and rank grammar error types by frequency across all exercise feedback
2. THE Dashboard Component SHALL display the top 5 error types as a ranked list with error count and percentage of total errors
3. WHEN the user has received fewer than 5 total errors, THE Dashboard Component SHALL display all unique error types without padding the list
4. WHEN the user has not received any grammar feedback, THE Dashboard Component SHALL display a message stating "No errors detected yet - keep practicing"
5. THE Dashboard Component SHALL display each error type with an icon and a brief description of the grammar rule

### Requirement 5

**User Story:** As a learner, I want to see my accuracy rate by category, so that I can identify which topics I excel at and which need more practice

#### Acceptance Criteria

1. WHEN the user views the performance analysis section, THE Analytics Service SHALL calculate the average accuracy score for each practiced category
2. THE Dashboard Component SHALL display categories sorted by accuracy rate in descending order
3. THE Dashboard Component SHALL use color coding to indicate performance levels: green for scores above 80 percent, yellow for 60 to 80 percent, and red for below 60 percent
4. WHEN a category has only one completed exercise, THE Dashboard Component SHALL display a badge indicating "Limited data"
5. THE Dashboard Component SHALL display the number of exercises completed for each category alongside the accuracy rate

### Requirement 6

**User Story:** As a learner, I want to see an activity heatmap of my practice sessions, so that I can visualize my consistency and identify inactive periods

#### Acceptance Criteria

1. WHEN the user views the dashboard, THE Dashboard Component SHALL display a calendar heatmap showing the last 90 days of activity
2. THE Dashboard Component SHALL use color intensity to represent the number of exercises completed each day, with darker colors indicating more activity
3. WHEN the user hovers over a calendar cell, THE Dashboard Component SHALL display a tooltip showing the date and exact number of exercises completed
4. WHEN the user clicks on a calendar cell with activity, THE Dashboard Component SHALL display a list of exercises completed on that date
5. THE Dashboard Component SHALL display the current streak count and longest streak count as summary statistics above the heatmap

### Requirement 7

**User Story:** As a learner, I want to see vocabulary statistics, so that I can track my vocabulary growth and identify words that need review

#### Acceptance Criteria

1. WHEN the user views the vocabulary stats section, THE Analytics Service SHALL extract and count unique vocabulary items from exercise feedback across all completed exercises
2. THE Dashboard Component SHALL display the total count of new vocabulary words encountered
3. THE Dashboard Component SHALL display a word cloud visualization of the 50 most frequently encountered vocabulary items, with size proportional to frequency
4. WHEN the user clicks on a word in the word cloud, THE Dashboard Component SHALL display example sentences from exercises where that word appeared
5. THE Dashboard Component SHALL display a list of vocabulary items marked as "needs review" based on repeated errors in exercises

### Requirement 8

**User Story:** As a learner, I want to compare my performance across difficulty levels, so that I can determine when I'm ready to advance

#### Acceptance Criteria

1. WHEN the user views the performance analysis section, THE Analytics Service SHALL calculate average scores separately for Beginner, Intermediate, and Advanced exercises
2. THE Dashboard Component SHALL display a comparison table showing average score, total exercises, and completion rate for each difficulty level
3. WHEN the user's average score for a difficulty level exceeds 85 percent and they have completed at least 10 exercises at that level, THE Dashboard Component SHALL display a recommendation to try the next difficulty level
4. THE Dashboard Component SHALL display a progress indicator showing how close the user is to the advancement threshold for their current level
5. THE Dashboard Component SHALL highlight the difficulty level with the most recent activity

### Requirement 9

**User Story:** As a learner, I want the dashboard to load quickly, so that I can access my statistics without delays

#### Acceptance Criteria

1. WHEN the user navigates to the dashboard, THE Analytics Service SHALL compute all statistics within 500 milliseconds for datasets containing up to 1000 completed exercises
2. THE Dashboard Component SHALL display a loading skeleton for chart areas while data is being computed
3. THE Analytics Service SHALL cache computed statistics in memory and invalidate the cache only when new exercise data is added
4. WHEN chart rendering takes longer than 200 milliseconds, THE Dashboard Component SHALL render charts progressively starting with the simplest visualizations
5. THE Dashboard Component SHALL lazy load chart libraries only when the dashboard route is activated

### Requirement 10

**User Story:** As a learner, I want to export my progress data, so that I can keep personal records or share achievements

#### Acceptance Criteria

1. WHEN the user clicks the export button on the dashboard, THE Dashboard Component SHALL generate a JSON file containing all computed statistics and raw exercise data
2. THE Dashboard Component SHALL trigger a browser download of the exported file with a filename format of "english-practice-stats-YYYY-MM-DD.json"
3. WHERE the user selects the "Print Report" option, THE Dashboard Component SHALL generate a print-friendly HTML view of all dashboard statistics
4. THE Dashboard Component SHALL include a timestamp and total exercise count in the exported data
5. THE exported JSON file SHALL be structured to allow re-import into the application for data portability
