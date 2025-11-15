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
