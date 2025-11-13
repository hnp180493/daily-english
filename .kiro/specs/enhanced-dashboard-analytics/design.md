# Design Document: Enhanced Dashboard Analytics

## Overview

This design document outlines the architecture and implementation approach for enhancing the learning dashboard with rich, data-driven analytics powered by the Supabase `user_exercise_history` table. The enhanced dashboard will provide learners with comprehensive insights into their practice patterns, performance trends, weak areas, and productivity metrics.

### Goals

1. Replace placeholder/limited analytics with real data from Supabase exercise history
2. Provide actionable insights that help learners improve their translation skills
3. Create engaging visualizations that motivate consistent practice
4. Maintain responsive design across all device sizes
5. Ensure performance with efficient data queries and caching

### Non-Goals

- Real-time collaborative features
- Social comparison features (leaderboards, friend comparisons)
- Predictive AI recommendations (future enhancement)
- Gamification beyond existing achievement system

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Dashboard Component                      │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Time Range Selector (7d, 30d, 90d, all)              │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌──────────────────┐  ┌──────────────────┐                │
│  │  Enhanced        │  │  Practice Stats  │                │
│  │  Activity        │  │  Widget          │                │
│  │  Heatmap         │  │                  │                │
│  └──────────────────┘  └──────────────────┘                │
│                                                              │
│  ┌──────────────────┐  ┌──────────────────┐                │
│  │  Performance     │  │  Weak Areas      │                │
│  │  Trend Chart     │  │  Analysis        │                │
│  └──────────────────┘  └──────────────────┘                │
│                                                              │
│  ┌──────────────────┐  ┌──────────────────┐                │
│  │  Time-of-Day     │  │  Best            │                │
│  │  Analysis        │  │  Performances    │                │
│  └──────────────────┘  └──────────────────┘                │
│                                                              │
│  ┌──────────────────┐  ┌──────────────────┐                │
│  │  Most Practiced  │  │  Learning        │                │
│  │  Exercises       │  │  Velocity        │                │
│  └──────────────────┘  └──────────────────┘                │
│                                                              │
│  ┌──────────────────┐  ┌──────────────────┐                │
│  │  Hints Usage     │  │  Recent History  │                │
│  │  Analysis        │  │  Timeline        │                │
│  └──────────────────┘  └──────────────────┘                │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│              Enhanced Analytics Service                      │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  - computeHistoryAnalytics()                           │ │
│  │  - calculatePerformanceTrends()                        │ │
│  │  - identifyWeakAreas()                                 │ │
│  │  - analyzeTimeOfDayProductivity()                      │ │
│  │  - calculateLearningVelocity()                         │ │
│  │  - analyzeHintsUsage()                                 │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│           Exercise History Service (Existing)                │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  - getRecentHistory(limit)                             │ │
│  │  - getStatistics()                                     │ │
│  │  - getActivityTimeline(startDate, endDate)            │ │
│  │  - getExerciseHistory(exerciseId)                     │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│              Supabase Database Service                       │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  - loadRecentHistory(userId, limit)                    │ │
│  │  - loadHistoryForDateRange(userId, start, end)        │ │
│  │  - loadExerciseHistory(userId, exerciseId)            │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                  Supabase PostgreSQL                         │
│              user_exercise_history table                     │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

1. **Dashboard Component** requests analytics data based on selected time range
2. **Enhanced Analytics Service** fetches raw history data from Exercise History Service
3. **Exercise History Service** queries Supabase Database Service
4. **Supabase Database Service** executes SQL queries against PostgreSQL
5. Raw data flows back up the chain, being transformed at each layer
6. **Enhanced Analytics Service** computes derived metrics and insights
7. **Dashboard Component** receives computed analytics and renders widgets

## Components and Interfaces

### 1. Enhanced Analytics Service

**Purpose**: Compute comprehensive analytics from exercise history data

**Location**: `src/app/services/enhanced-analytics.service.ts`

**Key Methods**:

