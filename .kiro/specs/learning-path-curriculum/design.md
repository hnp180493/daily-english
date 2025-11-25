# Learning Path & Curriculum - Design Document

## Overview

The Learning Path & Curriculum feature provides a structured, adaptive learning journey that guides users from beginner to advanced English proficiency. The system combines predefined curriculum paths with AI-powered adaptive recommendations, daily challenges, streak tracking, and goal management to create an engaging and effective learning experience.

### Key Design Principles

1. **Progressive Difficulty**: Gradual increase in complexity with clear milestones
2. **Adaptive Learning**: AI-driven recommendations based on performance patterns
3. **Habit Formation**: Daily challenges and streak mechanics to build consistency
4. **Motivation Through Gamification**: Points, achievements, and visual progress tracking
5. **Translation Independence**: Progressive reduction of translation support to develop English thinking
6. **Data-Driven Insights**: Analytics to identify strengths and weaknesses

## Architecture

### High-Level Component Structure

```
┌─────────────────────────────────────────────────────────────┐
│                     Learning Path UI Layer                   │
├──────────────┬──────────────┬──────────────┬────────────────┤
│ Path Selector│ Daily        │ Progress     │ Goal           │
│ Component    │ Challenge    │ Dashboard    │ Tracker        │
│              │ Component    │ Component    │ Component      │
└──────────────┴──────────────┴──────────────┴────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Service Layer                             │
├──────────────┬──────────────┬──────────────┬────────────────┤
│ Curriculum   │ Adaptive     │ Streak       │ Notification   │
│ Service      │ Engine       │ Service      │ Service        │
│              │ Service      │              │                │
└──────────────┴──────────────┴──────────────┴────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Data Layer                                │
├──────────────┬──────────────┬──────────────┬────────────────┤
│ Learning Path│ User Progress│ Exercise     │ Database       │
│ Model        │ Model        │ Service      │ Service        │
└──────────────┴──────────────┴──────────────┴────────────────┘
```

### Data Flow

1. **User selects a learning path** → Curriculum Service loads path configuration
2. **Daily challenge generation** → Adaptive Engine analyzes progress → Selects appropriate exercise
3. **User completes exercise** → Progress Service updates → Streak Service checks → Database persists
4. **Weekly goal tracking** → Goal Tracker monitors → Notification Service alerts
5. **Path progression** → Curriculum Service unlocks next module → UI updates

## Components and Interfaces

### 1. Learning Path Selector Component

**Purpose**: Allow users to browse and select learning paths

**Location**: `src/app/components/learning-path/path-selector/path-selector.ts`

**Key Features**:
- Display three main paths (Beginner, Intermediate, Advanced)
- Show path details: duration, modules, current progress
- Visual indicators for locked/unlocked paths
- Path switching with confirmation dialog

**Template Structure**:
```html
<div class="path-selector">
  @for (path of paths; track path.id) {
    <div class="path-card" [class.locked]="!path.unlocked">
      <h3>{{ path.name }}</h3>
      <p>{{ path.duration }}</p>
      <div class="modules-preview">
        @for (module of path.modules; track module.id) {
          <span class="module-badge">{{ module.name }}</span>
        }
      </div>
      <button (click)="selectPath(path)">
        {{ path.unlocked ? 'Start Path' : 'Locked' }}
      </button>
    </div>
  }
</div>
```

### 2. Daily Challenge Component

**Purpose**: Display and manage daily challenges

**Location**: `src/app/components/learning-path/daily-challenge/daily-challenge.ts`

**Key Features**:
- Show today's challenge exercise
- Display streak counter with visual effects
- Countdown timer until challenge expires
- Quick start button to begin exercise
- Completion status indicator

**State Management**:
```typescript
interface DailyChallengeState {
  challenge: Exercise | null;
  isCompleted: boolean;
  currentStreak: number;
  timeRemaining: string;
  bonusMultiplier: number;
}
```

### 3. Progress Dashboard Component

**Purpose**: Comprehensive view of learning progress

**Location**: `src/app/components/learning-path/progress-dashboard/progress-dashboard.ts`

**Key Features**:
- Current path visualization with completion percentage
- Module progress timeline
- Performance analytics (charts and graphs)
- Translation dependency score
- Estimated completion date
- Recent activity feed

**Visualizations**:
- Progress bar for current path
- Module timeline with checkpoints
- Category performance radar chart
- Weekly activity heatmap
- Score trend line graph

### 4. Goal Tracker Component

**Purpose**: Set and monitor weekly learning goals

**Location**: `src/app/components/learning-path/goal-tracker/goal-tracker.ts`

**Key Features**:
- Goal setting interface (3-50 exercises/week)
- Progress ring visualization
- Motivational messages
- Goal achievement celebration
- Historical goal completion rate

