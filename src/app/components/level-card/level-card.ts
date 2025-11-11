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
        description: 'Build your foundation with everyday phrases and simple grammar. Perfect for beginners!'
      },
      [DifficultyLevel.INTERMEDIATE]: {
        icon: '⭐',
        name: 'Intermediate',
        description: 'Expand your skills with natural conversations and practical expressions for daily life.'
      },
      [DifficultyLevel.ADVANCED]: {
        icon: '👑',
        name: 'Advanced',
        description: 'Master complex topics, idioms, and professional communication like a native speaker.'
      }
    };
    return info[this.level()];
  });

  onSelect(): void {
    this.select.emit(this.level());
  }
}
