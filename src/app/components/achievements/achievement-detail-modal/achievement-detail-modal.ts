import { Component, ChangeDetectionStrategy, input, output, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Achievement, AchievementProgress, RewardType } from '../../../models/achievement.model';

@Component({
  selector: 'app-achievement-detail-modal',
  imports: [CommonModule],
  templateUrl: './achievement-detail-modal.html',
  styleUrl: './achievement-detail-modal.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AchievementDetailModal {
  achievement = input.required<Achievement>();
  progress = input.required<AchievementProgress | undefined>();

  close = output<void>();
  share = output<Achievement>();
  claim = output<Achievement>();

  @HostListener('document:keydown.escape')
  onEscapeKey(): void {
    this.close.emit();
  }

  formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  getRewardIcon(type: RewardType): string {
    const icons: Record<RewardType, string> = {
      [RewardType.CREDITS]: '💰',
      [RewardType.THEME]: '🎨',
      [RewardType.HINTS]: '💡',
      [RewardType.AVATAR_FRAME]: '🖼️'
    };
    return icons[type];
  }

  handleOverlayClick(): void {
    this.close.emit();
  }

  handleContentClick(event: Event): void {
    event.stopPropagation();
  }

  handleShare(): void {
    this.share.emit(this.achievement());
  }

  handleClaim(): void {
    this.claim.emit(this.achievement());
  }

  canClaim(): boolean {
    const achievement = this.achievement();
    return achievement.unlocked && !achievement.rewardsClaimed;
  }
}
