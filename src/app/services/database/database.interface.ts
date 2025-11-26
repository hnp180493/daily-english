import { Observable } from 'rxjs';
import { UserProgress, CustomExercise } from '../../models/exercise.model';
import { UserAchievementData, AchievementProgress } from '../../models/achievement.model';
import { ReviewData, ReviewDataWithMetadata } from '../../models/review.model';
import { UserPathProgress } from '../../models/learning-path.model';
import { DailyChallenge } from '../../models/daily-challenge.model';
import { WeeklyGoal } from '../../models/weekly-goal.model';

export interface FavoriteData {
  exerciseId: string;
  addedAt: Date;
}

export interface UserProfile {
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  createdAt: Date;
  lastLogin: Date;
  status?: 'Active' | 'Inactive';
}

export interface UserRewards {
  themes: string[];
  hints: number;
  avatarFrames: string[];
}

export type UnsubscribeFunction = () => void;

/**
 * Database abstraction interface
 * Implement this interface to support different database backends
 */
export interface IDatabase {
  // User Profile Operations
  saveUserProfile(userId: string, profile: UserProfile): Observable<void>;
  loadUserProfile(userId: string): Observable<UserProfile | null>;

  // Progress Operations
  saveProgress(userId: string, progress: UserProgress): Observable<void>;
  loadProgress(userId: string): Observable<UserProgress | null>;
  subscribeToProgress(
    userId: string,
    callback: (progress: UserProgress | null) => void
  ): UnsubscribeFunction;

  // Favorites Operations
  saveFavorites(userId: string, favorites: FavoriteData[]): Observable<void>;
  loadFavorites(userId: string): Observable<FavoriteData[] | null>;
  subscribeToFavorites(
    userId: string,
    callback: (favorites: FavoriteData[] | null) => void
  ): UnsubscribeFunction;

  // Custom Exercise Operations - REMOVED
  // Custom exercises are now stored in localStorage only
  // See CustomExerciseService for implementation

  // Achievement Operations
  saveAchievements(userId: string, data: UserAchievementData): Observable<void>;
  loadAchievements(userId: string): Observable<UserAchievementData | null>;

  // Reward Operations
  saveRewards(userId: string, rewards: UserRewards): Observable<void>;
  loadRewards(userId: string): Observable<UserRewards | null>;

  // Review Data Operations
  // Note: saveReviewData accepts ReviewData (without metadata), but load methods return ReviewDataWithMetadata
  saveReviewData(userId: string, exerciseId: string, reviewData: ReviewData): Observable<void>;
  loadReviewData(userId: string, exerciseId: string): Observable<ReviewDataWithMetadata | null>;
  loadAllReviewData(userId: string): Observable<ReviewDataWithMetadata[]>;
  updateReviewSchedule(userId: string, exerciseId: string, nextReviewDate: Date, interval: number, easinessFactor: number): Observable<void>;
  deleteReviewData(userId: string, exerciseId: string): Observable<void>;

  // Learning Path Operations
  saveLearningPathProgress(userId: string, progress: UserPathProgress): Observable<void>;
  loadLearningPathProgress(userId: string): Observable<UserPathProgress | null>;

  // Daily Challenge Operations
  saveDailyChallenge(userId: string, challenge: DailyChallenge): Observable<void>;
  loadDailyChallenge(userId: string, challengeId: string): Observable<DailyChallenge | null>;
  loadDailyChallengeByDate(userId: string, date: string): Observable<DailyChallenge | null>;

  // Weekly Goal Operations
  saveWeeklyGoal(userId: string, goal: WeeklyGoal): Observable<void>;
  loadWeeklyGoal(userId: string, goalId: string): Observable<WeeklyGoal | null>;
  loadWeeklyGoalByDate(userId: string, weekStartDate: string): Observable<WeeklyGoal | null>;

  // User Count Operations
  getTotalUserCount(): Observable<number>;
  checkUserExists(userId: string): Observable<boolean>;

  // Exercise History Operations
  insertExerciseHistory(record: import('../../models/exercise-history.model').ExerciseHistoryRecord): Observable<void>;
  loadRecentHistory(userId: string, limit: number): Observable<import('../../models/exercise-history.model').ExerciseHistoryRecord[]>;
  loadExerciseHistory(userId: string, exerciseId: string): Observable<import('../../models/exercise-history.model').ExerciseHistoryRecord[]>;
  loadHistoryForDateRange(userId: string, startDate: Date, endDate: Date): Observable<import('../../models/exercise-history.model').ExerciseHistoryRecord[]>;
}
