import { Injectable } from '@angular/core';
import {
  Achievement,
  AchievementType,
  AchievementProgress
} from '../models/achievement.model';
import { UserProgress, UserProgressHelper } from '../models/exercise.model';
import { ACHIEVEMENT_THRESHOLDS } from '../models/achievement-config';

/**
 * Service for calculating achievement progress
 * All methods are pure functions with no side effects
 */
@Injectable({
  providedIn: 'root'
})
export class AchievementProgressService {
  /**
   * Main method to calculate progress for an achievement
   */
  calculateProgress(achievement: Achievement, progress: UserProgress): AchievementProgress {
    try {
      switch (achievement.type) {
        case AchievementType.MILESTONE:
          return this.calculateMilestoneProgress(achievement, progress);
        case AchievementType.STREAK:
          return this.calculateStreakProgress(achievement, progress);
        case AchievementType.PERFORMANCE:
          return this.calculatePerformanceProgress(achievement, progress);
        case AchievementType.CATEGORY_MASTER:
          return this.calculateCategoryProgress(achievement, progress);
        default:
          return this.getSafeDefault(achievement);
      }
    } catch (error) {
      console.error('[AchievementProgressService] Calculation error:', error);
      return this.getSafeDefault(achievement);
    }
  }

  /**
   * Calculate progress for milestone achievements
   */
  calculateMilestoneProgress(
    achievement: Achievement,
    progress: UserProgress
  ): AchievementProgress {
    const current = UserProgressHelper.getAttemptsCount(progress);
    const required = this.getMilestoneThreshold(achievement.id);
    const description = `${current} out of ${required} exercises completed`;

    return {
      achievementId: achievement.id,
      current,
      required,
      percentage: Math.min(Math.round((current / required) * 100), 100),
      description,
      lastUpdated: new Date()
    };
  }

  /**
   * Calculate progress for streak achievements
   */
  calculateStreakProgress(
    achievement: Achievement,
    progress: UserProgress
  ): AchievementProgress {
    const current = progress.currentStreak || 0;
    const required = this.getStreakThreshold(achievement.id);
    const description = `Current streak: ${current} days, Required: ${required} days`;

    return {
      achievementId: achievement.id,
      current,
      required,
      percentage: Math.min(Math.round((current / required) * 100), 100),
      description,
      lastUpdated: new Date()
    };
  }

  /**
   * Calculate progress for performance achievements
   * Most performance achievements are binary (unlocked or not)
   */
  calculatePerformanceProgress(
    achievement: Achievement,
    progress: UserProgress
  ): AchievementProgress {
    // Binary achievements - either complete or not
    return {
      achievementId: achievement.id,
      current: 0,
      required: 1,
      percentage: 0,
      description: 'Complete the required criteria',
      lastUpdated: new Date()
    };
  }

  /**
   * Calculate progress for category master achievements
   */
  calculateCategoryProgress(
    achievement: Achievement,
    progress: UserProgress
  ): AchievementProgress {
    // For now, simplified progress
    // Full implementation would need access to all achievements
    return {
      achievementId: achievement.id,
      current: 0,
      required: 100,
      percentage: 0,
      description: 'Complete more exercises in this category',
      lastUpdated: new Date()
    };
  }

  /**
   * Get milestone threshold for achievement ID
   */
  private getMilestoneThreshold(achievementId: string): number {
    const threshold =
      ACHIEVEMENT_THRESHOLDS.milestone[
        achievementId as keyof typeof ACHIEVEMENT_THRESHOLDS.milestone
      ];
    return threshold || 0;
  }

  /**
   * Get streak threshold for achievement ID
   */
  private getStreakThreshold(achievementId: string): number {
    const threshold =
      ACHIEVEMENT_THRESHOLDS.streak[
        achievementId as keyof typeof ACHIEVEMENT_THRESHOLDS.streak
      ];
    return threshold || 0;
  }

  /**
   * Get safe default progress when calculation fails
   */
  private getSafeDefault(achievement: Achievement): AchievementProgress {
    return {
      achievementId: achievement.id,
      current: 0,
      required: 1,
      percentage: 0,
      description: 'Unable to calculate progress',
      lastUpdated: new Date()
    };
  }
}
