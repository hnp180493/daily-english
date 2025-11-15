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
