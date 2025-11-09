import { Injectable, inject } from '@angular/core';
import { Observable, of } from 'rxjs';
import { switchMap, tap, catchError } from 'rxjs/operators';
import { UserAchievementData } from '../models/achievement.model';
import { DatabaseService } from './database/database.service';
import { AuthService } from './auth.service';

/**
 * Service for managing achievement data persistence
 * Handles Firestore operations and localStorage migration
 */
@Injectable({
  providedIn: 'root'
})
export class AchievementStoreService {
  private databaseService = inject(DatabaseService);
  private authService = inject(AuthService);

  /**
   * Load achievement data from Firestore
   */
  loadAchievementData(): Observable<UserAchievementData | null> {
    return this.databaseService.loadAchievementsAuto().pipe(
      tap((data) => {
        if (data) {
          console.log('[AchievementStoreService] Data loaded from Firestore');
        }
      }),
      catchError((error: Error) => {
        console.error('[AchievementStoreService] Failed to load data:', error);
        return of(null);
      })
    );
  }

  /**
   * Save achievement data to Firestore
   */
  saveAchievementData(data: UserAchievementData): Observable<void> {
    return this.databaseService.saveAchievementsAuto(data).pipe(
      tap(() => {
        console.log('[AchievementStoreService] Data saved to Firestore');
      }),
      catchError((error: Error) => {
        console.error('[AchievementStoreService] Failed to save data:', error);
        return of(undefined);
      })
    );
  }

  /**
   * Migrate data from localStorage to Firestore
   * Only runs once if localStorage data exists
   */
  migrateFromLocalStorage(): Observable<void> {
    const userId = this.authService.getUserId();
    if (!userId) return of(undefined);

    return this.loadAchievementData().pipe(
      switchMap((cloudData) => {
        if (cloudData) {
          console.log(
            '[AchievementStoreService] Data already exists in Firestore, skipping migration'
          );
          return of(undefined);
        }

        const localData = this.checkLocalStorageData(userId);
        if (localData) {
          console.log('[AchievementStoreService] Migrating localStorage data to Firestore');
          return this.saveAchievementData(localData).pipe(
            tap(() => {
              this.clearLocalStorageData(userId);
              console.log('[AchievementStoreService] Migration completed successfully');
            })
          );
        }

        console.log('[AchievementStoreService] No localStorage data to migrate');
        return of(undefined);
      }),
      catchError((error: Error) => {
        console.error('[AchievementStoreService] Migration error:', error);
        return of(undefined);
      })
    );
  }

  /**
   * Check for localStorage data
   */
  private checkLocalStorageData(userId: string): UserAchievementData | null {
    const key = `user_achievements_${userId}`;
    const stored = localStorage.getItem(key);

    if (stored) {
      try {
        const data = JSON.parse(stored);

        // Convert date strings back to Date objects
        data.unlockedAchievements = data.unlockedAchievements.map((ua: any) => ({
          ...ua,
          unlockedAt: new Date(ua.unlockedAt)
        }));
        data.lastEvaluated = new Date(data.lastEvaluated);

        // Convert progress dates
        if (data.progress) {
          Object.keys(data.progress).forEach((key) => {
            data.progress[key].lastUpdated = new Date(data.progress[key].lastUpdated);
          });
        }

        return data;
      } catch (error) {
        console.error('[AchievementStoreService] Failed to parse localStorage data:', error);
        return null;
      }
    }

    return null;
  }

  /**
   * Clear localStorage data after migration
   */
  private clearLocalStorageData(userId: string): void {
    const key = `user_achievements_${userId}`;
    localStorage.removeItem(key);
    console.log('[AchievementStoreService] Cleared localStorage data');
  }

  /**
   * Get default user achievement data
   */
  getDefaultUserData(): UserAchievementData {
    return {
      userId: this.authService.getUserId() || '',
      unlockedAchievements: [],
      progress: {},
      lastEvaluated: new Date(0)
    };
  }

  /**
   * Cleanup achievement data by removing unnecessary progress entries
   * This removes:
   * - Progress entries with 0% completion
   * - Progress entries for already unlocked achievements
   * 
   * Use this to optimize existing user data
   */
  cleanupAchievementData(data: UserAchievementData): UserAchievementData {
    const unlockedIds = new Set(data.unlockedAchievements.map(ua => ua.achievementId));
    const cleanedProgress: { [key: string]: any } = {};

    // Only keep progress entries that are meaningful
    Object.entries(data.progress).forEach(([achievementId, progress]) => {
      // Skip if already unlocked
      if (unlockedIds.has(achievementId)) {
        return;
      }

      // Skip if no progress (0%)
      if (progress.current === 0 || progress.percentage === 0) {
        return;
      }

      // Keep this progress entry
      cleanedProgress[achievementId] = progress;
    });

    return {
      ...data,
      progress: cleanedProgress
    };
  }

  /**
   * Cleanup and save current user's achievement data
   * Useful for one-time migration to optimized format
   */
  cleanupAndSaveCurrentUser(): Observable<void> {
    return this.loadAchievementData().pipe(
      switchMap((data) => {
        if (!data) {
          console.log('[AchievementStoreService] No data to cleanup');
          return of(undefined);
        }

        const originalSize = Object.keys(data.progress).length;
        const cleanedData = this.cleanupAchievementData(data);
        const cleanedSize = Object.keys(cleanedData.progress).length;

        if (originalSize === cleanedSize) {
          console.log('[AchievementStoreService] Data already optimized');
          return of(undefined);
        }

        console.log(
          `[AchievementStoreService] Cleaning up: ${originalSize} -> ${cleanedSize} progress entries`
        );
        return this.saveAchievementData(cleanedData);
      }),
      catchError((error: Error) => {
        console.error('[AchievementStoreService] Cleanup failed:', error);
        return of(undefined);
      })
    );
  }
}
