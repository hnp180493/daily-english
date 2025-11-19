import { Injectable, inject, signal, computed, effect } from '@angular/core';
import { take } from 'rxjs/operators';
import {
  Achievement,
  AchievementType,
  UserAchievementData,
  MILESTONE_ACHIEVEMENTS,
  STREAK_ACHIEVEMENTS,
  PERFORMANCE_ACHIEVEMENTS,
  CATEGORY_MASTER_ACHIEVEMENTS,
  SPECIAL_CATEGORY_ACHIEVEMENTS,
  ULTIMATE_MASTER
} from '../models/achievement.model';
import { UserProgress } from '../models/exercise.model';
import { AuthService } from './auth.service';
import { ProgressService } from './progress.service';
import { NotificationService } from './notification.service';
import { RewardService } from './reward.service';
import { AchievementCriteriaService } from './achievement-criteria.service';
import { AchievementProgressService } from './achievement-progress.service';
import { AchievementStoreService } from './achievement-store.service';

/**
 * Main Achievement Service
 * Coordinates achievement evaluation, progress tracking, and state management
 */
@Injectable({
  providedIn: 'root'
})
export class AchievementService {
  private authService = inject(AuthService);
  private progressService = inject(ProgressService);
  private notificationService = inject(NotificationService);
  private rewardService = inject(RewardService);
  private criteriaService = inject(AchievementCriteriaService);
  private progressCalculator = inject(AchievementProgressService);
  private storeService = inject(AchievementStoreService);

  private allAchievements = signal<Achievement[]>([]);
  private userAchievementData = signal<UserAchievementData>(
    this.storeService.getDefaultUserData()
  );

  // Computed signals
  unlockedAchievements = computed(() => this.allAchievements().filter((a) => a.unlocked));
  lockedAchievements = computed(() => this.allAchievements().filter((a) => !a.unlocked));

  private isInitialized = false;
  private isInitialLoad = true;
  private evaluationQueue: UserProgress[] = [];
  private evaluationTimer: any = null;
  private readonly EVALUATION_DEBOUNCE_MS = 500;

  constructor() {
    this.initializeAchievements();

    effect(() => {
      const user = this.authService.currentUser();
      if (user && !this.isInitialized) {
        // Load from Firestore only once per user session
        this.isInitialized = true;
        this.loadFromFirestore();
      } else if (!user && !this.isInitialized) {
        // Guest user - initialize with default data and evaluate
        this.isInitialized = true;
        this.loadForGuestUser();
      }
    });

    setTimeout(() => {
      this.progressService.getUserProgress().subscribe((progress) => {
        if (this.isInitialized) {
          this.evaluateAchievements(progress);
        }
      });
    }, 100);
  }

  /**
   * Load achievement data for guest user (from localStorage)
   */
  private loadForGuestUser(): void {
    console.log('[AchievementService] Initializing achievements for guest user');
    
    // Load from localStorage if exists
    this.storeService.loadAchievementData().subscribe({
      next: (data) => {
        if (data) {
          console.log('[AchievementService] Loaded guest achievement data from localStorage');
          this.userAchievementData.set(data);
        } else {
          console.log('[AchievementService] No saved data, using default');
          this.userAchievementData.set(this.storeService.getDefaultUserData());
        }
        this.syncAchievementStates();
        this.performInitialEvaluation();
      },
      error: (error: Error) => {
        console.error('[AchievementService] Failed to load guest data:', error);
        this.userAchievementData.set(this.storeService.getDefaultUserData());
        this.syncAchievementStates();
        this.performInitialEvaluation();
      }
    });
  }

  /**
   * Load achievement data from Firestore
   */
  private loadFromFirestore(): void {
    this.storeService.migrateFromLocalStorage().subscribe({
      next: () => {
        this.storeService.loadAchievementData().subscribe({
          next: (data) => {
            if (data) {
              // Auto-cleanup old data format (one-time optimization)
              const originalSize = Object.keys(data.progress).length;
              const cleanedData = this.storeService.cleanupAchievementData(data);
              const cleanedSize = Object.keys(cleanedData.progress).length;

              if (cleanedSize < originalSize) {
                console.log(
                  `[AchievementService] Auto-cleanup: ${originalSize} -> ${cleanedSize} progress entries`
                );
                // Save cleaned data
                this.storeService.saveAchievementData(cleanedData).subscribe({
                  error: (error: Error) =>
                    console.error('[AchievementService] Failed to save cleaned data:', error)
                });
                this.userAchievementData.set(cleanedData);
              } else {
                this.userAchievementData.set(data);
              }

              this.syncAchievementStates();
              console.log('[AchievementService] Achievements loaded from Firestore');
            } else {
              console.log('[AchievementService] New user, using default achievement data');
            }
            this.performInitialEvaluation();
          },
          error: (error: Error) => {
            console.error('[AchievementService] Failed to load achievements:', error);
          }
        });
      },
      error: (error: Error) => {
        console.error('[AchievementService] Migration failed:', error);
      }
    });
  }

