import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import {
  GUEST_STORAGE_KEYS,
  APP_KEY_PREFIXES,
  SKIP_KEY_PREFIXES,
  GUEST_PROGRESS_KEY,
  USER_PROGRESS_KEY_PREFIX,
  GUEST_FAVORITES_KEY,
  GUEST_ACHIEVEMENTS_KEY,
  GUEST_WEEKLY_GOALS_KEY,
  GUEST_DAILY_CHALLENGES_KEY
} from '../constants/storage-keys';

export interface ExportData {
  version: string;
  exportDate: string;
  isGuestMode: boolean;
  localStorage: { [key: string]: any };
}

@Injectable({
  providedIn: 'root'
})
export class ExportImportService {
  private readonly EXPORT_VERSION = '2.0';

  /**
   * Export all localStorage data for guest mode
   */
  exportProgress(): Observable<Blob> {
    return new Observable(observer => {
      try {
        const localStorageData: { [key: string]: any } = {};
        const weeklyGoals: any[] = [];
        const dailyChallenges: any[] = [];
        
        // Scan ALL localStorage keys and export relevant ones
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (!key) continue;
          
          // Collect weekly goals into array
          if (key.startsWith('guest_weekly_goal_')) {
            const value = localStorage.getItem(key);
            if (value) {
              try {
                weeklyGoals.push(JSON.parse(value));
              } catch {
                console.warn('[ExportImportService] Failed to parse weekly goal:', key);
              }
            }
            continue;
          }
          
          // Collect daily challenges into array
          if (key.startsWith('guest_daily_challenge_')) {
            const value = localStorage.getItem(key);
            if (value) {
              try {
                dailyChallenges.push(JSON.parse(value));
              } catch {
                console.warn('[ExportImportService] Failed to parse daily challenge:', key);
              }
            }
            continue;
          }
          
          // Skip exercise_progress keys
          if (key.startsWith('exercise_progress_')) {
            continue;
          }
          
          // Skip irrelevant keys (browser internal, dev tools, etc)
          if (this.shouldExportKey(key)) {
            const value = localStorage.getItem(key);
            if (value) {
              try {
                localStorageData[key] = JSON.parse(value);
              } catch {
                // If not JSON, store as string
                localStorageData[key] = value;
              }
            }
          }
        }

        // Add normalized arrays
        if (weeklyGoals.length > 0) {
          localStorageData[GUEST_WEEKLY_GOALS_KEY] = weeklyGoals;
        }
        if (dailyChallenges.length > 0) {
          localStorageData[GUEST_DAILY_CHALLENGES_KEY] = dailyChallenges;
        }

        console.log('[ExportImportService] Exporting keys:', Object.keys(localStorageData));
        console.log('[ExportImportService] Weekly goals:', weeklyGoals.length);
        console.log('[ExportImportService] Daily challenges:', dailyChallenges.length);

        const exportData: ExportData = {
          version: this.EXPORT_VERSION,
          exportDate: new Date().toISOString(),
          isGuestMode: true,
          localStorage: localStorageData
        };

        const json = JSON.stringify(exportData, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        
        observer.next(blob);
        observer.complete();
      } catch (error) {
        console.error('[ExportImportService] Export failed:', error);
        observer.error(new Error('Không thể xuất dữ liệu'));
      }
    });
  }

  /**
   * Determine if a localStorage key should be exported
   */
  private shouldExportKey(key: string): boolean {
    // Skip browser/framework internal keys
    if (SKIP_KEY_PREFIXES.some(prefix => key.startsWith(prefix))) {
      return false;
    }

    // Export app-specific keys
    return APP_KEY_PREFIXES.some(prefix => key.startsWith(prefix)) || 
           GUEST_STORAGE_KEYS.includes(key);
  }