```typescript
interface EnhancedAnalyticsService {
  // Main analytics computation
  computeHistoryAnalytics(
    historyRecords: ExerciseHistoryRecord[],
    timeRange: TimeRange
  ): Observable<EnhancedAnalyticsData>;

  // Performance trends
  calculatePerformanceTrends(
    records: ExerciseHistoryRecord[]
  ): PerformanceTrendData;

  // Weak areas identification
  identifyWeakAreas(
    records: ExerciseHistoryRecord[]
  ): WeakAreaData[];

  // Time-of-day analysis
  analyzeTimeOfDayProductivity(
    records: ExerciseHistoryRecord[]
  ): TimeOfDayData;

  // Learning velocity
  calculateLearningVelocity(
    records: ExerciseHistoryRecord[]
  ): LearningVelocityData;

  // Hints usage analysis
  analyzeHintsUsage(
    records: ExerciseHistoryRecord[]
  ): HintsAnalysisData;

  // Best performances
  getBestPerformances(
    records: ExerciseHistoryRecord[],
    limit: number
  ): BestPerformanceData[];

  // Most practiced
  getMostPracticed(
    records: ExerciseHistoryRecord[],
    limit: number
  ): MostPracticedData[];
}
```

### 2. Enhanced Activity Heatmap Component

**Purpose**: Display calendar-style activity visualization with real history data

**Location**: `src/app/components/dashboard/activity-heatmap/activity-heatmap.ts`

**Updates**:
- Replace current data source with Exercise History Service
- Add total time spent to day details
- Show hints used in day details
- Display average score with color coding
- Add loading states

**Inputs**:
```typescript
historyRecords = input.required<ExerciseHistoryRecord[]>();
timeRange = input<TimeRange>('30d');
```

**Key Features**:
- Calendar grid with intensity levels (0-4)
- Click to view day details modal
- Streak calculation and display
- Responsive grid layout

### 3. Practice Stats Widget Component

**Purpose**: Display comprehensive practice statistics

**Location**: `src/app/components/dashboard/practice-stats-widget/practice-stats-widget.ts`

**Updates**:
- Add trend indicators (↑ improving, → stable, ↓ declining)
- Display total time spent
- Show hints usage statistics
- Add comparison to previous period

**Displayed Metrics**:
- Total exercises completed
- Average accuracy score (with trend)
- Total time spent (hours:minutes)
- Average time per exercise
- Total hints used
- Trend indicator (requires ≥5 exercises)

### 4. Performance Trend Chart Component

**Purpose**: Visualize performance changes over time

**Location**: `src/app/components/dashboard/performance-trend-chart/performance-trend-chart.ts`

**New Component** - Creates line chart showing:
- Daily average scores
- Trend line (linear regression)
- Time range selector integration
- Minimum 3 days of data required

**Chart Library**: Use existing charting solution or implement with SVG/Canvas

### 5. Weak Areas Analysis Component

**Purpose**: Identify and display challenging sentence patterns

**Location**: `src/app/components/dashboard/weak-areas-analysis/weak-areas-analysis.ts`

**New Component** - Displays:
- Top 3 weak areas (requires ≥10 exercises)
- Average accuracy for each area
- Average retry count
- Actionable recommendations
- Example sentences on click

**Analysis Logic**:
- Parse sentence attempts from history
- Group by patterns (grammar structures, vocabulary themes)
- Calculate average accuracy per pattern
- Identify lowest-scoring patterns

### 6. Time-of-Day Analysis Component

**Purpose**: Show productivity patterns by time of day

**Location**: `src/app/components/dashboard/time-of-day-analysis/time-of-day-analysis.ts`

**New Component** - Displays:
- 4 time periods (morning, afternoon, evening, night)
- Exercise count per period
- Average accuracy per period
- Highlight most productive period (requires ≥20 exercises)

**Visualization**: Bar chart or radial chart

### 7. Best Performances Component

**Purpose**: Showcase top scoring exercises

**Location**: `src/app/components/dashboard/best-performances/best-performances.ts`

**New Component** - Displays:
- Top 5 highest scores
- Exercise ID, score, date, time spent
- Click to navigate to exercise
- Medal icons for top 3