  /**
   * Sync achievement states with user data
   */
  private syncAchievementStates(): void {
    const userData = this.userAchievementData();
    const achievements = this.allAchievements().map((achievement) => {
      const unlockedData = userData.unlockedAchievements.find(
        (ua) => ua.achievementId === achievement.id
      );
      
      return {
        ...achievement,
        unlocked: !!unlockedData,
        unlockedAt: unlockedData?.unlockedAt,
        rewardsClaimed: unlockedData?.rewardsClaimed ?? false,
        progress: userData.progress[achievement.id]
      };
    });
    this.allAchievements.set(achievements);
  }

  /**
   * Perform initial evaluation for existing users
   * Only updates progress bars, doesn't auto-unlock achievements
   */
  private performInitialEvaluation(): void {
    this.progressService
      .getUserProgress()
      .pipe(take(1))
      .subscribe((progress) => {
        this.allAchievements().forEach((achievement) => {
          if (!achievement.unlocked) {
            const progressData = this.progressCalculator.calculateProgress(
              achievement,
              progress
            );
            const achievementIndex = this.allAchievements().findIndex(
              (a) => a.id === achievement.id
            );
            if (achievementIndex !== -1) {
              const achievements = [...this.allAchievements()];
              achievements[achievementIndex] = {
                ...achievements[achievementIndex],
                progress: progressData
              };
              this.allAchievements.set(achievements);
            }
          }
        });
        
        // Mark initial load as complete
        this.isInitialLoad = false;
      });
  }

  /**
   * Initialize achievements from model
   */
  private initializeAchievements(): void {
    const achievements: Achievement[] = [
      ...MILESTONE_ACHIEVEMENTS,
      ...STREAK_ACHIEVEMENTS,
      ...PERFORMANCE_ACHIEVEMENTS,
      ...CATEGORY_MASTER_ACHIEVEMENTS,
      ...SPECIAL_CATEGORY_ACHIEVEMENTS,
      ULTIMATE_MASTER
    ];

    const userData = this.userAchievementData();
    const initializedAchievements = achievements.map((achievement) => {
      const unlockedData = userData.unlockedAchievements.find(
        (ua) => ua.achievementId === achievement.id
      );
      return {
        ...achievement,
        unlocked: !!unlockedData,
        unlockedAt: unlockedData?.unlockedAt,
        rewardsClaimed: unlockedData?.rewardsClaimed ?? false,
        progress: userData.progress[achievement.id]
      };
    });

    this.allAchievements.set(initializedAchievements);
  }

  /**
   * Evaluate achievements with debouncing
   */
  evaluateAchievements(progress: UserProgress): void {
    this.evaluationQueue.push(progress);

    if (this.evaluationTimer) {
      clearTimeout(this.evaluationTimer);
    }

    this.evaluationTimer = setTimeout(() => {
      this.processEvaluationQueue();
    }, this.EVALUATION_DEBOUNCE_MS);
  }

  /**
   * Process evaluation queue
   */
  private processEvaluationQueue(): void {
    if (this.evaluationQueue.length === 0) return;

    const progress = this.evaluationQueue[this.evaluationQueue.length - 1];
    this.evaluationQueue = [];

    const newlyUnlocked: Achievement[] = [];
    const progressUpdates: string[] = [];

    this.allAchievements().forEach((achievement) => {
      if (!achievement.unlocked) {
        // Check if criteria met
        const criteriaMet = this.checkCriteria(achievement, progress);

        if (criteriaMet) {
          this.unlockAchievement(achievement.id);
          const unlockedAchievement = this.getAchievementById(achievement.id);
          if (unlockedAchievement) {
            newlyUnlocked.push(unlockedAchievement);
          }
        } else {
          // Update progress (without saving to Firestore yet)
          this.updateProgress(achievement, progress, false);
          
          // Track which achievements had progress updates
          const userData = this.userAchievementData();
          if (userData.progress[achievement.id]) {
            progressUpdates.push(achievement.id);
          }
        }
      }
    });

    // Only save if there are meaningful progress updates and no unlocks
    // This batches progress updates and reduces Firestore writes
    if (progressUpdates.length > 0 && newlyUnlocked.length === 0 && !this.isInitialLoad) {
      this.storeService.saveAchievementData(this.userAchievementData()).subscribe({
        next: () => console.log(`[AchievementService] Saved progress for ${progressUpdates.length} achievements`),
        error: (error: Error) =>
          console.error('[AchievementService] Failed to save progress updates:', error)
      });
    }

    // Show notifications
    if (newlyUnlocked.length > 0) {
      // Queue notifications for newly unlocked achievements
      console.log('[AchievementService] Newly unlocked achievements:', newlyUnlocked);
    }
  }

