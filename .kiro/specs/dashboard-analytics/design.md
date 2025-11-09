# Design Document: Dashboard & Analytics

## Overview

The Dashboard & Analytics feature transforms the English Practice application from a simple exercise platform into a comprehensive learning analytics system. This feature provides users with actionable insights through interactive visualizations, performance metrics, and trend analysis. The dashboard will serve as the central hub for users to understand their learning journey, identify areas for improvement, and celebrate achievements.

The design leverages the existing `ProgressService` and `UserProgress` data model, extending them with new analytics capabilities. We'll use Chart.js for visualizations due to its lightweight nature, excellent Angular integration, and rich feature set suitable for educational analytics.

## Architecture

### Component Hierarchy

```
DashboardComponent (new)
├── ProgressChartsComponent (new)
│   ├── ScoreTrendChart
│   ├── CategoryDistributionChart
│   └── DifficultyBreakdownChart
├── PerformanceAnalysisComponent (new)
│   ├── TopErrorsList
│   ├── CategoryAccuracyTable
│   └── DifficultyComparisonTable
├── ActivityHeatmapComponent (new)
└── VocabularyStatsComponent (new)
    ├── VocabularyCounters
    └── WordCloudVisualization
```

### Service Layer

```
AnalyticsService (new)
├── computeScoreTrends()
├── aggregateCategoryStats()
├── analyzeDifficultyDistribution()
├── extractTopErrors()
├── calculateCategoryAccuracy()
├── generateActivityHeatmap()
├── extractVocabularyStats()
└── exportProgressData()

ProgressService (existing - minor extensions)
├── getUserProgress() [existing]
├── recordAttempt() [existing]
└── getExerciseStatus() [existing]
```

### Data Flow

```
UserProgress (LocalStorage)
    ↓
ProgressService (Observable)
    ↓
AnalyticsService (Computed Signals)
    ↓
Dashboard Components (Reactive UI)
```

## Components and Interfaces

### 1. DashboardComponent

**Purpose**: Main container component that orchestrates all analytics visualizations

**Signals**:
```typescript
userProgress = toSignal(this.progressService.getUserProgress());
analytics = computed(() => this.analyticsService.computeAnalytics(this.userProgress()));
isLoading = signal(false);
selectedTimeRange = signal<'7d' | '30d' | '90d' | 'all'>('30d');
```

**Template Structure**:
```html
<div class="dashboard-container">
  <header class="dashboard-header">
    <h1>Your Learning Dashboard</h1>
    <div class="dashboard-actions">
      <button (click)="exportData()">Export Data</button>
      <button (click)="printReport()">Print Report</button>
    </div>
  </header>

  @if (hasEnoughData()) {
    <div class="dashboard-grid">
      <app-progress-charts [analytics]="analytics()" />
      <app-performance-analysis [analytics]="analytics()" />
      <app-activity-heatmap [analytics]="analytics()" />
      <app-vocabulary-stats [analytics]="analytics()" />
    </div>
  } @else {
    <div class="empty-state">
      <p>Complete more exercises to see your analytics</p>
      <a routerLink="/exercises">Start Practicing</a>
    </div>
  }
</div>
```

**Routing**:
- Path: `/dashboard`
- Lazy loaded for performance
- Accessible from main navigation

---

### 2. ProgressChartsComponent

**Purpose**: Displays score trends, category distribution, and difficulty breakdown

**Inputs**:
```typescript
analytics = input.required<AnalyticsData>();
```

**Chart Configurations**:

**Score Trend Chart (Line)**:
```typescript
{
  type: 'line',
  data: {
    labels: dates, // Last 30 days
    datasets: [{
      label: 'Accuracy Score',
      data: scores,
      borderColor: '#4F46E5',
      backgroundColor: 'rgba(79, 70, 229, 0.1)',
      tension: 0.4
    }, {
      label: 'Average',
      data: averageScores,
      borderColor: '#10B981',
      borderDash: [5, 5]
    }]
  },
  options: {
    responsive: true,
    plugins: {
      tooltip: {
        callbacks: {
          title: (context) => formatDate(context[0].label),
          label: (context) => `${context.dataset.label}: ${context.parsed.y}%`
        }
      }
    },
    scales: {
      y: {
        min: 0,
        max: 100,
        ticks: { callback: (value) => `${value}%` }
      }
    }
  }
}
```

