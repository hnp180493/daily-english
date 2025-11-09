import { Component, inject, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { FavoriteService } from '../../services/favorite.service';
import { ExerciseService } from '../../services/exercise.service';
import { Exercise } from '../../models/exercise.model';
import { ProgressService } from '../../services/progress.service';

@Component({
  selector: 'app-favorites',
  imports: [CommonModule],
  templateUrl: './favorites.html',
  styleUrl: './favorites.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FavoritesComponent {
  private favoriteService = inject(FavoriteService);
  private exerciseService = inject(ExerciseService);
  private progressService = inject(ProgressService);
  private router = inject(Router);

  private allExercises = toSignal(this.exerciseService.getAllExercises(), { initialValue: [] });
  
  favoriteExercises = computed(() => {
    const favoriteIds = this.favoriteService.favoriteIds();
    return this.allExercises().filter(ex => favoriteIds.includes(ex.id));
  });

  hasFavorites = computed(() => this.favoriteExercises().length > 0);

  getExerciseStatus(exerciseId: string) {
    return this.progressService.getExerciseStatus(exerciseId);
  }

  getLevelLabel(level: string): string {
    const labels: Record<string, string> = {
      'beginner': 'Cơ bản',
      'intermediate': 'Trung cấp',
      'advanced': 'Nâng cao'
    };
    return labels[level] || level;
  }

  getCategoryLabel(category: string): string {
    const labels: Record<string, string> = {
      'daily-life': 'Cuộc sống hàng ngày',
      'travel-transportation': 'Du lịch & Giao thông',
      'education-work': 'Giáo dục & Công việc',
      'health-wellness': 'Sức khỏe & Thể chất',
      'society-services': 'Xã hội & Dịch vụ',
      'culture-arts': 'Văn hóa & Nghệ thuật',
      'science-environment': 'Khoa học & Môi trường',
      'philosophy-beliefs': 'Triết học & Tín ngưỡng'
    };
    return labels[category] || category;
  }

  removeFavorite(exerciseId: string, event: Event): void {
    event.stopPropagation();
    this.favoriteService.removeFavorite(exerciseId);
  }

  startExercise(exercise: Exercise): void {
    this.router.navigate(['/exercise', exercise.id]);
  }

  goBack(): void {
    this.router.navigate(['/home']);
  }
}
