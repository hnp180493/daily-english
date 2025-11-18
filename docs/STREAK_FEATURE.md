# Streak Feature

## Overview
The streak feature tracks consecutive days of learning activity. Users earn a streak by practicing exercises on consecutive days. If they miss a day, the streak resets to 0.

## How It Works

### Streak Calculation
- **Day 1**: User completes an exercise → Streak = 1
- **Day 2**: User completes an exercise → Streak = 2
- **Day 3**: User completes an exercise → Streak = 3
- **Day 4**: User doesn't practice → Streak resets to 0
- **Day 5**: User completes an exercise → Streak = 1 (starts over)

### Rules
1. Streak increases by 1 when user practices on consecutive days
2. Multiple exercises on the same day count as 1 day
3. Streak resets to 0 if user misses a day
4. Streak is maintained if user practices today or yesterday

### Display
- Streak is shown in the header with a fire emoji (🔥)
- Only displays when streak > 0
- Animated fire icon to draw attention
- Hover effect for visual feedback

## Technical Implementation

### Data Model
```typescript
interface UserProgress {
  // ... other fields
  currentStreak: number;        // Current streak count
  lastStreakDate: string;       // ISO date string (YYYY-MM-DD)
}
```

### Key Methods

#### `updateStreak(progress: UserProgress)`
Called when recording a new attempt. Updates streak based on:
- First time: Sets streak to 1
- Same day: Maintains current streak
- Next day: Increments streak by 1
- Missed day: Resets streak to 1

#### `calculateStreak()`
Returns current streak value, checking if it's still valid:
- Returns current streak if last activity was today or yesterday
- Returns 0 if streak is broken

### Migration
Existing user data is automatically migrated:
- Calculates initial streak from existing attempts
- Handles missing streak fields gracefully
- Preserves all existing progress data

## UI Components

### Header Component
- Displays streak count with fire emoji
- Only shows when streak > 0
- Styled with orange theme colors
- Animated fire icon

### Exercise Detail Component
- Shows streak in stats section
- Updates in real-time after completing exercises

## Future Enhancements
- Streak milestones (7 days, 30 days, 100 days)
- Streak recovery (allow 1 missed day per week)
- Streak leaderboard
- Push notifications to maintain streak
