import { Injectable, inject, signal } from '@angular/core';
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

  private currentUserId: string | null = null;

  constructor() {
    // Wait for auth to be stable before initializing
    this.initAfterAuth();
  }

  private async initAfterAuth(): Promise<void> {
    await this.authService.waitForAuth();
    
    const user = this.authService.currentUser();
    const userId = user?.uid || null;
    
    if (userId) {
      this.currentUserId = userId;
      this.initializeRewards();
    } else {
      this.unlockedRewards.set(this.getDefaultRewards());
    }
    this.isInitialized = true;
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
    this.loadAndMigrateData();
  }

  private loadAndMigrateData(): void {
    const userId = this.authService.getUserId();
    if (!userId) return;

    // Single request to load data
    this.databaseService.loadRewardsAuto().subscribe({
      next: cloudRewards => {
        if (cloudRewards) {
          // Data exists in Firestore, use it directly
          this.unlockedRewards.set(cloudRewards);
          console.log('[RewardService] Rewards loaded from Firestore');
          return;
        }

        // No cloud data - check for localStorage data to migrate
        const localData = this.checkLocalStorageData(userId);
        if (localData) {
          console.log('[RewardService] Migrating localStorage data to Firestore');
          this.unlockedRewards.set(localData); // Set immediately
          this.databaseService.saveRewardsAuto(localData).subscribe({
            next: () => {
              this.clearLocalStorageData(userId);
              console.log('[RewardService] Migration completed successfully');
            },
            error: (error: Error) => {
              console.error('[RewardService] Migration save failed:', error);
            }
          });
        } else {
          // No data anywhere
          this.unlockedRewards.set(this.getDefaultRewards());
          console.log('[RewardService] No rewards found, using defaults');
        }
      },
      error: (error: Error) => {
        console.error('[RewardService] Failed to load rewards:', error);
        this.unlockedRewards.set(this.getDefaultRewards());
      }
    });
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
