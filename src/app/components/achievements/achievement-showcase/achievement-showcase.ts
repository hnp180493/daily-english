import { Component, ChangeDetectionStrategy, inject, input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AchievementService } from '../../../services/achievement.service';
import { RarityLevel } from '../../../models/achievement.model';

interface RarityCount {
  level: RarityLevel;
  count: number;
}

@Component({
  selector: 'app-achievement-showcase',
  imports: [CommonModule, RouterModule],
  templateUrl: './achievement-showcase.html',
  styleUrl: './achievement-showcase.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AchievementShowcase {
  private achievementService = inject(AchievementService);

  userId = input<string>();
  maxDisplay = input<number>(3);

  recentAchievements = computed(() => 
    this.achievementService.getUnlockedAchievements()
      .sort((a, b) => {
        const dateA = a.unlockedAt ? new Date(a.unlockedAt).getTime() : 0;
        const dateB = b.unlockedAt ? new Date(b.unlockedAt).getTime() : 0;
        return dateB - dateA;
      })
      .slice(0, this.maxDisplay())
  );

  totalUnlocked = computed(() => this.achievementService.getUnlockedAchievements().length);
  
  totalAchievements = computed(() => this.achievementService.getAllAchievements().length);
  
  completionPercentage = computed(() => {
    const total = this.totalAchievements();
    const unlocked = this.totalUnlocked();
    return total > 0 ? Math.round((unlocked / total) * 100) : 0;
  });

  rarityDistribution = computed(() => this.calculateRarityDistribution());
  
  hasLegendary = computed(() => 
    this.achievementService.getUnlockedAchievements()
      .some(a => a.rarity === RarityLevel.LEGENDARY)
  );

  private calculateRarityDistribution(): RarityCount[] {
    const unlocked = this.achievementService.getUnlockedAchievements();
    const distribution: Record<RarityLevel, number> = {
      [RarityLevel.COMMON]: 0,
      [RarityLevel.RARE]: 0,
      [RarityLevel.EPIC]: 0,
      [RarityLevel.LEGENDARY]: 0
    };

    unlocked.forEach(achievement => {
      distribution[achievement.rarity]++;
    });

    return Object.entries(distribution)
      .filter(([_, count]) => count > 0)
      .map(([level, count]) => ({
        level: level as RarityLevel,
        count
      }));
  }

  formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  }
}
