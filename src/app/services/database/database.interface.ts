import { Observable } from 'rxjs';
import { UserProgress, CustomExercise } from '../../models/exercise.model';
import { UserAchievementData, AchievementProgress } from '../../models/achievement.model';
import { ReviewData, ReviewDataWithMetadata } from '../../models/review.model';

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

  // Custom Exercise Operations
  saveCustomExercise(userId: string, exercise: CustomExercise): Observable<void>;
  loadCustomExercises(userId: string): Observable<CustomExercise[]>;
  deleteCustomExercise(userId: string, exerciseId: string): Observable<void>;
  subscribeToCustomExercises(
    userId: string,
    callback: (exercises: CustomExercise[]) => void
  ): UnsubscribeFunction;

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
}