**UI Elements**:
```typescript
interface GoalTrackerUI {
  currentGoal: number;
  completedThisWeek: number;
  progressPercentage: number;
  daysRemaining: number;
  onTrack: boolean;
}
```

## Data Models

### Learning Path Model

**Location**: `src/app/models/learning-path.model.ts`

```typescript
export interface LearningPath {
  id: string;
  name: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  duration: string; // e.g., "3 months"
  durationWeeks: number;
  description: string;
  modules: LearningModule[];
  unlockRequirement?: string; // e.g., "Complete Beginner Path"
}

export interface LearningModule {
  id: string;
  name: string;
  weekRange: string; // e.g., "Week 1-4"
  startWeek: number;
  endWeek: number;
  topics: string[];
  exerciseIds: string[];
  translationSupport: 'full' | 'partial' | 'minimal' | 'none';
  requiredScore?: number; // Minimum average score to unlock next module
}

export interface UserPathProgress {
  userId: string;
  currentPathId: string;
  currentModuleId: string;
  startDate: Date;
  completedModules: string[];
  moduleProgress: { [moduleId: string]: ModuleProgress };
  pathCompletions: PathCompletion[];
}

export interface ModuleProgress {
  moduleId: string;
  completedExercises: string[];
  averageScore: number;
  totalExercises: number;
  completionPercentage: number;
  unlocked: boolean;
}

export interface PathCompletion {
  pathId: string;
  completionDate: Date;
  finalScore: number;
  certificateId: string;
}
```

### Daily Challenge Model

```typescript
export interface DailyChallenge {
  id: string;
  userId: string;
  date: string; // ISO date string (YYYY-MM-DD)
  exerciseId: string;
  isCompleted: boolean;
  completedAt?: Date;
  score?: number;
  bonusPoints: number;
  isWeekendChallenge: boolean;
}

export interface StreakData {
  userId: string;
  currentStreak: number;
  longestStreak: number;
  lastActivityDate: string; // ISO date string
  streakMultiplier: number; // 1.0 or 1.5
  streakHistory: StreakHistoryEntry[];
}

export interface StreakHistoryEntry {
  date: string;
  maintained: boolean;
}
```

### Weekly Goal Model

```typescript
export interface WeeklyGoal {
  userId: string;
  weekStartDate: string; // ISO date string (Monday)
  targetExercises: number;
  completedExercises: number;
  isAchieved: boolean;
  bonusPointsEarned: number;
}

export interface GoalHistory {
  userId: string;
  goals: WeeklyGoal[];
  totalGoalsAchieved: number;
  achievementRate: number; // Percentage
}
```

### Adaptive Learning Model

```typescript
export interface AdaptiveRecommendation {
  exerciseId: string;
  confidence: number; // 0-1 score
  reason: RecommendationReason;
  priority: 'high' | 'medium' | 'low';
}

export enum RecommendationReason {
  WEAK_CATEGORY = 'weak-category',
  SEQUENTIAL_PROGRESSION = 'sequential',
  DIFFICULTY_INCREASE = 'difficulty-increase',
  REVIEW_NEEDED = 'review',
  DAILY_CHALLENGE = 'daily-challenge'
}

export interface PerformanceAnalysis {
  userId: string;
  categoryScores: { [category: string]: number };
  weakCategories: string[];
  strongCategories: string[];
  averageScore: number;
  recentTrend: 'improving' | 'stable' | 'declining';
  translationDependency: number; // 0-100 score
}
```

## Service Implementations

### 1. Curriculum Service

**Location**: `src/app/services/curriculum.service.ts`

**Responsibilities**:
- Load and manage learning path configurations
- Track user progress through paths and modules
- Unlock modules based on completion criteria
- Generate path completion certificates
- Persist path progress to database

**Key Methods**:
```typescript
class CurriculumService {
  // Path management
  getAllPaths(): Observable<LearningPath[]>
  getPathById(pathId: string): Observable<LearningPath>
  getUserCurrentPath(): Observable<LearningPath | null>
  selectPath(pathId: string): Observable<void>
  
  // Module management
  getCurrentModule(): Observable<LearningModule | null>
  unlockNextModule(): Observable<void>
  getModuleProgress(moduleId: string): Observable<ModuleProgress>
  
  // Progress tracking
  getUserPathProgress(): Observable<UserPathProgress>
  updateModuleProgress(moduleId: string, exerciseId: string, score: number): Observable<void>
  calculatePathCompletion(): Observable<number>
  
  // Completion and rewards
  completeModule(moduleId: string): Observable<void>
  completePath(pathId: string): Observable<PathCompletion>
  generateCertificate(pathId: string): Observable<string>
}
```

**Path Configuration Storage**:
- Static JSON files: `public/data/learning-paths/*.json`
- User progress: Supabase database

### 2. Adaptive Engine Service

