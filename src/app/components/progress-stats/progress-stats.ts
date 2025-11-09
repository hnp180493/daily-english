import { Component, ChangeDetectionStrategy, input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-progress-stats',
  imports: [CommonModule],
  templateUrl: './progress-stats.html',
  styleUrl: './progress-stats.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProgressStatsComponent {
  streak = input<number>(0);
  achievements = input<string[]>([]);

  achievementBadges = computed(() => {
    return this.achievements().map(achievement => {
      const badges: { [key: string]: { icon: string; label: string } } = {
        'first-exercise': { icon: '🎯', label: 'First Exercise' },
        'bright-mind': { icon: '💡', label: 'Bright Mind' },
        '1-day-streak': { icon: '🔥', label: '1 Day Streak' },
        '7-day-streak': { icon: '🏆', label: '7 Day Streak' }
      };
      return badges[achievement] || { icon: '⭐', label: achievement };
    });
  });
}
