import { Component, ChangeDetectionStrategy, input, output, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ExerciseCategory } from '../../models/exercise.model';
import { TranslationService } from '../../services/translation.service';

@Component({
  selector: 'app-category-card',
  imports: [CommonModule],
  templateUrl: './category-card.html',
  styleUrl: './category-card.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CategoryCardComponent {
  protected translate = inject(TranslationService);
  category = input.required<ExerciseCategory | string>();
  select = output<ExerciseCategory | string>();

  categoryInfo = computed(() => {
    const cat = this.category();

    if (cat === 'custom') {
      return {
        icon: '✏️',
        name: this.translate.t('category.custom.name'),
        description: this.translate.t('category.custom.description')
      };
    }

    const meta: Record<ExerciseCategory, { icon: string; nameKey: string; descKey: string }> = {
      [ExerciseCategory.DAILY_LIFE]: {
        icon: '🏠',
        nameKey: 'category.daily_life.name',
        descKey: 'category.daily_life.description'
      },
      [ExerciseCategory.TRAVEL_TRANSPORTATION]: {
        icon: '✈️',
        nameKey: 'category.travel.name',
        descKey: 'category.travel.description'
      },
      [ExerciseCategory.EDUCATION_WORK]: {
        icon: '💼',
        nameKey: 'category.education_work.name',
        descKey: 'category.education_work.description'
      },
      [ExerciseCategory.HEALTH_WELLNESS]: {
        icon: '💪',
        nameKey: 'category.health.name',
        descKey: 'category.health.description'
      },
      [ExerciseCategory.SOCIETY_SERVICES]: {
        icon: '🏛️',
        nameKey: 'category.society.name',
        descKey: 'category.society.description'
      },
      [ExerciseCategory.CULTURE_ARTS]: {
        icon: '🎭',
        nameKey: 'category.culture.name',
        descKey: 'category.culture.description'
      },
      [ExerciseCategory.SCIENCE_ENVIRONMENT]: {
        icon: '🌍',
        nameKey: 'category.science.name',
        descKey: 'category.science.description'
      },
      [ExerciseCategory.PHILOSOPHY_BELIEFS]: {
        icon: '🧠',
        nameKey: 'category.philosophy.name',
        descKey: 'category.philosophy.description'
      }
    };

    const data = meta[cat as ExerciseCategory];
    return {
      icon: data.icon,
      name: this.translate.t(data.nameKey),
      description: this.translate.t(data.descKey)
    };
  });

  onSelect(): void {
    this.select.emit(this.category());
  }
}