**Category Distribution Chart (Bar)**:
```typescript
{
  type: 'bar',
  data: {
    labels: categoryNames,
    datasets: [{
      label: 'Exercises Completed',
      data: categoryCounts,
      backgroundColor: '#4F46E5'
    }]
  },
  options: {
    indexAxis: 'y', // Horizontal bars
    onClick: (event, elements) => {
      if (elements.length > 0) {
        const category = categoryNames[elements[0].index];
        this.navigateToCategory(category);
      }
    }
  }
}
```

**Difficulty Breakdown Chart (Pie)**:
```typescript
{
  type: 'pie',
  data: {
    labels: ['Beginner', 'Intermediate', 'Advanced'],
    datasets: [{
      data: [beginnerCount, intermediateCount, advancedCount],
      backgroundColor: ['#10B981', '#F59E0B', '#EF4444']
    }]
  },
  options: {
    onClick: (event, elements) => {
      if (elements.length > 0) {
        const difficulty = difficultyLevels[elements[0].index];
        this.navigateToDifficulty(difficulty);
      }
    }
  }
}
```

---

### 3. PerformanceAnalysisComponent

**Purpose**: Displays error analysis, category accuracy, and difficulty comparison

**Inputs**:
```typescript
analytics = input.required<AnalyticsData>();
```

**Template Structure**:
```html
<div class="performance-section">
  <h2>Performance Analysis</h2>
  
  <!-- Top Errors -->
  <div class="top-errors">
    <h3>Top 5 Common Errors</h3>
    @if (analytics().topErrors.length > 0) {
      <ul class="error-list">
        @for (error of analytics().topErrors; track error.type) {
          <li class="error-item">
            <span class="error-icon">{{ getErrorIcon(error.type) }}</span>
            <div class="error-details">
              <strong>{{ error.type }}</strong>
              <p>{{ error.description }}</p>
              <span class="error-count">{{ error.count }} occurrences ({{ error.percentage }}%)</span>
            </div>
          </li>
        }
      </ul>
    } @else {
      <p class="empty-message">No errors detected yet - keep practicing!</p>
    }
  </div>

  <!-- Category Accuracy -->
  <div class="category-accuracy">
    <h3>Accuracy by Category</h3>
    <table class="accuracy-table">
      <thead>
        <tr>
          <th>Category</th>
          <th>Exercises</th>
          <th>Avg Score</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        @for (cat of analytics().categoryAccuracy; track cat.category) {
          <tr [class]="getAccuracyClass(cat.avgScore)">
            <td>{{ cat.categoryName }}</td>
            <td>{{ cat.exerciseCount }}</td>
            <td>{{ cat.avgScore }}%</td>
            <td>
              <span class="status-badge" [class]="getAccuracyClass(cat.avgScore)">
                {{ getPerformanceLabel(cat.avgScore) }}
              </span>
              @if (cat.exerciseCount === 1) {
                <span class="limited-data-badge">Limited data</span>
              }
            </td>
          </tr>
        }
      </tbody>
    </table>
  </div>

  <!-- Difficulty Comparison -->
  <div class="difficulty-comparison">
    <h3>Performance by Difficulty</h3>
    <div class="comparison-grid">
      @for (diff of analytics().difficultyComparison; track diff.level) {
        <div class="difficulty-card" [class.recommended]="diff.readyToAdvance">
          <h4>{{ diff.levelName }}</h4>
          <div class="stat">
            <label>Average Score</label>
            <span class="value">{{ diff.avgScore }}%</span>
          </div>
          <div class="stat">
            <label>Exercises Completed</label>
            <span class="value">{{ diff.exerciseCount }}</span>
          </div>
          <div class="stat">
            <label>Completion Rate</label>
            <span class="value">{{ diff.completionRate }}%</span>
          </div>
          @if (diff.readyToAdvance) {
            <div class="advancement-notice">
              <span class="icon">🎓</span>
              <p>Ready for next level!</p>
            </div>
          }
          @if (diff.isCurrentLevel) {
            <div class="progress-indicator">
              <label>Progress to advancement</label>
              <div class="progress-bar">
                <div class="progress-fill" [style.width.%]="diff.advancementProgress"></div>
              </div>
              <span class="progress-text">{{ diff.advancementProgress }}%</span>
            </div>
          }
        </div>
      }
    </div>
  </div>
</div>
```

