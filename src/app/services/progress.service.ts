import { Injectable, inject, effect, signal } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { switchMap, tap, catchError } from 'rxjs/operators';
import { ExerciseAttempt, UserProgress, ExerciseStatus } from '../models/exercise.model';
import { DictationPracticeAttempt } from '../models/dictation.model';
import { DatabaseService } from './database/database.service';
import { UnsubscribeFunction } from './database/database.interface';
import { AuthService } from './auth.service';
import { StorageAdapterFactory } from './storage/storage-adapter-factory.service';
import { LocalStorageProvider } from './storage/local-storage-provider.service';
import { GuestAnalyticsService } from './guest-analytics.service';
import { AnalyticsService } from './analytics.service';

@Injectable({
  providedIn: 'root'
})
export class ProgressService {
  private databaseService = inject(DatabaseService);
  private authService = inject(AuthService);
  private storageFactory = inject(StorageAdapterFactory);
  private localStorageProvider = inject(LocalStorageProvider);
  private guestAnalytics = inject(GuestAnalyticsService);
  private analyticsService = inject(AnalyticsService);
  private progress$ = new BehaviorSubject<UserProgress>(this.getDefaultProgress());
  private unsubscribe: UnsubscribeFunction | null = null;
  
  // Add a signal for reactive updates
  private progressSignal = signal<UserProgress>(this.getDefaultProgress());

  private isInitialized = false;

  private currentUserId: string | null = null;

  constructor() {
    // Load initial progress immediately for guest users
    const initialUser = this.authService.currentUser();
    if (!initialUser) {
      this.loadProgress();
      this.isInitialized = true;
    }
    
    // Subscribe to auth changes using effect
    effect(() => {
      const user = this.authService.currentUser();
      const userId = user?.uid || null;
      
      // Only initialize if user changed
      if (userId && userId !== this.currentUserId) {
        // User logged in
        this.currentUserId = userId;
        this.isInitialized = false;
        this.handleLogin();
        this.isInitialized = true;
      } else if (!userId && this.currentUserId) {
        // User logged out
        this.currentUserId = null;
        this.isInitialized = false;
        this.handleLogout();
      }
    });
  }

  /**
   * Load progress using the appropriate storage adapter
   */
  private loadProgress(): void {
    const adapter = this.storageFactory.getAdapter();
    adapter.loadProgress().subscribe({
      next: (progress) => {
        let data = progress || this.getDefaultProgress();
        // Migrate data if needed
        data = this.migrateProgressData(data);
        this.progress$.next(data);
        this.progressSignal.set(data);
        console.log('[ProgressService] Progress loaded');
      },
      error: (error: Error) => {
        console.error('[ProgressService] Failed to load progress:', error);
        const defaultProgress = this.getDefaultProgress();
        this.progress$.next(defaultProgress);
        this.progressSignal.set(defaultProgress);
      }
    });
  }

  /**
   * Handle user login - clear localStorage and load from Supabase
   */
  private handleLogin(): void {
    console.log('[ProgressService] User logged in, clearing guest data');
    
    // Clear localStorage when user logs in
    this.localStorageProvider.clearAll().subscribe({
      next: () => {
        console.log('[ProgressService] Guest data cleared on login');
        // Check if migration is needed (one-time check)
        this.checkAndMigrateData().subscribe({
          next: () => {
            // Load from Supabase
            this.loadProgress();
          },
          error: (error) => {
            console.error('[ProgressService] Migration failed:', error);
            this.loadProgress(); // Try loading anyway
          }
        });
      },
      error: (error) => {
        console.error('[ProgressService] Failed to clear guest data:', error);
        // Continue with login anyway
        this.loadProgress();
      }
    });
  }

  /**
   * Handle user logout - reset to default and load from localStorage
   */
  private handleLogout(): void {
    console.log('[ProgressService] User logged out, switching to guest mode');
    this.stopFirestoreSync();
    
    // Reset to default progress
    const defaultProgress = this.getDefaultProgress();
    this.progress$.next(defaultProgress);
    this.progressSignal.set(defaultProgress);
    
    // Load from localStorage (if any guest data exists)
    this.loadProgress();
  }