### 8. Most Practiced Component

**Purpose**: Show most frequently practiced exercises

**Location**: `src/app/components/dashboard/most-practiced/most-practiced.ts`

**New Component** - Displays:
- Top 5 by attempt count
- Exercise ID, attempt count, average score
- Improvement indicator (first vs. recent)
- Click to navigate to exercise

### 9. Learning Velocity Component

**Purpose**: Track practice frequency and consistency

**Location**: `src/app/components/dashboard/learning-velocity/learning-velocity.ts`

**New Component** - Displays:
- Exercises per week (average)
- Current week vs. average (percentage)
- Mini bar chart (last 4 weeks)
- Encouragement message if below average

### 10. Hints Usage Analysis Component

**Purpose**: Track hint dependency and improvement

**Location**: `src/app/components/dashboard/hints-usage-analysis/hints-usage-analysis.ts`

**New Component** - Displays:
- Total hints used
- Average hints per exercise
- Trend (increasing/decreasing)
- Recent vs. overall comparison
- Congratulatory message if decreasing

## Data Models

### Enhanced Analytics Data Model

**Location**: `src/app/models/enhanced-analytics.model.ts`

```typescript
export interface EnhancedAnalyticsData {
  // Performance trends
  performanceTrends: PerformanceTrendData;
  
  // Weak areas
  weakAreas: WeakAreaData[];
  
  // Time-of-day analysis
  timeOfDayAnalysis: TimeOfDayData;
  
  // Learning velocity
  learningVelocity: LearningVelocityData;
  
  // Hints usage
  hintsAnalysis: HintsAnalysisData;
  
  // Best performances
  bestPerformances: BestPerformanceData[];
  
  // Most practiced
  mostPracticed: MostPracticedData[];
  
  // Activity heatmap (enhanced)
  activityHeatmap: EnhancedHeatmapData;
  
  // Practice statistics
  practiceStats: PracticeStatsData;
}

export interface PerformanceTrendData {
  dailyAverages: {
    date: string; // YYYY-MM-DD
    averageScore: number;
    exerciseCount: number;
  }[];
  trendDirection: 'improving' | 'stable' | 'declining';
  trendSlope: number; // Linear regression slope
  overallAverage: number;
}

export interface WeakAreaData {
  pattern: string; // e.g., "Passive voice", "Past perfect tense"
  averageAccuracy: number;
  averageRetryCount: number;
  occurrenceCount: number;
  recommendation: string;
  exampleSentences: {
    original: string;
    userTranslation: string;
    accuracyScore: number;
  }[];
}

export interface TimeOfDayData {
  periods: {
    name: 'morning' | 'afternoon' | 'evening' | 'night';
    displayName: string;
    timeRange: string; // e.g., "6:00 AM - 12:00 PM"
    exerciseCount: number;
    averageAccuracy: number;
    isMostProductive: boolean;
  }[];
}

export interface LearningVelocityData {
  averageExercisesPerWeek: number;
  currentWeekCount: number;
  percentageDifference: number; // Current week vs. average
  weeklyBreakdown: {
    weekLabel: string; // e.g., "Week of Jan 1"
    exerciseCount: number;
  }[];
}

export interface HintsAnalysisData {
  totalHintsUsed: number;
  averageHintsPerExercise: number;
  trend: 'increasing' | 'stable' | 'decreasing';
  recentAverage: number; // Last 10 exercises
  overallAverage: number;
  percentageChange: number;
}

export interface BestPerformanceData {
  exerciseId: string;
  score: number;
  completedAt: Date;
  timeSpentSeconds: number;
  rank: number; // 1-5
}

export interface MostPracticedData {
  exerciseId: string;
  attemptCount: number;
  averageScore: number;
  firstAttemptScore: number;
  recentAttemptScore: number;
  improvementPercentage: number;
}

export interface EnhancedHeatmapData {
  weeks: {
    weekNumber: number;
    days: {
      date: string; // YYYY-MM-DD
      exerciseCount: number;
      intensity: 0 | 1 | 2 | 3 | 4;
      averageScore: number;
      totalTimeSpentSeconds: number;
      totalHintsUsed: number;
      exercises: {
        id: string;
        score: number;
        timestamp: Date;
      }[];
    }[];
  }[];
  currentStreak: number;
  longestStreak: number;
}

export interface PracticeStatsData {
  totalExercisesCompleted: number;
  averageAccuracy: number;
  totalTimeSpentMinutes: number;
  averageTimePerExercise: number;
  totalHintsUsed: number;
  trend: 'improving' | 'stable' | 'declining' | null;
  recentAverage: number; // Last 10 exercises
  overallAverage: number;
}
```