---

### 4. ActivityHeatmapComponent

**Purpose**: Visualizes daily practice consistency with a GitHub-style heatmap

**Inputs**:
```typescript
analytics = input.required<AnalyticsData>();
```

**Data Structure**:
```typescript
interface HeatmapDay {
  date: string; // YYYY-MM-DD
  count: number; // Exercise count
  intensity: 0 | 1 | 2 | 3 | 4; // Color intensity level
}

interface HeatmapWeek {
  days: HeatmapDay[];
}
```

**Template Structure**:
```html
<div class="heatmap-section">
  <h2>Activity Heatmap</h2>
  
  <div class="streak-stats">
    <div class="stat-card">
      <span class="icon">🔥</span>
      <div>
        <label>Current Streak</label>
        <strong>{{ analytics().currentStreak }} days</strong>
      </div>
    </div>
    <div class="stat-card">
      <span class="icon">🏆</span>
      <div>
        <label>Longest Streak</label>
        <strong>{{ analytics().longestStreak }} days</strong>
      </div>
    </div>
  </div>

  <div class="heatmap-container">
    <div class="heatmap-grid">
      @for (week of analytics().heatmapData; track week.weekNumber) {
        <div class="heatmap-week">
          @for (day of week.days; track day.date) {
            <div 
              class="heatmap-cell"
              [class.intensity-0]="day.intensity === 0"
              [class.intensity-1]="day.intensity === 1"
              [class.intensity-2]="day.intensity === 2"
              [class.intensity-3]="day.intensity === 3"
              [class.intensity-4]="day.intensity === 4"
              [title]="getTooltip(day)"
              (click)="showDayDetails(day)">
            </div>
          }
        </div>
      }
    </div>
    
    <div class="heatmap-legend">
      <span>Less</span>
      <div class="legend-cell intensity-0"></div>
      <div class="legend-cell intensity-1"></div>
      <div class="legend-cell intensity-2"></div>
      <div class="legend-cell intensity-3"></div>
      <div class="legend-cell intensity-4"></div>
      <span>More</span>
    </div>
  </div>
</div>
```

**Intensity Calculation**:
```typescript
calculateIntensity(count: number, maxCount: number): 0 | 1 | 2 | 3 | 4 {
  if (count === 0) return 0;
  const percentage = (count / maxCount) * 100;
  if (percentage <= 25) return 1;
  if (percentage <= 50) return 2;
  if (percentage <= 75) return 3;
  return 4;
}
```

---

### 5. VocabularyStatsComponent

**Purpose**: Displays vocabulary learning progress and word cloud

**Inputs**:
```typescript
analytics = input.required<AnalyticsData>();
```

**Template Structure**:
```html
<div class="vocabulary-section">
  <h2>Vocabulary Statistics</h2>
  
  <div class="vocab-counters">
    <div class="counter-card">
      <span class="icon">📚</span>
      <div>
        <label>New Words Learned</label>
        <strong>{{ analytics().vocabularyStats.totalWords }}</strong>
      </div>
    </div>
    <div class="counter-card">
      <span class="icon">🔄</span>
      <div>
        <label>Words to Review</label>
        <strong>{{ analytics().vocabularyStats.wordsToReview }}</strong>
      </div>
    </div>
  </div>

  <div class="word-cloud-container">
    <h3>Most Frequent Words</h3>
    <div class="word-cloud">
      @for (word of analytics().vocabularyStats.wordCloud; track word.text) {
        <span 
          class="word-cloud-item"
          [style.font-size.px]="word.size"
          [title]="word.frequency + ' occurrences'"
          (click)="showWordDetails(word)">
          {{ word.text }}
        </span>
      }
    </div>
  </div>

  <div class="review-list">
    <h3>Words Needing Review</h3>
    @if (analytics().vocabularyStats.reviewWords.length > 0) {
      <ul class="review-words">
        @for (word of analytics().vocabularyStats.reviewWords; track word.text) {
          <li class="review-word-item">
            <strong>{{ word.text }}</strong>
            <span class="error-count">{{ word.errorCount }} errors</span>
          </li>
        }
      </ul>
    } @else {
      <p class="empty-message">No words need review - great job!</p>
    }
  </div>
</div>
```

