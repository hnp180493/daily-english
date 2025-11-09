import { Injectable, inject, signal, effect } from '@angular/core';
import { Observable, of } from 'rxjs';
import { switchMap, tap, catchError } from 'rxjs/operators';
import { Reward, RewardType } from '../models/achievement.model';
import { AuthService } from './auth.service';
import { ProgressService } from './progress.service';
import { DatabaseService } from './database/database.service';
import { UserRewards } from './database/database.interface';

@Injectable({
  providedIn: 'root'
})
export class RewardService {
  private authService = inject(AuthService);
  private progressService = inject(ProgressService);
  private databaseService = inject(DatabaseService);

  private unlockedRewards = signal<UserRewards>(this.getDefaultRewards());
  private isInitialized = false;

  constructor() {
    // Reload rewards when user changes
    effect(() => {
      const user = this.authService.currentUser();
      if (user && !this.isInitialized) {
        // Initialize rewards only once per user session
        this.isInitialized = true;
        this.initializeRewards();
      } else if (!user) {
        this.isInitialized = false;
        this.unlockedRewards.set(this.getDefaultRewards());
      }
    });
  }

  grantRewards(rewards: Reward[]): void {
    rewards.forEach(reward => {
      switch (reward.type) {
        case RewardType.CREDITS:
          this.grantCredits(reward.value as number);
          break;
        case RewardType.THEME:
          this.unlockTheme(reward.value as string);
          break;
        case RewardType.HINTS:
          this.unlockHints(reward.value as number);
          break;
        case RewardType.AVATAR_FRAME:
          this.unlockAvatarFrame(reward.value as string);
          break;
      }
    });

    // Save to Firestore
    this.databaseService.saveRewardsAuto(this.unlockedRewards()).subscribe({
      next: () => console.log('[RewardService] Rewards saved to Firestore'),
      error: (error: Error) => console.error('[RewardService] Failed to save rewards:', error)
    });
  }

  private grantCredits(amount: number): void {
    console.log(`Granting ${amount} bonus points to user profile`);
    
    // Add bonus points directly to the user's progress
    this.progressService.addBonusPoints(amount);
    
    console.log(`Successfully granted ${amount} bonus points`);
  }

  unlockTheme(themeId: string): void {
    this.unlockedRewards.update(rewards => ({
      ...rewards,
      themes: [...rewards.themes, themeId]
    }));
    
    // Save to Firestore
    this.databaseService.saveRewardsAuto(this.unlockedRewards()).subscribe({
      error: (error: Error) => console.error('[RewardService] Failed to save theme unlock:', error)
    });
  }

  unlockHints(count: number): void {
    this.unlockedRewards.update(rewards => ({
      ...rewards,
      hints: rewards.hints + count
    }));
    
    // Save to Firestore
    this.databaseService.saveRewardsAuto(this.unlockedRewards()).subscribe({
      error: (error: Error) => console.error('[RewardService] Failed to save hints unlock:', error)
    });
  }

  unlockAvatarFrame(frameId: string): void {
    this.unlockedRewards.update(rewards => ({
      ...rewards,
      avatarFrames: [...rewards.avatarFrames, frameId]
    }));
    
    // Save to Firestore
    this.databaseService.saveRewardsAuto(this.unlockedRewards()).subscribe({
      error: (error: Error) => console.error('[RewardService] Failed to save avatar frame unlock:', error)
    });
  }

  getUnlockedThemes(): string[] {
    return this.unlockedRewards().themes;
  }

  getAvailableHints(): number {
    return this.unlockedRewards().hints;
  }

  getUnlockedAvatarFrames(): string[] {
    return this.unlockedRewards().avatarFrames;
  }

  private initializeRewards(): void {
    this.checkAndMigrateData().subscribe({
      next: () => {
        this.loadFromFirestore();
      },
      error: (error: Error) => {
        console.error('[RewardService] Migration failed:', error);
        this.loadFromFirestore();
      }
    });
  }

  private loadFromFirestore(): void {
    this.databaseService.loadRewardsAuto().subscribe({
      next: (rewards) => {
        this.unlockedRewards.set(rewards || this.getDefaultRewards());
        console.log('[RewardService] Rewards loaded from Firestore');
      },
      error: (error: Error) => {
        console.error('[RewardService] Failed to load rewards:', error);
      }
    });
  }

  private checkAndMigrateData(): Observable<void> {
    const userId = this.authService.getUserId();
    if (!userId) return of(undefined);

    // Check if user has data in Firestore
    return this.databaseService.loadRewardsAuto().pipe(
      switchMap(cloudRewards => {
        if (cloudRewards) {
          // Data exists in Firestore, no migration needed
          console.log('[RewardService] Data already exists in Firestore, skipping migration');
          return of(undefined);
        }

        // Check for localStorage data to migrate
        const localData = this.checkLocalStorageData(userId);
        if (localData) {
          console.log('[RewardService] Migrating localStorage data to Firestore');
          return this.databaseService.saveRewardsAuto(localData).pipe(
            tap(() => {
              this.clearLocalStorageData(userId);
              console.log('[RewardService] Migration completed successfully');
            })
          );
        }

        // No data to migrate
        console.log('[RewardService] No localStorage data to migrate');
        return of(undefined);
      }),
      catchError((error: Error) => {
        console.error('[RewardService] Migration error:', error);
        return of(undefined);
      })
    );
  }

  private checkLocalStorageData(userId: string): UserRewards | null {
    const key = `user_rewards_${userId}`;
    const stored = localStorage.getItem(key);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (error) {
        console.error('[RewardService] Failed to parse localStorage data:', error);
        return null;
      }
    }
    return null;
  }

  private clearLocalStorageData(userId: string): void {
    const key = `user_rewards_${userId}`;
    localStorage.removeItem(key);
    console.log('[RewardService] Cleared localStorage data');
  }

  private getDefaultRewards(): UserRewards {
    return { themes: [], hints: 0, avatarFrames: [] };
  }
}