  /**
   * Check if achievement criteria are met
   */
  private checkCriteria(achievement: Achievement, progress: UserProgress): boolean {
    // Special handling for category master achievements that depend on other achievements
    if (achievement.type === AchievementType.CATEGORY_MASTER) {
      return this.checkCategoryMasterCriteria(achievement, progress);
    }

    return this.criteriaService.checkCriteria(achievement, progress);
  }

  /**
   * Check category master criteria (needs access to all achievements)
   */
  private checkCategoryMasterCriteria(
    achievement: Achievement,
    progress: UserProgress
  ): boolean {
    if (!progress.exerciseHistory) {
      return false;
    }

    // Use criteria service for basic category masters
    if (achievement.id.startsWith('master-') && !achievement.id.includes('-master-')) {
      return this.criteriaService.checkCategoryMasterCriteria(achievement, progress);
    }

    // Special category achievements
    if (achievement.id === 'ultimate-master') {
      const categoryMasters = this.allAchievements().filter(
        (a) =>
          a.type === AchievementType.CATEGORY_MASTER &&
          a.id.startsWith('master-') &&
          a.id !== 'ultimate-master' &&
          !a.id.includes('triple-category') &&
          !a.id.includes('half-master') &&
          !a.id.includes('perfectionist')
      );
      return categoryMasters.every((a) => a.unlocked);
    }

    if (achievement.id === 'triple-category-master') {
      const categoryMasters = this.allAchievements().filter(
        (a) =>
          a.type === AchievementType.CATEGORY_MASTER &&
          a.id.startsWith('master-') &&
          !a.id.includes('triple-category') &&
          !a.id.includes('half-master') &&
          !a.id.includes('perfectionist') &&
          !a.id.includes('ultimate') &&
          a.unlocked
      );
      return categoryMasters.length >= 3;
    }

    if (achievement.id === 'half-master') {
      const categoryMasters = this.allAchievements().filter(
        (a) =>
          a.type === AchievementType.CATEGORY_MASTER &&
          a.id.startsWith('master-') &&
          !a.id.includes('triple-category') &&
          !a.id.includes('half-master') &&
          !a.id.includes('perfectionist') &&
          !a.id.includes('ultimate') &&
          a.unlocked
      );
      return categoryMasters.length >= 4;
    }

    // Use criteria service for other category achievements
    return this.criteriaService.checkCategoryMasterCriteria(achievement, progress);
  }

  /**
   * Unlock an achievement
   */
  private unlockAchievement(achievementId: string): void {
    const achievementIndex = this.allAchievements().findIndex((a) => a.id === achievementId);
    if (achievementIndex === -1) return;

    const achievements = [...this.allAchievements()];
    const achievement = { ...achievements[achievementIndex] };

    achievement.unlocked = true;
    achievement.unlockedAt = new Date();
    achievement.rewardsClaimed = false;
    achievements[achievementIndex] = achievement;

    const userData = this.userAchievementData();
    
    // Remove progress for this achievement since it's now unlocked
    // This saves storage space - we only track progress for locked achievements
    const updatedProgress = { ...userData.progress };
    delete updatedProgress[achievementId];

    const updatedUserData = {
      ...userData,
      unlockedAchievements: [
        ...userData.unlockedAchievements,
        {
          achievementId,
          unlockedAt: new Date(),
          rewardsClaimed: false
        }
      ],
      progress: updatedProgress
    };

    this.userAchievementData.set(updatedUserData);

    // Save immediately
    this.storeService.saveAchievementData(updatedUserData).subscribe({
      next: () => console.log('[AchievementService] Achievement unlocked and saved'),
      error: (error: Error) =>
        console.error('[AchievementService] Failed to save achievement unlock:', error)
    });

    this.allAchievements.set(achievements);
  }