---

## Data Models

### AnalyticsData Interface

```typescript
export interface AnalyticsData {
  // Score Trends
  scoreTrends: {
    dates: string[];
    scores: number[];
    averageScore: number;
  };

  // Category Stats
  categoryDistribution: {
    category: ExerciseCategory;
    categoryName: string;
    count: number;
    percentage: number;
  }[];

  // Difficulty Breakdown
  difficultyBreakdown: {
    level: DifficultyLevel;
    levelName: string;
    count: number;
    percentage: number;
  }[];

  // Performance Analysis
  topErrors: {
    type: string;
    description: string;
    count: number;
    percentage: number;
  }[];

  categoryAccuracy: {
    category: ExerciseCategory;
    categoryName: string;
    exerciseCount: number;
    avgScore: number;
    totalAttempts: number;
  }[];

  difficultyComparison: {
    level: DifficultyLevel;
    levelName: string;
    avgScore: number;
    exerciseCount: number;
    completionRate: number;
    readyToAdvance: boolean;
    isCurrentLevel: boolean;
    advancementProgress: number;
  }[];

  // Activity Heatmap
  heatmapData: {
    weekNumber: number;
    days: {
      date: string;
      count: number;
      intensity: 0 | 1 | 2 | 3 | 4;
      exercises: string[]; // Exercise IDs
    }[];
  }[];
  currentStreak: number;
  longestStreak: number;

  // Vocabulary Stats
  vocabularyStats: {
    totalWords: number;
    wordsToReview: number;
    wordCloud: {
      text: string;
      frequency: number;
      size: number; // Font size in px
    }[];
    reviewWords: {
      text: string;
      errorCount: number;
      lastSeen: Date;
    }[];
  };

  // Export Data
  exportTimestamp: Date;
  totalExercises: number;
}
```

### ExportData Interface

```typescript
export interface ExportData {
  metadata: {
    exportDate: string;
    appVersion: string;
    totalExercises: number;
    dateRange: {
      from: string;
      to: string;
    };
  };
  analytics: AnalyticsData;
  rawProgress: UserProgress;
}
```

---

## Error Handling

### Data Validation

```typescript
// In AnalyticsService
private validateProgressData(progress: UserProgress | undefined): boolean {
  if (!progress || !progress.attempts || progress.attempts.length === 0) {
    return false;
  }
  return true;
}

// In DashboardComponent
hasEnoughData = computed(() => {
  const progress = this.userProgress();
  return progress && progress.attempts.length >= 2;
});
```

### Chart Rendering Errors

```typescript
// Wrap chart initialization in try-catch
private initializeChart(canvas: HTMLCanvasElement, config: ChartConfiguration): void {
  try {
    new Chart(canvas, config);
  } catch (error) {
    console.error('Failed to initialize chart:', error);
    this.showChartError.set(true);
  }
}
```

### Empty States

- **No data**: Show encouraging message with link to exercises
- **Insufficient data**: Show partial analytics with notice
- **Loading errors**: Show retry button with error message

---

## Testing Strategy

### Unit Tests