**Location**: `src/app/services/adaptive-engine.service.ts`

**Responsibilities**:
- Analyze user performance patterns
- Generate personalized exercise recommendations
- Identify weak and strong areas
- Calculate translation dependency score
- Adjust difficulty based on performance

**Key Methods**:
```typescript
class AdaptiveEngineService {
  // Analysis
  analyzePerformance(): Observable<PerformanceAnalysis>
  identifyWeakCategories(): Observable<string[]>
  calculateTranslationDependency(): Observable<number>
  
  // Recommendations
  getNextRecommendedExercise(): Observable<AdaptiveRecommendation>
  getRecommendationsForCategory(category: string): Observable<AdaptiveRecommendation[]>
  shouldIncreaseDifficulty(): Observable<boolean>
  
  // Daily challenge generation
  generateDailyChallenge(): Observable<Exercise>
}
```

**Recommendation Algorithm**:
1. Check if user has < 5 exercises completed → Sequential from current module
2. Calculate category scores from last 10 exercises
3. If any category < 70% → Prioritize that category
4. If all categories > 85% → Suggest next difficulty level
5. Exclude exercises completed in last 30 days
6. Apply randomization within filtered set

### 3. Streak Service

**Location**: `src/app/services/streak.service.ts`

**Responsibilities**:
- Track daily activity streaks
- Calculate streak multipliers
- Manage streak history
- Send streak-related notifications

**Key Methods**:
```typescript
class StreakService {
  // Streak tracking
  getCurrentStreak(): Observable<number>
  getLongestStreak(): Observable<number>
  updateStreak(completed: boolean): Observable<void>
  
  // Multipliers
  getStreakMultiplier(): Observable<number>
  applyStreakBonus(basePoints: number): number
  
  // History
  getStreakHistory(days: number): Observable<StreakHistoryEntry[]>
  
  // Notifications
  sendStreakReminder(): void
  sendStreakAchievement(days: number): void
}
```

**Streak Calculation Logic**:
- Check if today's date > last activity date
- If consecutive day → increment streak
- If gap > 1 day → reset to 0
- Streak ≥ 7 days → Apply 1.5x multiplier
- Store in existing `UserProgress` model

### 4. Notification Service

**Location**: `src/app/services/notification.service.ts`

**Responsibilities**:
- Schedule daily challenge reminders
- Send goal progress notifications
- Alert on streak milestones
- Notify on path/module completion

**Key Methods**:
```typescript
class NotificationService {
  // Configuration
  enableNotifications(): void
  disableNotifications(): void
  setReminderTime(time: string): void
  
  // Notifications
  sendDailyChallengeReminder(): void
  sendUrgentReminder(): void
  sendGoalProgressUpdate(remaining: number): void
  sendGoalAchievement(): void
  sendStreakMilestone(days: number): void
  sendPathCompletion(pathName: string): void
}
```

**Implementation**:
- Use browser Notification API
- Store preferences in user settings
- Default reminder time: 19:00 local time
- Urgent reminder: 22:00 (2 hours before midnight)

## Database Schema Extensions

### Supabase Tables

#### learning_path_progress

```sql
CREATE TABLE learning_path_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  current_path_id VARCHAR(50) NOT NULL,
  current_module_id VARCHAR(50) NOT NULL,
  start_date TIMESTAMP NOT NULL,
  completed_modules TEXT[] DEFAULT '{}',
  module_progress JSONB DEFAULT '{}',
  path_completions JSONB DEFAULT '[]',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id)
);
```

#### daily_challenges

```sql
CREATE TABLE daily_challenges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  date DATE NOT NULL,
  exercise_id VARCHAR(50) NOT NULL,
  is_completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMP,
  score INTEGER,
  bonus_points INTEGER DEFAULT 0,
  is_weekend_challenge BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, date)
);
```

#### weekly_goals

```sql
CREATE TABLE weekly_goals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  week_start_date DATE NOT NULL,
  target_exercises INTEGER NOT NULL,
  completed_exercises INTEGER DEFAULT 0,
  is_achieved BOOLEAN DEFAULT FALSE,
  bonus_points_earned INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, week_start_date)
);
```



### Row Level Security (RLS)

```sql
-- Enable RLS
ALTER TABLE learning_path_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_goals ENABLE ROW LEVEL SECURITY;

-- Policies (users can only access their own data)
CREATE POLICY "Users can view own path progress" ON learning_path_progress
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own path progress" ON learning_path_progress
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own path progress" ON learning_path_progress
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Similar policies for other tables...
```

## Path Configuration Files

### Path Definition Format

**Location**: `public/data/learning-paths/beginner-path.json`

