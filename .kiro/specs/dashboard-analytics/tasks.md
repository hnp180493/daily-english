# Implementation Plan

- [x] 1. Set up project dependencies and data models





  - Install Chart.js and date-fns libraries via npm
  - Create analytics.model.ts with AnalyticsData, ExportData, and related interfaces
  - _Requirements: 1.1, 2.1, 3.1, 4.1, 5.1, 6.1, 7.1, 8.1, 10.1_

- [x] 2. Implement AnalyticsService with core computation methods




- [x] 2.1 Create analytics.service.ts with caching mechanism

  - Implement service with Map-based cache and cache key generation
  - Add cache expiration logic (5 minute timeout)
  - _Requirements: 9.3_


- [x] 2.2 Implement score trends computation

  - Write computeScoreTrends() method to extract dates and scores from UserProgress
  - Calculate average score and format data for line chart
  - Handle time range filtering (7d, 30d, 90d, all)
  - _Requirements: 1.1, 1.5_



- [x] 2.3 Implement category and difficulty aggregation
  - Write aggregateCategoryStats() to count exercises by category
  - Write analyzeDifficultyDistribution() for pie chart data
  - Calculate percentages and sort by count

  - _Requirements: 2.1, 2.3, 2.5, 3.1, 3.2_


- [x] 2.4 Implement performance analysis methods
  - Write extractTopErrors() to parse feedback and rank error types
  - Write calculateCategoryAccuracy() to compute average scores per category

  - Write computeDifficultyComparison() with advancement logic
  - _Requirements: 4.1, 4.2, 5.1, 5.2, 5.3, 8.1, 8.2, 8.3_


- [x] 2.5 Implement activity heatmap generation
  - Write generateActivityHeatmap() to create 90-day calendar data

  - Calculate intensity levels (0-4) based on exercise count
  - Compute current streak and longest streak
  - _Requirements: 6.1, 6.2, 6.5_

- [x] 2.6 Implement vocabulary statistics extraction

  - Write extractVocabularyStats() to parse vocabulary from feedback
  - Generate word cloud data with frequency and size calculations
  - Identify words needing review based on error patterns

  - _Requirements: 7.1, 7.2, 7.3, 7.5_

- [x] 2.7 Implement export functionality

  - Write exportProgressData() to generate ExportData structure
  - Add metadata with timestamp and version info
  - _Requirements: 10.1, 10.4, 10.5_

- [x] 2.8 Write unit tests for AnalyticsService


  - Test score trends computation with various date ranges
  - Test category and difficulty aggregation
  - Test error extraction and ranking
  - Test heatmap generation and streak calculation
  - Test vocabulary extraction
  - Test empty data handling
  - _Requirements: All_

- [-] 3. Create DashboardComponent and routing

- [x] 3.1 Create dashboard component with lazy loading


  - Generate dashboard.ts, dashboard.html, dashboard.scss
  - Configure standalone component with required imports
  - Add route to app.routes.ts with lazy loading
  - _Requirements: 9.5_

- [x] 3.2 Implement dashboard signals and computed state

  - Create userProgress signal using toSignal from ProgressService
  - Create analytics computed signal using AnalyticsService
  - Add isLoading and selectedTimeRange signals
  - Implement hasEnoughData computed for empty state logic
  - _Requirements: 1.3, 2.4, 9.2_

- [x] 3.3 Implement dashboard template structure

  - Create header with title and action buttons (Export, Print)
  - Add empty state with message and link to exercises
  - Create dashboard grid layout for child components
  - Add loading skeleton for chart areas
  - _Requirements: 9.2, 10.2, 10.3_

- [x] 3.4 Implement export and print functionality

  - Write exportData() method to generate JSON blob and trigger download
  - Write printReport() method to trigger browser print
  - Add print-specific CSS styles
  - _Requirements: 10.1, 10.2, 10.3_

- [x] 3.5 Style dashboard with Tailwind and custom SCSS

  - Create responsive grid layout
  - Style header and action buttons
  - Style empty state
  - Add print media queries
  - _Requirements: All_

