import { Component, ChangeDetectionStrategy, input, output, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DifficultyLevel } from '../../models/exercise.model';

@Component({
  selector: 'app-level-card',
  imports: [CommonModule],
  templateUrl: './level-card.html',
  styleUrl: './level-card.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LevelCardComponent {
  level = input.required<DifficultyLevel>();
  selected = input<boolean>(false);
  select = output<DifficultyLevel>();

  levelInfo = computed(() => {
    const info = {
      [DifficultyLevel.BEGINNER]: {
        icon: '🌱',
        name: 'Beginner',
        description: 'Perfect for those just starting their English journey. Simple sentences and basic vocabulary.'
      },
      [DifficultyLevel.INTERMEDIATE]: {
        icon: '⭐',
        name: 'Intermediate',
        description: 'For learners ready to tackle more complex sentences and varied vocabulary.'
      },
      [DifficultyLevel.ADVANCED]: {
        icon: '👑',
        name: 'Advanced',
        description: 'Challenge yourself with sophisticated texts and professional vocabulary.'
      }
    };
    return info[this.level()];
  });

  onSelect(): void {
    this.select.emit(this.level());
  }
}