```json
{
  "id": "beginner-path",
  "name": "Beginner Path",
  "level": "beginner",
  "duration": "3 months",
  "durationWeeks": 12,
  "description": "Build a strong foundation in English with daily life topics",
  "modules": [
    {
      "id": "beginner-module-1",
      "name": "Daily Life Basics",
      "weekRange": "Week 1-4",
      "startWeek": 1,
      "endWeek": 4,
      "topics": [
        "Greetings and introductions",
        "Family and relationships",
        "Daily routines",
        "Food and dining"
      ],
      "exerciseIds": [
        "ex-1", "ex-2", "ex-3", "ex-5", "ex-7", "ex-9",
        "ex-11", "ex-13", "ex-15", "ex-17", "ex-19", "ex-21"
      ],
      "translationSupport": "full",
      "requiredScore": 60
    },
    {
      "id": "beginner-module-2",
      "name": "Travel & Transportation",
      "weekRange": "Week 5-8",
      "startWeek": 5,
      "endWeek": 8,
      "topics": [
        "Directions and locations",
        "Public transportation",
        "Hotels and accommodation",
        "Tourist attractions"
      ],
      "exerciseIds": [
        "ex-23", "ex-25", "ex-27", "ex-29", "ex-31", "ex-33",
        "ex-35", "ex-37", "ex-39", "ex-41", "ex-43", "ex-45"
      ],
      "translationSupport": "partial",
      "requiredScore": 65
    },
    {
      "id": "beginner-module-3",
      "name": "Education & Work",
      "weekRange": "Week 9-12",
      "startWeek": 9,
      "endWeek": 12,
      "topics": [
        "School and learning",
        "Jobs and careers",
        "Office communication",
        "Professional etiquette"
      ],
      "exerciseIds": [
        "ex-47", "ex-49", "ex-51", "ex-53", "ex-55", "ex-57",
        "ex-59", "ex-61", "ex-63", "ex-65", "ex-67", "ex-69"
      ],
      "translationSupport": "partial",
      "requiredScore": 70
    }
  ]
}
```

## Error Handling

### Common Error Scenarios

1. **Path not found**: Display error message, redirect to path selector
2. **Module locked**: Show unlock requirements, suggest completing previous module
3. **Daily challenge already completed**: Show congratulations, display tomorrow's challenge preview
4. **Database save failure**: Retry with exponential backoff, show offline indicator
5. **Exercise not available**: Skip to next recommended exercise, log error

### Error Recovery Strategies

- **Offline mode**: Cache path data locally, sync when online
- **Partial data**: Load with defaults, fetch missing data asynchronously
- **Stale data**: Show last known state, refresh in background
- **Network timeout**: Retry 3 times with increasing delays

## Testing Strategy

### Unit Tests

**Components**:
- Path selector: Path selection, locked state handling
- Daily challenge: Timer countdown, completion state
- Progress dashboard: Data visualization, calculation accuracy
- Goal tracker: Progress calculation, goal achievement detection

**Services**:
- Curriculum service: Path loading, module unlocking logic
- Adaptive engine: Recommendation algorithm, performance analysis
- Streak service: Streak calculation, multiplier application
- Notification service: Scheduling, permission handling

### Integration Tests

- Path selection → Module loading → Exercise display
- Exercise completion → Progress update → Module unlock
- Daily challenge completion → Streak update → Multiplier application
- Goal achievement → Bonus points → Notification

### E2E Tests

- Complete user journey: Select path → Complete exercises → Unlock modules → Complete path
- Daily challenge flow: View challenge → Complete → Check streak → Next day
- Goal setting flow: Set goal → Track progress → Achieve goal → Receive reward

### Performance Tests

- Path data loading time < 500ms
- Progress calculation time < 100ms
- Recommendation generation time < 200ms
- Database save operations < 1s

## Accessibility Considerations

- **Keyboard navigation**: All interactive elements accessible via keyboard
- **Screen reader support**: ARIA labels for progress indicators, charts
- **Color contrast**: WCAG AA compliance for all text and UI elements
- **Focus management**: Clear focus indicators, logical tab order
- **Alternative text**: Descriptive labels for icons and visual elements

## Performance Optimization

### Lazy Loading

- Load path configurations on demand
- Defer loading of historical data
- Lazy load chart libraries

### Caching Strategy

- Cache path configurations in memory
- Store user progress in local signal
- Sync to database on changes only

### Data Optimization

- Paginate exercise history
- Aggregate statistics server-side
- Use indexes on database queries

## Future Enhancements

1. **Social Features**: Share progress, compete with friends
2. **Custom Paths**: Allow users to create personalized learning paths
3. **AI Tutor**: Conversational AI for personalized guidance
4. **Voice Practice**: Integrate speech recognition for pronunciation
5. **Live Classes**: Schedule group learning sessions
6. **Certification**: Official certificates with verification
7. **Mobile App**: Native iOS/Android applications
8. **Offline Mode**: Full offline functionality with sync