- [ ] 3.6 Write unit tests for DashboardComponent
  - Test empty state display
  - Test chart rendering with data
  - Test export functionality
  - Test print functionality
  - _Requirements: All_

- [-] 4. Create ProgressChartsComponent with Chart.js integration

- [x] 4.1 Create progress-charts component


  - Generate progress-charts.ts, progress-charts.html, progress-charts.scss
  - Configure standalone component with Chart.js imports
  - Add analytics input signal
  - _Requirements: 1.1, 2.1, 3.1_

- [x] 4.2 Implement score trend line chart

  - Register Chart.js components
  - Create canvas element and chart configuration
  - Implement line chart with scores and average line
  - Add tooltip with date and score formatting
  - Handle click events for navigation
  - _Requirements: 1.1, 1.2, 1.4, 1.5_

- [x] 4.3 Implement category distribution bar chart

  - Create horizontal bar chart configuration
  - Sort categories by count in descending order
  - Implement onClick handler to navigate to filtered exercise list
  - _Requirements: 2.1, 2.2, 2.3_

- [x] 4.4 Implement difficulty breakdown pie chart

  - Create pie chart with three segments (Beginner, Intermediate, Advanced)
  - Use theme colors (green, yellow, red)
  - Add hover tooltips with percentage
  - Implement onClick handler to navigate to filtered difficulty
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 4.5 Add empty state handling for charts

  - Display messages when insufficient data
  - Show partial charts with notices
  - _Requirements: 1.3, 2.4_

- [x] 4.6 Style charts with responsive design

  - Create chart containers with proper sizing
  - Add responsive breakpoints
  - Style chart legends and labels
  - _Requirements: All_

- [ ] 4.7 Write unit tests for ProgressChartsComponent
  - Test chart initialization
  - Test data binding
  - Test click handlers
  - Test empty states
  - _Requirements: All_

- [-] 5. Create PerformanceAnalysisComponent

- [x] 5.1 Create performance-analysis component


  - Generate performance-analysis.ts, performance-analysis.html, performance-analysis.scss
  - Configure standalone component
  - Add analytics input signal
  - _Requirements: 4.1, 5.1, 8.1_

- [x] 5.2 Implement top errors list display

  - Create error list template with icons and descriptions
  - Display error count and percentage
  - Add empty state message
  - Implement getErrorIcon() helper method
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 5.3 Implement category accuracy table

  - Create table with category, exercise count, avg score, and status columns
  - Implement color coding (green > 80%, yellow 60-80%, red < 60%)
  - Add "Limited data" badge for single-exercise categories
  - Implement getAccuracyClass() and getPerformanceLabel() helpers
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 5.4 Implement difficulty comparison cards

  - Create card grid for each difficulty level
  - Display average score, exercise count, and completion rate
  - Add "Ready for next level" notice when criteria met (85% avg, 10+ exercises)
  - Show progress indicator for current level
  - Highlight current level card
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

- [x] 5.5 Style performance analysis section

  - Style error list with icons
  - Style accuracy table with color coding
  - Style difficulty comparison cards
  - Add responsive design
  - _Requirements: All_

- [ ] 5.6 Write unit tests for PerformanceAnalysisComponent
  - Test error list rendering
  - Test accuracy table rendering
  - Test difficulty comparison logic
  - Test helper methods
  - _Requirements: All_

- [-] 6. Create ActivityHeatmapComponent

- [x] 6.1 Create activity-heatmap component


  - Generate activity-heatmap.ts, activity-heatmap.html, activity-heatmap.scss
  - Configure standalone component
  - Add analytics input signal
  - _Requirements: 6.1_

- [x] 6.2 Implement heatmap grid rendering

  - Create 90-day calendar grid structure
  - Render weeks and days with proper layout
  - Apply intensity classes (0-4) based on exercise count
  - _Requirements: 6.1, 6.2_

- [x] 6.3 Implement heatmap interactivity

  - Add hover tooltips showing date and exercise count
  - Implement click handler to show day details
  - Create getTooltip() helper method
  - _Requirements: 6.3, 6.4_