**AnalyticsService Tests**:
```typescript
describe('AnalyticsService', () => {
  it('should compute score trends correctly', () => {
    const mockProgress = createMockProgress();
    const trends = service.computeScoreTrends(mockProgress, '30d');
    expect(trends.dates.length).toBe(30);
    expect(trends.scores.length).toBe(30);
  });

  it('should handle empty progress data', () => {
    const emptyProgress = { attempts: [] };
    const trends = service.computeScoreTrends(emptyProgress, '30d');
    expect(trends.dates.length).toBe(0);
  });

  it('should calculate category accuracy correctly', () => {
    const mockProgress = createMockProgressWithCategories();
    const accuracy = service.calculateCategoryAccuracy(mockProgress);
    expect(accuracy[0].avgScore).toBeGreaterThan(0);
  });

  it('should extract top 5 errors', () => {
    const mockProgress = createMockProgressWithErrors();
    const errors = service.extractTopErrors(mockProgress);
    expect(errors.length).toBeLessThanOrEqual(5);
  });
});
```

**Component Tests**:
```typescript
describe('DashboardComponent', () => {
  it('should display empty state when no data', () => {
    component.userProgress.set({ attempts: [] });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.empty-state')).toBeTruthy();
  });

  it('should render charts when data is available', () => {
    component.userProgress.set(mockProgressWithData);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-progress-charts')).toBeTruthy();
  });

  it('should export data correctly', () => {
    spyOn(service, 'exportProgressData');
    component.exportData();
    expect(service.exportProgressData).toHaveBeenCalled();
  });
});
```

### Integration Tests

- Test data flow from ProgressService → AnalyticsService → Dashboard
- Test chart interactions (click, hover)
- Test navigation from charts to filtered exercise lists
- Test export functionality

### Performance Tests

- Measure computation time for 1000+ exercises
- Test chart rendering performance
- Test memory usage with large datasets
- Verify lazy loading works correctly

---

## Performance Optimization

### Computation Caching

```typescript
@Injectable({ providedIn: 'root' })
export class AnalyticsService {
  private cache = new Map<string, AnalyticsData>();
  private cacheTimeout = 5 * 60 * 1000; // 5 minutes

  computeAnalytics(progress: UserProgress): AnalyticsData {
    const cacheKey = this.generateCacheKey(progress);
    const cached = this.cache.get(cacheKey);
    
    if (cached && !this.isCacheExpired(cacheKey)) {
      return cached;
    }

    const analytics = this.performComputation(progress);
    this.cache.set(cacheKey, analytics);
    return analytics;
  }

  private generateCacheKey(progress: UserProgress): string {
    return `${progress.attempts.length}-${progress.lastActivityDate}`;
  }
}
```

### Lazy Loading

```typescript
// In app.routes.ts
{
  path: 'dashboard',
  loadComponent: () => import('./components/dashboard/dashboard').then(m => m.DashboardComponent)
}
```

### Chart.js Optimization

```typescript
// Use decimation plugin for large datasets
const chartConfig = {
  plugins: [{
    id: 'decimation',
    options: {
      enabled: true,
      algorithm: 'lttb', // Largest Triangle Three Buckets
      samples: 50
    }
  }]
};
```

### Progressive Rendering

```typescript
// Render charts in order of importance
ngAfterViewInit(): void {
  this.renderScoreTrendChart();
  setTimeout(() => this.renderCategoryChart(), 100);
  setTimeout(() => this.renderDifficultyChart(), 200);
  setTimeout(() => this.renderHeatmap(), 300);
}
```

---

## Accessibility

### ARIA Labels

```html
<div class="chart-container" role="img" aria-label="Score trend chart showing your progress over the last 30 days">
  <canvas #scoreChart></canvas>
</div>

<table class="accuracy-table" role="table" aria-label="Category accuracy statistics">
  <!-- Table content -->
</table>
```

### Keyboard Navigation

- All interactive elements (chart clicks, table rows) accessible via keyboard
- Tab order follows logical flow
- Enter/Space to activate clickable elements

### Color Contrast

- All text meets WCAG AA standards (4.5:1 ratio)
- Chart colors distinguishable for colorblind users
- Alternative patterns in addition to colors for heatmap

### Screen Reader Support