## Error Handling

### Error Scenarios

1. **No Exercise History**
   - Display empty state with call-to-action
   - Message: "Complete exercises to see your analytics"
   - Button: "Start Practicing"

2. **Insufficient Data for Analysis**
   - Show partial analytics with explanatory messages
   - Example: "Complete 10 more exercises to see weak areas analysis"
   - Display progress indicator (e.g., "7/10 exercises completed")

3. **Database Query Failures**
   - Log error to console
   - Display user-friendly error message
   - Provide retry button
   - Fall back to cached data if available

4. **Network Errors**
   - Show offline indicator
   - Cache last successful analytics
   - Auto-retry when connection restored

### Error Handling Strategy

```typescript
// In Enhanced Analytics Service
computeHistoryAnalytics(records, timeRange): Observable<EnhancedAnalyticsData> {
  return this.exerciseHistoryService.getActivityTimeline(startDate, endDate).pipe(
    map(records => this.transformToAnalytics(records)),
    catchError(error => {
      console.error('[EnhancedAnalytics] Failed to compute analytics:', error);
      // Return empty analytics structure
      return of(this.getEmptyAnalytics());
    }),
    retry({ count: 2, delay: 1000 }) // Retry twice with 1s delay
  );
}
```

## Testing Strategy

### Unit Tests

1. **Enhanced Analytics Service**
   - Test each analytics computation method independently
   - Mock Exercise History Service
   - Verify calculations with known data sets
   - Test edge cases (empty data, single record, etc.)

2. **Component Tests**
   - Test rendering with various data states
   - Test user interactions (clicks, time range changes)
   - Test responsive behavior
   - Test accessibility (ARIA labels, keyboard navigation)

### Integration Tests

1. **Dashboard Integration**
   - Test data flow from service to components
   - Test time range selector affecting all widgets
   - Test navigation from widgets to exercise pages

2. **Database Integration**
   - Test Supabase queries with test data
   - Verify date range filtering
   - Test performance with large datasets

### Test Data

Create test fixtures with:
- Varied exercise completion dates
- Different score ranges
- Multiple time-of-day patterns
- Various hint usage patterns
- Sentence attempts with different accuracy levels

### Performance Testing

1. **Query Performance**
   - Test with 100, 500, 1000 history records
   - Measure query execution time
   - Optimize indexes if needed

2. **Rendering Performance**
   - Test dashboard load time
   - Measure time to interactive
   - Test scroll performance with large datasets

3. **Memory Usage**
   - Monitor memory consumption with large datasets
   - Test for memory leaks on time range changes

## Implementation Phases

### Phase 1: Foundation (Core Infrastructure)
- Create Enhanced Analytics Service
- Define all data models
- Update Exercise History Service if needed
- Set up error handling patterns

### Phase 2: Enhanced Existing Components
- Update Activity Heatmap with real data
- Update Practice Stats Widget
- Update Recent History Widget
- Test integration with existing dashboard

### Phase 3: New Analytics Components
- Implement Performance Trend Chart
- Implement Weak Areas Analysis
- Implement Time-of-Day Analysis
- Test new components independently

### Phase 4: Additional Insights
- Implement Best Performances
- Implement Most Practiced
- Implement Learning Velocity
- Implement Hints Usage Analysis

### Phase 5: Polish and Optimization
- Responsive design refinements
- Performance optimization
- Accessibility improvements
- User testing and feedback

