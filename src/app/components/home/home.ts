import { Component, ChangeDetectionStrategy, inject, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { DifficultyLevel, ExerciseCategory } from '../../models/exercise.model';
import { ExerciseService } from '../../services/exercise.service';
import { CustomExerciseService } from '../../services/custom-exercise.service';
import { LevelCardComponent } from '../level-card/level-card';
import { CategoryCardComponent } from '../category-card/category-card';
import { LoadingSpinnerComponent } from '../loading-spinner/loading-spinner';

@Component({
  selector: 'app-home',
  imports: [CommonModule, LevelCardComponent, CategoryCardComponent, LoadingSpinnerComponent],
  templateUrl: './home.html',
  styleUrl: './home.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HomeComponent {
  private exerciseService = inject(ExerciseService);
  private customExerciseService = inject(CustomExerciseService);
  private router = inject(Router);
  
  isLoading = signal(true);

  levels = [DifficultyLevel.BEGINNER, DifficultyLevel.INTERMEDIATE, DifficultyLevel.ADVANCED];
  categories = Object.values(ExerciseCategory);
  selectedLevel = signal<DifficultyLevel | null>(null);
  selectedCategory = signal<ExerciseCategory | string | null>(null);

  // Get all custom exercises as a signal
  private allCustomExercises = toSignal(
    this.customExerciseService.getCustomExercises(),
    { initialValue: [] }
  );

  // Check if user has custom exercises for the selected level
  hasCustomExercises = computed(() => {
    const level = this.selectedLevel();
    if (!level) return false;
    
    const customExercises = this.allCustomExercises();
    return customExercises.some(exercise => exercise.level === level);
  });

  // Display categories including custom if applicable
  displayCategories = computed(() => {
    const baseCategories = Object.values(ExerciseCategory);
    if (this.hasCustomExercises()) {
      return [...baseCategories, 'custom'];
    }
    return baseCategories;
  });

  constructor() {
    // Hide loading after custom exercises are loaded
    effect(() => {
      const customExercises = this.allCustomExercises();
      setTimeout(() => this.isLoading.set(false), 300);
    });
  }

  onLevelSelect(level: DifficultyLevel): void {
    this.selectedLevel.set(level);
    this.exerciseService.setLevel(level);
  }

  onCategorySelect(category: ExerciseCategory | string): void {
    this.selectedCategory.set(category);
    
    // Handle custom category navigation
    if (category === 'custom') {
      const level = this.selectedLevel();
      this.router.navigate(['/exercises/custom'], {
        queryParams: level ? { level } : {}
      });
    } else {
      this.exerciseService.setCategory(category as ExerciseCategory);
    }
  }

  navigateToExercises(): void {
    const level = this.selectedLevel();
    const category = this.selectedCategory();
    
    console.log('Navigating to exercises with:', { level, category });
    
    if (level && category) {
      this.router.navigate(['/exercises'], {
        queryParams: { 
          level: level,
          category: category 
        }
      }).catch(error => {
        console.error('Navigation error:', error);
      });
    } else {
      this.router.navigate(['/exercises']).catch(error => {
        console.error('Navigation error:', error);
      });
    }
  }
}