  private checkAndMigrateData(): Observable<void> {
    const userId = this.authService.getUserId();
    if (!userId) return of(undefined);

    // Check if user has data in Firestore
    return this.databaseService.loadProgressAuto().pipe(
      switchMap(cloudProgress => {
        if (cloudProgress) {
          // Data exists in Firestore, no migration needed
          // console.log('[ProgressService] Data already exists in Firestore, skipping migration');
          return of(undefined);
        }

        // Check for localStorage data to migrate
        const localData = this.checkLocalStorageData(userId);
        if (localData) {
          // console.log('[ProgressService] Migrating localStorage data to Firestore');
          return this.databaseService.saveProgressAuto(localData).pipe(
            tap(() => {
              this.clearLocalStorageData(userId);
              // console.log('[ProgressService] Migration completed successfully');
            })
          );
        }

        // No data to migrate
        console.log('[ProgressService] No localStorage data to migrate');
        return of(undefined);
      }),
      catchError((error: Error) => {
        console.error('[ProgressService] Migration error:', error);
        return of(undefined);
      })
    );
  }

  private checkLocalStorageData(userId: string): UserProgress | null {
    const key = `user_progress_${userId}`;
    const stored = localStorage.getItem(key);
    if (stored) {
      try {
        const progress = JSON.parse(stored);
        // Migrate old data structure
        const migrated = this.migrateProgressData(progress);
        return migrated;
      } catch (error) {
        console.error('[ProgressService] Failed to parse localStorage data:', error);
        return null;
      }
    }
    
    // Also check old key format
    const oldKey = 'user_progress';
    const oldStored = localStorage.getItem(oldKey);
    if (oldStored) {
      try {
        const progress = JSON.parse(oldStored);
        return this.migrateProgressData(progress);
      } catch (error) {
        console.error('[ProgressService] Failed to parse old localStorage data:', error);
        return null;
      }
    }
    
    return null;
  }

  private migrateProgressData(progress: any): UserProgress {
    // Migrate old attempts array to exerciseHistory object
    if (progress.attempts && Array.isArray(progress.attempts)) {
      const exerciseHistory: { [exerciseId: string]: ExerciseAttempt } = {};
      
      // Keep only the latest attempt for each exerciseId
      progress.attempts.forEach((attempt: ExerciseAttempt) => {
        const existing = exerciseHistory[attempt.exerciseId];
        if (!existing || new Date(attempt.timestamp) > new Date(existing.timestamp)) {
          exerciseHistory[attempt.exerciseId] = attempt;
        }
      });
      
      progress.exerciseHistory = exerciseHistory;
      delete progress.attempts; // Remove old field
      
      console.log(`[ProgressService] Migrated ${Object.keys(exerciseHistory).length} exercises from ${progress.attempts?.length || 0} attempts`);
    }
    
    // Ensure exerciseHistory exists
    if (!progress.exerciseHistory) {
      progress.exerciseHistory = {};
    }
    
    // Ensure dictationHistory exists
    if (!progress.dictationHistory) {
      progress.dictationHistory = {};
    }
    
    // Migrate streak fields if missing
    if (progress.currentStreak === undefined) {
      progress.currentStreak = 0;
      progress.lastStreakDate = '';
      
      // Calculate initial streak from exercise history
      const attempts = Object.values(progress.exerciseHistory);
      if (attempts.length > 0) {
        const streakData = this.calculateInitialStreak(attempts as ExerciseAttempt[]);
        progress.currentStreak = streakData.currentStreak;
        progress.lastStreakDate = streakData.lastStreakDate;
      }
    }
    
    // Initialize longestStreak if missing
    if (progress.longestStreak === undefined) {
      progress.longestStreak = progress.currentStreak || 0;
    }
    
    return progress;
  }

  private clearLocalStorageData(userId: string): void {
    const key = `user_progress_${userId}`;
    localStorage.removeItem(key);
    // Also remove old key if exists
    localStorage.removeItem('user_progress');
    console.log('[ProgressService] Cleared localStorage data');
  }

  getUserProgress(): Observable<UserProgress> {
    return this.progress$.asObservable();
  }
  
  // Get progress as signal for reactive components
  getProgressSignal() {
    return this.progressSignal.asReadonly();
  }

  // Helper method to get all attempts as array (for backward compatibility)
  getAllAttempts(): ExerciseAttempt[] {
    return Object.values(this.progress$.value.exerciseHistory);
  }



  private stopFirestoreSync(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
  }