  /**
   * Import localStorage data from JSON file
   */
  importProgress(file: File): Observable<ExportData> {
    return new Observable(observer => {
      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const content = e.target?.result as string;
          const importData: ExportData = JSON.parse(content);

          // Validate import data
          if (!importData.version || !importData.localStorage) {
            observer.error(new Error('File không hợp lệ'));
            return;
          }

          // Import all localStorage data
          Object.entries(importData.localStorage).forEach(([key, value]) => {
            try {
              const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
              
              // Merge logic for specific keys
              if (key === GUEST_PROGRESS_KEY || key.startsWith(USER_PROGRESS_KEY_PREFIX)) {
                this.mergeProgress(key, value);
              } else if (key === GUEST_FAVORITES_KEY) {
                this.mergeFavorites(key, value);
              } else if (key === GUEST_ACHIEVEMENTS_KEY) {
                this.mergeAchievements(key, value);
              } else if (key === GUEST_WEEKLY_GOALS_KEY) {
                this.mergeWeeklyGoals(value);
              } else if (key === GUEST_DAILY_CHALLENGES_KEY) {
                this.mergeDailyChallenges(value);
              } else {
                // For other keys, just overwrite
                localStorage.setItem(key, stringValue);
              }
            } catch (error) {
              console.error(`[ExportImportService] Failed to import key ${key}:`, error);
            }
          });

          observer.next(importData);
          observer.complete();
        } catch (error) {
          console.error('[ExportImportService] Import parsing failed:', error);
          observer.error(new Error('File không hợp lệ'));
        }
      };

      reader.onerror = () => {
        observer.error(new Error('Không thể đọc file'));
      };

      reader.readAsText(file);
    });
  }

  /**
   * Merge progress data - keep best scores
   */
  private mergeProgress(key: string, importedData: any): void {
    const existing = localStorage.getItem(key);
    if (!existing) {
      localStorage.setItem(key, JSON.stringify(importedData));
      return;
    }

    try {
      const current = JSON.parse(existing);
      
      // Merge exercise history - keep best scores
      const mergedExerciseHistory = { ...current.exerciseHistory };
      Object.entries(importedData.exerciseHistory || {}).forEach(([exerciseId, attempt]: [string, any]) => {
        const existingAttempt = mergedExerciseHistory[exerciseId];
        if (!existingAttempt || attempt.accuracyScore > existingAttempt.accuracyScore) {
          mergedExerciseHistory[exerciseId] = attempt;
        }
      });

      // Merge dictation history
      const mergedDictationHistory = { ...current.dictationHistory };
      Object.entries(importedData.dictationHistory || {}).forEach(([exerciseId, attempt]: [string, any]) => {
        const existingAttempt = mergedDictationHistory[exerciseId];
        if (!existingAttempt || attempt.overallAccuracy > existingAttempt.overallAccuracy) {
          mergedDictationHistory[exerciseId] = attempt;
        }
      });

      // Merge achievements
      const mergedAchievements = Array.from(new Set([
        ...(current.achievements || []),
        ...(importedData.achievements || [])
      ]));

      const merged = {
        ...current,
        exerciseHistory: mergedExerciseHistory,
        dictationHistory: mergedDictationHistory,
        totalPoints: Math.max(current.totalPoints || 0, importedData.totalPoints || 0),
        currentStreak: Math.max(current.currentStreak || 0, importedData.currentStreak || 0),
        longestStreak: Math.max(current.longestStreak || 0, importedData.longestStreak || 0),
        achievements: mergedAchievements
      };

      localStorage.setItem(key, JSON.stringify(merged));
    } catch (error) {
      console.error('[ExportImportService] Failed to merge progress:', error);
      localStorage.setItem(key, JSON.stringify(importedData));
    }
  }

  /**
   * Merge favorites - combine without duplicates
   */
  private mergeFavorites(key: string, importedData: any): void {
    const existing = localStorage.getItem(key);
    if (!existing) {
      localStorage.setItem(key, JSON.stringify(importedData));
      return;
    }

    try {
      const current = JSON.parse(existing);
      const currentArray = Array.isArray(current) ? current : [];
      const importedArray = Array.isArray(importedData) ? importedData : [];
      
      const merged = [...currentArray];
      importedArray.forEach((fav: any) => {
        if (!merged.find((f: any) => f.exerciseId === fav.exerciseId)) {
          merged.push(fav);
        }
      });

      localStorage.setItem(key, JSON.stringify(merged));
    } catch (error) {
      console.error('[ExportImportService] Failed to merge favorites:', error);
      localStorage.setItem(key, JSON.stringify(importedData));
    }
  }

  /**
   * Merge achievements - combine unlocked achievements
   */
  private mergeAchievements(key: string, importedData: any): void {
    const existing = localStorage.getItem(key);
    if (!existing) {
      localStorage.setItem(key, JSON.stringify(importedData));
      return;
    }

    try {
      const current = JSON.parse(existing);
      
      const mergedUnlocked = Array.from(new Set([
        ...(current.unlockedAchievements || []),
        ...(importedData.unlockedAchievements || [])
      ]));

      const merged = {
        ...current,
        unlockedAchievements: mergedUnlocked,
        totalPoints: Math.max(current.totalPoints || 0, importedData.totalPoints || 0)
      };

      localStorage.setItem(key, JSON.stringify(merged));
    } catch (error) {
      console.error('[ExportImportService] Failed to merge achievements:', error);
      localStorage.setItem(key, JSON.stringify(importedData));
    }
  }

  /**
   * Generate filename for export
   */
  generateExportFilename(): string {
    const date = new Date();
    const dateStr = date.toISOString().split('T')[0];
    return `vietnamese-practice-${dateStr}.json`;
  }

  /**
   * Merge weekly goals - combine without duplicates
   * Store each goal with date-based key: guest_weekly_goal_YYYY-MM-DD
   */
  private mergeWeeklyGoals(importedData: any): void {
    const importedArray = Array.isArray(importedData) ? importedData : [];
    
    importedArray.forEach((goal: any) => {
      if (!goal.weekStartDate) {
        console.warn('[ExportImportService] Weekly goal missing weekStartDate:', goal);
        return;
      }

      const key = `guest_weekly_goal_${goal.weekStartDate}`;
      const existing = localStorage.getItem(key);
      
      if (!existing) {
        localStorage.setItem(key, JSON.stringify(goal));
      } else {
        try {
          const currentGoal = JSON.parse(existing);
          // Keep the one with more progress
          if (goal.completedExercises > currentGoal.completedExercises) {
            localStorage.setItem(key, JSON.stringify(goal));
          }
        } catch (error) {
          console.error('[ExportImportService] Failed to merge weekly goal:', error);
          localStorage.setItem(key, JSON.stringify(goal));
        }
      }
    });
  }

  /**
   * Merge daily challenges - combine without duplicates
   * Store each challenge with date-based key: guest_daily_challenge_YYYY-MM-DD
   */
  private mergeDailyChallenges(importedData: any): void {
    const importedArray = Array.isArray(importedData) ? importedData : [];
    
    importedArray.forEach((challenge: any) => {
      if (!challenge.date) {
        console.warn('[ExportImportService] Daily challenge missing date:', challenge);
        return;
      }

      const key = `guest_daily_challenge_${challenge.date}`;
      const existing = localStorage.getItem(key);
      
      if (!existing) {
        localStorage.setItem(key, JSON.stringify(challenge));
      } else {
        try {
          const currentChallenge = JSON.parse(existing);
          // Keep the completed one, or the one with more progress
          if (challenge.isCompleted && !currentChallenge.isCompleted) {
            localStorage.setItem(key, JSON.stringify(challenge));
          }
        } catch (error) {
          console.error('[ExportImportService] Failed to merge daily challenge:', error);
          localStorage.setItem(key, JSON.stringify(challenge));
        }
      }
    });
  }

  /**
   * Trigger download of blob
   */
  downloadBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}
