import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Achievement, AchievementProgress } from '../../../models/achievement.model';

@Component({
  selector: 'app-achievement-card',
  imports: [CommonModule],
  templateUrl: './achievement-card.html',
  styleUrl: './achievement-card.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AchievementCard {
  achievement = input.required<Achievement>();
  progress = input.required<AchievementProgress | undefined>();

  cardClick = output<Achievement>();
  claimClick = output<Achievement>();

  getAriaLabel(): string {
    const achievement = this.achievement();
    const progress = this.progress();
    
    if (achievement.unlocked) {
      return `${achievement.name}, ${achievement.rarity} achievement, unlocked on ${this.formatDate(achievement.unlockedAt!)}`;
    } else if (progress) {
      return `${achievement.name}, ${achievement.rarity} achievement, locked, ${progress.percentage}% complete`;
    } else {
      return `${achievement.name}, ${achievement.rarity} achievement, locked`;
    }
  }

  formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  handleClick(): void {
    this.cardClick.emit(this.achievement());
  }

  handleKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.handleClick();
    }
  }

  handleClaimClick(event: Event): void {
    event.stopPropagation(); // Prevent card click
    this.claimClick.emit(this.achievement());
  }

  canClaim(): boolean {
    const achievement = this.achievement();
    return achievement.unlocked && !achievement.rewardsClaimed;
  }
}