  recordAttempt(attempt: ExerciseAttempt): void {
    const current = this.progress$.value;
    const oldLevel = this.calculateLevel(current.totalPoints);
    const streakUpdate = this.updateStreak(current);
    
    console.log('=== RECORDING ATTEMPT ===');
    console.log('Current totalPoints:', current.totalPoints);
    console.log('Attempt accuracyScore:', attempt.accuracyScore);
    console.log('Points to add:', attempt.pointsEarned);
    
    // Track guest analytics if user is not authenticated
    if (!this.authService.isAuthenticated()) {
      const isFirstExercise = Object.keys(current.exerciseHistory).length === 0;
      
      if (isFirstExercise) {
        this.guestAnalytics.trackFirstExerciseCompletion();
      }
      
      this.guestAnalytics.incrementExercisesCompleted();
    }
    
    // Update exercise history - only keep latest attempt per exercise
    const updatedHistory = {
      ...current.exerciseHistory,
      [attempt.exerciseId]: attempt
    };
    
    const updated: UserProgress = {
      ...current,
      exerciseHistory: updatedHistory,
      totalPoints: current.totalPoints + attempt.pointsEarned,
      lastActivityDate: new Date(),
      currentStreak: streakUpdate.currentStreak,
      lastStreakDate: streakUpdate.lastStreakDate,
      longestStreak: streakUpdate.longestStreak || current.longestStreak || 0
    };

    console.log('New totalPoints:', updated.totalPoints);
    console.log('Emitting updated progress to BehaviorSubject...');
    console.log('BehaviorSubject current value before next:', this.progress$.value.totalPoints);
    
    // Check for level up
    const newLevel = this.calculateLevel(updated.totalPoints);
    if (newLevel > oldLevel) {
      this.analyticsService.trackLevelUp(oldLevel, newLevel, updated.totalPoints);
    }
    
    // Update both BehaviorSubject and Signal
    this.progress$.next(updated);
    this.progressSignal.set(updated);
    
    console.log('BehaviorSubject current value after next:', this.progress$.value.totalPoints);
    console.log('Signal current value after set:', this.progressSignal().totalPoints);
    console.log('Number of observers:', (this.progress$ as any).observers?.length || 0);
    
    this.checkAchievements(updated);

    console.log('=== END RECORDING ATTEMPT ===');

    // Save using appropriate adapter
    const adapter = this.storageFactory.getAdapter();
    adapter.saveProgress(updated).subscribe({
      next: () => console.log('[ProgressService] Progress saved'),
      error: (error) => console.error('[ProgressService] Failed to save progress:', error)
    });
  }

  private calculateLevel(points: number): number {
    // Simple level calculation - adjust as needed
    return Math.floor(points / 100) + 1;
  }

  getExerciseStatus(exerciseId: string): ExerciseStatus {
    const attempt = this.progress$.value.exerciseHistory[exerciseId];

    if (!attempt) {
      return { status: 'new', attemptCount: 0 };
    }

    return {
      status: 'attempted',
      attemptCount: attempt.attemptNumber,
      bestScore: attempt.accuracyScore,
      perfectCompletions: attempt.accuracyScore === 100 ? 1 : 0
    };
  }

  calculateStreak(): number {
    const progress = this.progress$.value;
    const today = this.getDateString(new Date());
    const yesterday = this.getDateString(this.subtractDays(new Date(), 1));
    
    // console.log('=== CALCULATE STREAK ===');
    // console.log('Today:', today);
    // console.log('Yesterday:', yesterday);
    // console.log('Last streak date:', progress.lastStreakDate);
    // console.log('Current streak in data:', progress.currentStreak);
    // console.log('Comparison:', {
    //   'lastStreakDate === today': progress.lastStreakDate === today,
    //   'lastStreakDate === yesterday': progress.lastStreakDate === yesterday
    // });
    
    // If last streak date is today or yesterday, return current streak
    if (progress.lastStreakDate === today || progress.lastStreakDate === yesterday) {
      console.log('→ Returning current streak:', progress.currentStreak);
      return progress.currentStreak;
    }
    
    // Streak is broken
    console.log('→ Streak broken, returning 0');
    return 0;
  }