- Provide text alternatives for all visualizations
- Announce dynamic content changes
- Use semantic HTML (table, list, heading hierarchy)

---

## Implementation Notes

### Chart.js Integration

```typescript
// Install Chart.js
npm install chart.js

// Import in component
import { Chart, registerables } from 'chart.js';
Chart.register(...registerables);
```

### Date Handling

```typescript
// Use date-fns for date manipulation
npm install date-fns

import { format, subDays, eachDayOfInterval } from 'date-fns';
```

### Export Functionality

```typescript
exportData(): void {
  const exportData: ExportData = {
    metadata: {
      exportDate: new Date().toISOString(),
      appVersion: '1.0.0',
      totalExercises: this.userProgress().attempts.length,
      dateRange: {
        from: this.getFirstAttemptDate(),
        to: new Date().toISOString()
      }
    },
    analytics: this.analytics(),
    rawProgress: this.userProgress()
  };

  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `daily-english-stats-${format(new Date(), 'yyyy-MM-dd')}.json`;
  link.click();
  URL.revokeObjectURL(url);
}
```

### Print Functionality

```typescript
printReport(): void {
  window.print();
}

// Add print-specific styles in dashboard.scss
@media print {
  .dashboard-actions {
    display: none;
  }
  
  .dashboard-grid {
    display: block;
  }
  
  .chart-container {
    page-break-inside: avoid;
  }
}
```

---

## Migration Path

Since this is a new feature, no data migration is required. However, we should:

1. Ensure backward compatibility with existing `UserProgress` data
2. Add analytics computation on first dashboard visit
3. Cache results to avoid recomputation
4. Provide smooth loading experience

---

## Future Enhancements

1. **Comparison Mode**: Compare current period with previous period
2. **Goal Setting**: Allow users to set and track custom goals
3. **Insights AI**: Use AI to generate personalized insights
4. **Social Comparison**: Anonymous comparison with other learners
5. **Advanced Filters**: Filter analytics by date range, category, difficulty
6. **Custom Reports**: Allow users to create custom report templates
7. **Email Reports**: Send weekly/monthly progress reports via email

---

## Dependencies

### New Dependencies

```json
{
  "chart.js": "^4.4.0",
  "date-fns": "^3.0.0"
}
```

### Existing Dependencies (No Changes)

- Angular 20
- RxJS 7.8
- TypeScript 5.9
- Tailwind CSS 3.4

---

## File Structure

```
src/app/
├── components/
│   └── dashboard/
│       ├── dashboard.ts
│       ├── dashboard.html
│       ├── dashboard.scss
│       ├── progress-charts/
│       │   ├── progress-charts.ts
│       │   ├── progress-charts.html
│       │   └── progress-charts.scss
│       ├── performance-analysis/
│       │   ├── performance-analysis.ts
│       │   ├── performance-analysis.html
│       │   └── performance-analysis.scss
│       ├── activity-heatmap/
│       │   ├── activity-heatmap.ts
│       │   ├── activity-heatmap.html
│       │   └── activity-heatmap.scss
│       └── vocabulary-stats/
│           ├── vocabulary-stats.ts
│           ├── vocabulary-stats.html
│           └── vocabulary-stats.scss
├── services/
│   └── analytics.service.ts
└── models/
    └── analytics.model.ts
```

---

## Estimated Effort Breakdown

- **AnalyticsService**: 1.5 days
- **DashboardComponent**: 1 day
- **ProgressChartsComponent**: 1.5 days
- **PerformanceAnalysisComponent**: 1 day
- **ActivityHeatmapComponent**: 1 day
- **VocabularyStatsComponent**: 1 day
- **Styling & Responsive Design**: 1 day
- **Testing**: 1 day
- **Documentation**: 0.5 days

**Total**: 9.5 days (slightly higher than initial estimate due to comprehensive design)

---

## Success Metrics

- Dashboard loads in < 500ms for 1000 exercises
- All charts render in < 200ms each
- Zero accessibility violations (AXE scan)
- 100% test coverage for AnalyticsService
- Positive user feedback on insights usefulness