### Phase 6: Data Export Enhancement
- Update export functionality to include new analytics
- Add export format options (JSON, CSV)
- Test export with large datasets

## Performance Considerations

### Data Caching

```typescript
// Cache analytics for 5 minutes
private analyticsCache = new Map<string, {
  data: EnhancedAnalyticsData;
  timestamp: number;
}>();

private getCacheKey(userId: string, timeRange: TimeRange): string {
  return `${userId}-${timeRange}`;
}

private getCachedAnalytics(userId: string, timeRange: TimeRange): EnhancedAnalyticsData | null {
  const key = this.getCacheKey(userId, timeRange);
  const cached = this.analyticsCache.get(key);
  
  if (!cached) return null;
  
  const age = Date.now() - cached.timestamp;
  if (age > 5 * 60 * 1000) { // 5 minutes
    this.analyticsCache.delete(key);
    return null;
  }
  
  return cached.data;
}
```

### Query Optimization

1. **Use Indexes**: Ensure `user_exercise_history` table has proper indexes
   - `idx_user_exercise_history_user_id` (existing)
   - `idx_user_exercise_history_completed_at` (existing)

2. **Limit Data Fetching**: Only fetch data for selected time range
   - Don't load all history for "7d" view
   - Use date range queries efficiently

3. **Lazy Loading**: Load widgets progressively
   - Load critical widgets first (heatmap, stats)
   - Lazy load secondary widgets (weak areas, time-of-day)

### Rendering Optimization

1. **OnPush Change Detection**: All components use `ChangeDetectionStrategy.OnPush`
2. **Virtual Scrolling**: Use for long lists (if needed)
3. **Memoization**: Cache computed values with `computed()` signals
4. **Debounce**: Debounce time range selector changes

## Accessibility

### WCAG AA Compliance

1. **Keyboard Navigation**
   - All interactive elements accessible via keyboard
   - Logical tab order
   - Visible focus indicators

2. **Screen Reader Support**
   - Proper ARIA labels on all widgets
   - ARIA live regions for dynamic updates
   - Descriptive alt text for visualizations

3. **Color Contrast**
   - Minimum 4.5:1 contrast ratio for text
   - Don't rely solely on color for information
   - Provide patterns/icons in addition to colors

4. **Responsive Text**
   - Support browser zoom up to 200%
   - Use relative units (rem, em)
   - Ensure text doesn't overflow containers

### Accessibility Features

```typescript
// Example: Activity Heatmap cell
<div 
  class="heatmap-cell"
  [attr.aria-label]="getAccessibleLabel(day)"
  role="button"
  tabindex="0"
  (click)="showDayDetails(day)"
  (keydown.enter)="showDayDetails(day)"
  (keydown.space)="showDayDetails(day)">
</div>

getAccessibleLabel(day: HeatmapDay): string {
  return `${day.date}: ${day.count} exercises completed with average score ${day.averageScore}%`;
}
```

## Security Considerations

1. **Data Access**: All queries filtered by authenticated user ID
2. **RLS Policies**: Supabase RLS ensures users only see their own data
3. **Input Validation**: Validate time range selections
4. **XSS Prevention**: Sanitize any user-generated content in exports
5. **Rate Limiting**: Consider rate limiting for export functionality

## Migration Strategy

### Backward Compatibility

- Maintain existing analytics service for legacy data
- Gradually transition widgets to new service
- Support both old and new data sources during transition
- Provide migration utility if needed

### Data Migration

- No data migration needed (new table already populated)
- Existing `exerciseHistory` in `UserProgress` can coexist
- New analytics pull from `user_exercise_history` table
- Old analytics remain available as fallback

## Future Enhancements

1. **Predictive Analytics**: ML-based predictions for optimal practice times
2. **Personalized Recommendations**: AI-suggested exercises based on weak areas
3. **Goal Setting**: Allow users to set and track custom goals
4. **Comparative Analytics**: Compare performance across difficulty levels
5. **Export Formats**: Add CSV, PDF export options
6. **Sharing**: Allow users to share achievements on social media
7. **Coaching Insights**: Detailed feedback for instructors/tutors