  private updateStreak(progress: UserProgress): { currentStreak: number; lastStreakDate: string; longestStreak?: number } {
    const today = this.getDateString(new Date());
    const yesterday = this.getDateString(this.subtractDays(new Date(), 1));
    
    console.log('=== UPDATE STREAK ===');
    console.log('Today:', today);
    console.log('Yesterday:', yesterday);
    console.log('Last streak date:', progress.lastStreakDate);
    console.log('Current streak:', progress.currentStreak);
    
    const currentLongest = progress.longestStreak || 0;
    const oldStreak = progress.currentStreak;
    
    // First time or no previous streak data
    if (!progress.lastStreakDate) {
      console.log('→ First time, setting streak to 1');
      this.analyticsService.trackStreakMilestone(1, 'daily');
      return { 
        currentStreak: 1, 
        lastStreakDate: today,
        longestStreak: Math.max(1, currentLongest)
      };
    }
    
    // Check if today is a NEW day (today > lastStreakDate)
    const isNewDay = today > progress.lastStreakDate;
    
    if (!isNewDay) {
      // Same day - keep current streak, update lastStreakDate
      console.log('→ Same day, keeping streak:', progress.currentStreak);
      return { 
        currentStreak: progress.currentStreak, 
        lastStreakDate: today,
        longestStreak: currentLongest
      };
    }
    
    // New day - check if it's consecutive
    if (progress.lastStreakDate === yesterday) {
      // Consecutive day - increase streak
      const newStreak = progress.currentStreak + 1;
      console.log('→ Consecutive day, increasing streak to:', newStreak);
      
      // Track streak milestone if it's a significant number
      if (newStreak % 7 === 0 || newStreak === 3 || newStreak === 5 || newStreak === 10 || newStreak === 30) {
        const milestoneType = newStreak >= 30 ? 'monthly' : newStreak >= 7 ? 'weekly' : 'daily';
        this.analyticsService.trackStreakMilestone(newStreak, milestoneType);
      }
      
      return { 
        currentStreak: newStreak, 
        lastStreakDate: today,
        longestStreak: Math.max(newStreak, currentLongest)
      };
    }
    
    // Streak broken - reset to 1
    console.log('→ Streak broken (missed days), resetting to 1');
    this.analyticsService.trackStreakMilestone(1, 'daily');
    return { 
      currentStreak: 1, 
      lastStreakDate: today,
      longestStreak: currentLongest
    };
  }

  private getDateString(date: Date): string {
    // Ensure date is valid
    if (!date || isNaN(date.getTime())) {
      date = new Date();
    }
    
    // Use local timezone instead of UTC
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
  }

  private subtractDays(date: Date, days: number): Date {
    const result = new Date(date);
    result.setDate(result.getDate() - days);
    return result;
  }





  private calculateInitialStreak(attempts: ExerciseAttempt[]): { currentStreak: number; lastStreakDate: string } {
    if (attempts.length === 0) {
      return { currentStreak: 0, lastStreakDate: '' };
    }

    // Get unique dates from attempts
    const uniqueDates = [...new Set(
      attempts.map(a => this.getDateString(new Date(a.timestamp)))
    )].sort((a, b) => b.localeCompare(a)); // Sort descending

    if (uniqueDates.length === 0) {
      return { currentStreak: 0, lastStreakDate: '' };
    }

    const today = this.getDateString(new Date());
    const yesterday = this.getDateString(this.subtractDays(new Date(), 1));
    
    // Check if most recent activity is today or yesterday
    const lastActivityDate = uniqueDates[0];
    if (lastActivityDate !== today && lastActivityDate !== yesterday) {
      // Streak is broken
      return { currentStreak: 0, lastStreakDate: '' };
    }

    // Count consecutive days
    let streak = 1;
    let currentDate = new Date(lastActivityDate);
    
    for (let i = 1; i < uniqueDates.length; i++) {
      const expectedDate = this.getDateString(this.subtractDays(currentDate, 1));
      if (uniqueDates[i] === expectedDate) {
        streak++;
        currentDate = new Date(uniqueDates[i]);
      } else {
        break;
      }
    }

    return { currentStreak: streak, lastStreakDate: lastActivityDate };
  }



  private getDefaultProgress(): UserProgress {
    return {
      exerciseHistory: {},
      dictationHistory: {},
      totalPoints: 0,
      lastActivityDate: new Date(),
      currentStreak: 0,
      longestStreak: 0,
      lastStreakDate: '',
      achievements: []
    };
  }