- [x] 6.4 Implement streak statistics display

  - Display current streak with fire icon
  - Display longest streak with trophy icon
  - Style stat cards
  - _Requirements: 6.5_

- [x] 6.5 Style heatmap with GitHub-style design

  - Create grid layout with proper spacing
  - Define intensity colors (0: light gray, 1-4: shades of primary color)
  - Add legend with "Less" to "More" labels
  - Ensure responsive design
  - _Requirements: 6.1, 6.2_

- [ ] 6.6 Write unit tests for ActivityHeatmapComponent
  - Test heatmap rendering
  - Test intensity calculation
  - Test tooltip generation
  - Test click handlers
  - _Requirements: All_

- [-] 7. Create VocabularyStatsComponent

- [x] 7.1 Create vocabulary-stats component


  - Generate vocabulary-stats.ts, vocabulary-stats.html, vocabulary-stats.scss
  - Configure standalone component
  - Add analytics input signal
  - _Requirements: 7.1_

- [x] 7.2 Implement vocabulary counters

  - Display total words learned counter with book icon
  - Display words to review counter with refresh icon
  - Style counter cards
  - _Requirements: 7.2_

- [x] 7.3 Implement word cloud visualization

  - Render word cloud with variable font sizes based on frequency
  - Add hover tooltips showing occurrence count
  - Implement click handler to show word details (example sentences)
  - _Requirements: 7.3, 7.4_

- [x] 7.4 Implement review words list

  - Display list of words needing review with error counts
  - Add empty state message
  - _Requirements: 7.5_

- [x] 7.5 Style vocabulary section

  - Style counter cards
  - Style word cloud with proper spacing and colors
  - Style review list
  - Add responsive design
  - _Requirements: All_

- [ ] 7.6 Write unit tests for VocabularyStatsComponent
  - Test counter rendering
  - Test word cloud rendering
  - Test review list rendering
  - Test click handlers
  - _Requirements: All_

- [-] 8. Add dashboard navigation and integration

- [x] 8.1 Update main navigation to include dashboard link


  - Add dashboard link to header component
  - Add dashboard icon
  - _Requirements: All_

- [x] 8.2 Implement navigation from charts to filtered lists


  - Update ProgressChartsComponent to navigate with category/difficulty filters
  - Update exercise-list component to accept route query parameters
  - _Requirements: 2.2, 3.3_

- [ ] 8.3 Test end-to-end user flow
  - Test navigation from home to dashboard
  - Test chart interactions and navigation
  - Test export and print functionality
  - Verify all empty states
  - _Requirements: All_

- [-] 9. Performance optimization and accessibility

- [x] 9.1 Implement progressive chart rendering

  - Add setTimeout delays between chart renders
  - Render in order of importance (score trend → category → difficulty → heatmap)
  - _Requirements: 9.4_

- [x] 9.2 Verify caching and performance

  - Test computation time with 1000+ exercises
  - Verify cache is working correctly
  - Measure chart rendering times
  - _Requirements: 9.1, 9.3_

- [x] 9.3 Add ARIA labels and keyboard navigation

  - Add role and aria-label to all charts
  - Ensure all interactive elements are keyboard accessible
  - Test tab order
  - _Requirements: All_

- [ ] 9.4 Verify color contrast and accessibility
  - Run AXE accessibility scan
  - Verify color contrast ratios meet WCAG AA
  - Test with screen reader
  - _Requirements: All_

- [ ] 9.5 Write integration tests
  - Test data flow from ProgressService to Dashboard
  - Test chart interactions
  - Test navigation flows
  - Test export functionality
  - _Requirements: All_

- [-] 10. Documentation and final polish

- [x] 10.1 Update README with dashboard feature


  - Document dashboard features
  - Add screenshots
  - Document export format
  - _Requirements: All_

- [x] 10.2 Add inline code documentation

  - Add JSDoc comments to AnalyticsService methods
  - Document complex algorithms (intensity calculation, streak logic)
  - _Requirements: All_

- [x] 10.3 Final testing and bug fixes



  - Test with various data scenarios (empty, small, large datasets)
  - Test responsive design on mobile
  - Fix any remaining bugs
  - _Requirements: All_