import { Component, ChangeDetectionStrategy, input, output, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ExerciseCategory } from '../../models/exercise.model';

@Component({
  selector: 'app-category-card',
  imports: [CommonModule],
  templateUrl: './category-card.html',
  styleUrl: './category-card.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CategoryCardComponent {
  category = input.required<ExerciseCategory | string>();
  select = output<ExerciseCategory | string>();

  categoryInfo = computed(() => {
    const cat = this.category();
    
    // Handle custom category
    if (cat === 'custom') {
      return {
        icon: '✏️',
        name: 'Custom',
        description: 'Your personalized exercises'
      };
    }
    
    const info: Record<ExerciseCategory, { icon: string; name: string; description: string }> = {
      [ExerciseCategory.DAILY_LIFE]: {
        icon: '🏠',
        name: 'Daily Life',
        description: 'Everyday routines, conversations, and dining'
      },
      [ExerciseCategory.TRAVEL_TRANSPORTATION]: {
        icon: '✈️',
        name: 'Travel & Transportation',
        description: 'Getting around and exploring new places'
      },
      [ExerciseCategory.EDUCATION_WORK]: {
        icon: '💼',
        name: 'Education & Work',
        description: 'Learning and professional environments'
      },
      [ExerciseCategory.HEALTH_WELLNESS]: {
        icon: '💪',
        name: 'Health & Wellness',
        description: 'Medical care, fitness, and physical wellness'
      },
      [ExerciseCategory.SOCIETY_SERVICES]: {
        icon: '🏛️',
        name: 'Society & Services',
        description: 'Public services, shopping, and community'
      },
      [ExerciseCategory.CULTURE_ARTS]: {
        icon: '🎭',
        name: 'Culture & Arts',
        description: 'Entertainment, arts, and cultural practices'
      },
      [ExerciseCategory.SCIENCE_ENVIRONMENT]: {
        icon: '🌍',
        name: 'Science & Environment',
        description: 'Technology, nature, and environmental topics'
      },
      [ExerciseCategory.PHILOSOPHY_BELIEFS]: {
        icon: '🧠',
        name: 'Philosophy & Beliefs',
        description: 'Ethics, spirituality, law, politics, and history'
      }
    };
    return info[cat as ExerciseCategory];
  });

  onSelect(): void {
    this.select.emit(this.category());
  }
}