  recordDictationAttempt(attempt: DictationPracticeAttempt): void {
    const current = this.progress$.value;
    const streakUpdate = this.updateStreak(current);
    
    console.log('=== RECORDING DICTATION ATTEMPT ===');
    console.log('Exercise ID:', attempt.exerciseId);
    console.log('Overall accuracy:', attempt.overallAccuracy);
    
    // Update dictation history - only keep latest attempt per exercise
    const updatedDictationHistory = {
      ...current.dictationHistory,
      [attempt.exerciseId]: attempt
    };
    
    const updated: UserProgress = {
      ...current,
      dictationHistory: updatedDictationHistory,
      lastActivityDate: new Date(),
      currentStreak: streakUpdate.currentStreak,
      lastStreakDate: streakUpdate.lastStreakDate,
      longestStreak: streakUpdate.longestStreak || current.longestStreak || 0
    };

    console.log('Updated dictation history');
    
    // Update both BehaviorSubject and Signal
    this.progress$.next(updated);
    this.progressSignal.set(updated);
    
    this.checkAchievements(updated);

    console.log('=== END RECORDING DICTATION ATTEMPT ===');

    // Save using appropriate adapter
    const adapter = this.storageFactory.getAdapter();
    adapter.saveProgress(updated).subscribe({
      next: () => console.log('[ProgressService] Dictation progress saved'),
      error: (error) => console.error('[ProgressService] Failed to save dictation progress:', error)
    });
  }

  private checkAchievements(progress: UserProgress): void {
    const newAchievements: string[] = [];

    // Get all attempts from exercise history
    const allAttempts = Object.values(progress.exerciseHistory);

    // First exercise achievement
    if (allAttempts.length === 1 && !progress.achievements.includes('first-exercise')) {
      newAchievements.push('first-exercise');
    }

    // Bright Mind achievement (high accuracy)
    const highAccuracyAttempts = allAttempts.filter(a => a.accuracyScore >= 90);
    if (highAccuracyAttempts.length >= 5 && !progress.achievements.includes('bright-mind')) {
      newAchievements.push('bright-mind');
    }

    // Streak achievements
    const streak = this.calculateStreak();
    if (streak >= 1 && !progress.achievements.includes('1-day-streak')) {
      newAchievements.push('1-day-streak');
    }
    if (streak >= 7 && !progress.achievements.includes('7-day-streak')) {
      newAchievements.push('7-day-streak');
    }
    
    // Dictation-specific achievements
    const dictationAttempts = Object.values(progress.dictationHistory || {});
    
    // First dictation achievement
    if (dictationAttempts.length === 1 && !progress.achievements.includes('first-dictation')) {
      newAchievements.push('first-dictation');
    }
    
    // Dictation master achievement (10 dictations with 90%+ accuracy)
    const highAccuracyDictations = dictationAttempts.filter(a => a.overallAccuracy >= 90);
    if (highAccuracyDictations.length >= 10 && !progress.achievements.includes('dictation-master')) {
      newAchievements.push('dictation-master');
    }
    
    // Perfect dictation achievement (100% accuracy)
    const perfectDictations = dictationAttempts.filter(a => a.overallAccuracy === 100);
    if (perfectDictations.length >= 1 && !progress.achievements.includes('perfect-dictation')) {
      newAchievements.push('perfect-dictation');
    }

    if (newAchievements.length > 0) {
      const updated = {
        ...progress,
        achievements: [...progress.achievements, ...newAchievements]
      };
      this.progress$.next(updated);
      this.progressSignal.set(updated);
      
      // Save using appropriate adapter
      const adapter = this.storageFactory.getAdapter();
      adapter.saveProgress(updated).subscribe({
        error: (error) => console.error('[ProgressService] Failed to save achievements:', error)
      });
    }
  }

  // Add bonus points from achievements
  addBonusPoints(amount: number): void {
    const current = this.progress$.value;
    const oldLevel = this.calculateLevel(current.totalPoints);
    
    console.log('=== ADDING BONUS POINTS ===');
    console.log('Current totalPoints:', current.totalPoints);
    console.log('Bonus points to add:', amount);
    
    const updated: UserProgress = {
      ...current,
      totalPoints: current.totalPoints + amount
    };

    console.log('New totalPoints:', updated.totalPoints);
    console.log('Emitting updated progress to BehaviorSubject...');
    
    // Check for level up
    const newLevel = this.calculateLevel(updated.totalPoints);
    if (newLevel > oldLevel) {
      this.analyticsService.trackLevelUp(oldLevel, newLevel, updated.totalPoints);
    }
    
    this.progress$.next(updated);
    this.progressSignal.set(updated);

    console.log('=== END ADDING BONUS POINTS ===');

    // Save using appropriate adapter
    const adapter = this.storageFactory.getAdapter();
    adapter.saveProgress(updated).subscribe({
      next: () => console.log('[ProgressService] Bonus points saved'),
      error: (error) => console.error('[ProgressService] Failed to save bonus points:', error)
    });
  }
}