  /**
   * Update achievement progress
   */
  private updateProgress(
    achievement: Achievement,
    progress: UserProgress,
    saveToFirestore: boolean = true
  ): void {
    const progressData = this.progressCalculator.calculateProgress(achievement, progress);

    const userData = this.userAchievementData();
    const existingProgress = userData.progress[achievement.id];
    
    // Check if progress actually changed
    const hasChanged = !existingProgress || 
      existingProgress.current !== progressData.current ||
      existingProgress.required !== progressData.required;

    if (!hasChanged) {
      return; // No change, skip update
    }

    // Only save progress if there's meaningful progress (> 0%)
    // This reduces data stored in Firestore significantly
    const shouldSaveProgress = progressData.current > 0 && progressData.percentage > 0;

    const updatedProgress = shouldSaveProgress
      ? { ...userData.progress, [achievement.id]: progressData }
      : { ...userData.progress };

    // Remove progress entry if it's at 0
    if (!shouldSaveProgress && userData.progress[achievement.id]) {
      delete updatedProgress[achievement.id];
    }

    const updatedUserData = {
      ...userData,
      progress: updatedProgress
    };

    this.userAchievementData.set(updatedUserData);

    if (saveToFirestore && shouldSaveProgress) {
      this.storeService.saveAchievementData(updatedUserData).subscribe({
        error: (error: Error) =>
          console.error('[AchievementService] Failed to save progress update:', error)
      });
    }

    // Update achievement in array
    const achievementIndex = this.allAchievements().findIndex((a) => a.id === achievement.id);
    if (achievementIndex !== -1) {
      const achievements = [...this.allAchievements()];
      achievements[achievementIndex] = {
        ...achievements[achievementIndex],
        progress: progressData
      };
      this.allAchievements.set(achievements);
    }
  }

  /**
   * Mark achievement as claimed (updates UI immediately)
   */
  markAsClaimed(achievementId: string): void {
    const achievementIndex = this.allAchievements().findIndex((a) => a.id === achievementId);
    if (achievementIndex === -1) {
      console.warn(`[AchievementService] Achievement ${achievementId} not found`);
      return;
    }

    const achievement = this.allAchievements()[achievementIndex];

    if (!achievement.unlocked) {
      console.warn(`[AchievementService] Achievement ${achievementId} is not unlocked yet`);
      return;
    }

    if (achievement.rewardsClaimed) {
      console.warn(`[AchievementService] Rewards for ${achievementId} already claimed`);
      return;
    }

    const userData = this.userAchievementData();
    const unlockedIndex = userData.unlockedAchievements.findIndex(
      (ua) => ua.achievementId === achievementId
    );

    if (unlockedIndex === -1) {
      console.error(
        `[AchievementService] Achievement ${achievementId} not found in unlocked list`
      );
      return;
    }

    const updatedUnlocked = [...userData.unlockedAchievements];
    updatedUnlocked[unlockedIndex] = {
      ...updatedUnlocked[unlockedIndex],
      rewardsClaimed: true
    };

    const updatedUserData = {
      ...userData,
      unlockedAchievements: updatedUnlocked
    };

    // Update UI state immediately
    this.userAchievementData.set(updatedUserData);

    const achievements = [...this.allAchievements()];
    achievements[achievementIndex] = {
      ...achievement,
      rewardsClaimed: true
    };
    this.allAchievements.set(achievements);

    // Save to Firestore
    this.storeService.saveAchievementData(updatedUserData).subscribe({
      next: () => {
        console.log(`[AchievementService] Claim status saved for ${achievementId}`);
      },
      error: (error: Error) => {
        console.error(
          `[AchievementService] Failed to save claim status for ${achievementId}:`,
          error
        );
      }
    });
  }

  /**
   * Grant rewards for an achievement (called after animation completes)
   */
  grantRewards(achievementId: string): void {
    const achievement = this.getAchievementById(achievementId);
    if (!achievement) {
      console.warn(`[AchievementService] Achievement ${achievementId} not found`);
      return;
    }

    if (!achievement.unlocked || !achievement.rewardsClaimed) {
      console.warn(`[AchievementService] Cannot grant rewards for ${achievementId}`);
      return;
    }

    try {
      this.rewardService.grantRewards(achievement.rewards);
      console.log(`[AchievementService] Successfully granted rewards for ${achievementId}`);
    } catch (error) {
      console.error(
        `[AchievementService] Failed to grant rewards for ${achievementId}:`,
        error
      );
    }
  }

  /**
   * Claim rewards for an unlocked achievement (legacy method - kept for compatibility)
   */
  claimRewards(achievementId: string): void {
    this.markAsClaimed(achievementId);
    this.grantRewards(achievementId);
  }

  /**
   * Get all achievements
   */
  getAllAchievements(): Achievement[] {
    return this.allAchievements();
  }

  /**
   * Get unlocked achievements
   */
  getUnlockedAchievements(): Achievement[] {
    return this.unlockedAchievements();
  }

  /**
   * Get locked achievements
   */
  getLockedAchievements(): Achievement[] {
    return this.lockedAchievements();
  }

  /**
   * Get achievement by ID
   */
  getAchievementById(id: string): Achievement | undefined {
    return this.allAchievements().find((a) => a.id === id);
  }
}
