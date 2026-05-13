import { Component, ChangeDetectionStrategy, input, output, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DifficultyLevel } from '../../models/exercise.model';
import { TranslationService } from '../../services/translation.service';

@Component({
  selector: 'app-level-card',
  imports: [CommonModule],
  templateUrl: './level-card.html',
  styleUrl: './level-card.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LevelCardComponent {
  protected translate = inject(TranslationService);
  level = input.required<DifficultyLevel>();
  selected = input<boolean>(false);
  select = output<DifficultyLevel>();

  levelInfo = computed(() => {
    const info: Record<DifficultyLevel, { icon: string; nameKey: string; descKey: string }> = {
      [DifficultyLevel.BEGINNER]: {
        icon: '🌱',
        nameKey: 'level.beginner.name',
        descKey: 'level.beginner.description'
      },
      [DifficultyLevel.INTERMEDIATE]: {
        icon: '⭐',
        nameKey: 'level.intermediate.name',
        descKey: 'level.intermediate.description'
      },
      [DifficultyLevel.ADVANCED]: {
        icon: '👑',
        nameKey: 'level.advanced.name',
        descKey: 'level.advanced.description'
      }
    };
    const data = info[this.level()];
    return {
      icon: data.icon,
      name: this.translate.t(data.nameKey),
      description: this.translate.t(data.descKey)
    };
  });

  onSelect(): void {
    this.select.emit(this.level());
  }
}
