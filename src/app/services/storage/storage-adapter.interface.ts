import { Observable } from 'rxjs';
import { UserProgress, ExerciseAttempt } from '../../models/exercise.model';
import { DictationPracticeAttempt } from '../../models/dictation.model';

/**
 * Storage adapter interface for unified storage operations
 * Supports both localStorage (guest users) and Supabase (authenticated users)
 */
export interface StorageAdapter {
  // Progress Operations
  saveProgress(progress: UserProgress): Observable<void>;
  loadProgress(): Observable<UserProgress | null>;
  
  // Exercise History Operations
  saveExerciseAttempt(attempt: ExerciseAttempt): Observable<void>;
  getExerciseHistory(): Observable<{ [exerciseId: string]: ExerciseAttempt }>;
  
  // Dictation History Operations
  saveDictationAttempt(attempt: DictationPracticeAttempt): Observable<void>;
  getDictationHistory(): Observable<{ [exerciseId: string]: DictationPracticeAttempt }>;
  
  // Statistics Operations
  getStats(): Observable<UserStats>;
  updateStats(stats: Partial<UserStats>): Observable<void>;
  
  // Clear all data
  clearAll(): Observable<void>;
}

export interface UserStats {
  totalPoints: number;
  currentStreak: number;
  longestStreak: number;
  lastStreakDate: string;
  lastActivityDate: Date;
  achievements: string[];
}
