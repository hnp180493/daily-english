import { Component, ChangeDetectionStrategy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AchievementService } from '../../services/achievement.service';
import { PointsAnimationService } from '../../services/points-animation.service';
import { Achievement, AchievementType, RarityLevel, AchievementProgress } from '../../models/achievement.model';
import { AchievementCard } from './achievement-card/achievement-card';
import { AchievementDetailModal } from './achievement-detail-modal/achievement-detail-modal';
import { AchievementFilters } from './achievement-filters/achievement-filters';

@Component({
  selector: 'app-achievements',
  imports: [CommonModule, AchievementCard, AchievementDetailModal, AchievementFilters],
  templateUrl: './achievements.html',
  styleUrl: './achievements.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class Achievements {
  private achievementService = inject(AchievementService);
  private pointsAnimationService = inject(PointsAnimationService);

  // Filter signals
  selectedType = signal<AchievementType | 'all'>('all');
  selectedStatus = signal<'all' | 'unlocked' | 'locked' | 'in-progress'>('all');
  selectedRarity = signal<RarityLevel | 'all'>('all');
  
  // Modal signal
  selectedAchievement = signal<Achievement | null>(null);

  // Computed signals
  achievements = computed(() => this.achievementService.getAllAchievements());
  
  unlockedAchievements = computed(() => 
    this.achievementService.getUnlockedAchievements()
  );

  filteredAchievements = computed(() => {
    const achievements = this.achievements();
    const type = this.selectedType();
    const status = this.selectedStatus();
    const rarity = this.selectedRarity();

    return achievements.filter(a => {
      // Type filter
      if (type !== 'all' && a.type !== type) return false;
      
      // Status filter
      if (status === 'unlocked' && !a.unlocked) return false;
      if (status === 'locked' && a.unlocked) return false;
      if (status === 'in-progress') {
        if (a.unlocked) return false;
        if (!a.progress || a.progress.percentage === 0) return false;
      }
      
      // Rarity filter
      if (rarity !== 'all' && a.rarity !== rarity) return false;
      
      return true;
    });
  });

  completionPercentage = computed(() => {
    const total = this.achievements().length;
    const unlocked = this.unlockedAchievements().length;
    return total > 0 ? Math.round((unlocked / total) * 100) : 0;
  });

  unclaimedCount = computed(() => {
    return this.achievements().filter(a => a.unlocked && !a.rewardsClaimed).length;
  });

  // Filter handlers
  onTypeChange(type: AchievementType | 'all'): void {
    this.selectedType.set(type);
  }

  onStatusChange(status: 'all' | 'unlocked' | 'locked' | 'in-progress'): void {
    this.selectedStatus.set(status);
  }

  onRarityChange(rarity: RarityLevel | 'all'): void {
    this.selectedRarity.set(rarity);
  }

  // Modal handlers
  showDetails(achievement: Achievement): void {
    this.selectedAchievement.set(achievement);
  }

  closeModal(): void {
    this.selectedAchievement.set(null);
  }

  getProgress(achievement: Achievement): AchievementProgress | undefined {
    return achievement.progress;
  }

  async shareAchievement(achievement: Achievement): Promise<void> {
    // Check if Web Share API is available
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Achievement Unlocked: ${achievement.name}`,
          text: `I just unlocked the "${achievement.name}" achievement in English Practice! ${achievement.description}`,
          url: window.location.origin + '/achievements'
        });
      } catch (error) {
        console.error('Error sharing:', error);
        this.fallbackShare(achievement);
      }
    } else {
      this.fallbackShare(achievement);
    }
  }

  private fallbackShare(achievement: Achievement): void {
    // Copy link to clipboard as fallback
    const shareText = `I just unlocked the "${achievement.name}" achievement in English Practice! ${achievement.description}\n\n${window.location.origin}/achievements`;
    
    if (navigator.clipboard) {
      navigator.clipboard.writeText(shareText).then(() => {
        alert('Achievement link copied to clipboard!');
      }).catch(err => {
        console.error('Failed to copy:', err);
      });
    } else {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = shareText;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        alert('Achievement link copied to clipboard!');
      } catch (err) {
        console.error('Failed to copy:', err);
      }
      document.body.removeChild(textArea);
    }
  }

  exportAchievements(): void {
    const exportData = {
      exportDate: new Date().toISOString(),
      totalAchievements: this.achievements().length,
      unlockedAchievements: this.unlockedAchievements().length,
      completionPercentage: this.completionPercentage(),
      achievements: this.achievements().map(a => ({
        id: a.id,
        name: a.name,
        description: a.description,
        type: a.type,
        rarity: a.rarity,
        unlocked: a.unlocked,
        unlockedAt: a.unlockedAt,
        progress: a.progress
      }))
    };

    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `achievements-export-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  // Claim rewards for an achievement
  claimRewards(achievement: Achievement): void {
    if (!achievement.unlocked || achievement.rewardsClaimed) {
      return;
    }
    
    console.log(`[Achievements] Claiming rewards for: ${achievement.name}`);
    
    // Calculate rewards before claiming
    const totalCredits = achievement.rewards
      .filter(r => r.type === 'credits')
      .reduce((sum, r) => sum + (typeof r.value === 'number' ? r.value : 0), 0);
    
    console.log(`[Achievements] Total credits to claim: ${totalCredits}`);
    
    // Mark as claimed immediately to update button state
    this.achievementService.markAsClaimed(achievement.id);
    
    // Then trigger points animation
    if (totalCredits > 0) {
      // Find the achievement card element that was clicked
      const achievementCard = document.querySelector(`[data-achievement-id="${achievement.id}"]`);
      
      if (achievementCard) {
        // Trigger points animation and grant rewards after it completes
        this.pointsAnimationService.triggerPointsAnimation(totalCredits, achievementCard as HTMLElement)
          .then(() => {
            // Grant rewards after animation completes
            this.achievementService.grantRewards(achievement.id);
          });
      } else {
        // Fallback: grant immediately if element not found
        this.achievementService.grantRewards(achievement.id);
      }
    } else {
      // No credits, just grant other rewards immediately
      this.achievementService.grantRewards(achievement.id);
    }
  }
}
