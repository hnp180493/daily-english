import { UserAchievementData } from '../../models/achievement.model';

/**
 * Utility for compressing and decompressing achievement data
 * Reduces storage size by using short keys
 */
export class AchievementCompressor {
  /**
   * Compress achievement data for storage
   */
  static compress(data: UserAchievementData): any {
    const compressed = {
      u: data.userId,
      ul: data.unlockedAchievements.map((ua) => ({
        id: ua.achievementId,
        at: ua.unlockedAt.getTime(),
        cl: ua.rewardsClaimed
      })),
      p: Object.entries(data.progress).reduce((acc, [key, value]) => {
        acc[key] = {
          c: value.current,
          r: value.required,
          pc: value.percentage,
          u: value.lastUpdated.getTime()
        };
        return acc;
      }, {} as any),
      le: data.lastEvaluated.getTime()
    };

    // Debug: Log claimed achievements
    const claimedCount = compressed.ul.filter((ua: any) => ua.cl).length;
    if (claimedCount > 0) {
      console.log(`[AchievementCompressor] Compressing ${claimedCount} claimed achievements`);
    }

    return compressed;
  }

  /**
   * Decompress achievement data from storage
   */
  static decompress(compressed: any): UserAchievementData {
    return {
      userId: compressed.u || '',
      unlockedAchievements: (compressed.ul || []).map((ua: any) => ({
        achievementId: ua.id,
        unlockedAt: new Date(ua.at),
        rewardsClaimed: ua.cl ?? false
      })),
      progress: Object.entries(compressed.p || {}).reduce((acc, [key, value]: [string, any]) => {
        acc[key] = {
          current: value.c,
          required: value.r,
          percentage: value.pc,
          lastUpdated: new Date(value.u)
        };
        return acc;
      }, {} as any),
      lastEvaluated: new Date(compressed.le || 0)
    };
  }

  /**
   * Check if data is in compressed format
   */
  static isCompressed(data: any): boolean {
    return data && typeof data === 'object' && 'ul' in data && 'p' in data;
  }
}
