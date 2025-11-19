import { Component, ChangeDetectionStrategy, OnInit, inject, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, NavigationEnd } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs/operators';
import { DifficultyLevel, ExerciseCategory } from '../../models/exercise.model';
import { ExerciseService } from '../../services/exercise.service';
import { CustomExerciseService } from '../../services/custom-exercise.service';
import { CurriculumService } from '../../services/curriculum.service';
import { AdaptiveEngineService } from '../../services/adaptive-engine.service';
import { StreakService } from '../../services/streak.service';
import { AuthService } from '../../services/auth.service';
import { LevelCardComponent } from '../level-card/level-card';
import { CategoryCardComponent } from '../category-card/category-card';
import { LoadingSpinnerComponent } from '../loading-spinner/loading-spinner';

@Component({
  selector: 'app-home',
  imports: [CommonModule, RouterModule, LevelCardComponent, CategoryCardComponent, LoadingSpinnerComponent],
  templateUrl: './home.html',
  styleUrl: './home.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HomeComponent implements OnInit {
  private exerciseService = inject(ExerciseService);
  private customExerciseService = inject(CustomExerciseService);
  private curriculumService = inject(CurriculumService);
  private adaptiveEngineService = inject(AdaptiveEngineService);
  private streakService = inject(StreakService);
  private authService = inject(AuthService);
  private router = inject(Router);
  
  isLoading = signal(true);
  isAuthenticated = computed(() => this.authService.isAuthenticated());
  
  // Learning path data
  currentPath = this.curriculumService.currentPath;
  currentModule = this.curriculumService.currentModule;
  pathProgress = this.curriculumService.pathProgress;
  dailyChallenge = signal<any>(null);
  weeklyGoal = signal<any>(null);
  currentStreak = toSignal(this.streakService.getCurrentStreak(), { initialValue: 0 });

  // Computed signal for path progress percentage
  pathProgressPercentage = computed(() => {
    const progress = this.pathProgress();
    const path = this.currentPath();
    
    if (!progress || !path) return 0;
    
    let totalExercises = 0;
    let completedExercises = 0;

    for (const module of path.modules) {
      totalExercises += module.exerciseIds.length;
      const moduleProgress = progress.moduleProgress[module.id];
      if (moduleProgress) {
        completedExercises += moduleProgress.completedExercises.length;
      }
    }

    return totalExercises === 0 ? 0 : Math.round((completedExercises / totalExercises) * 100);
  });

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

  async ngOnInit(): Promise<void> {
    // Load learning path data if authenticated
    if (this.isAuthenticated()) {
      await this.loadLearningPathData();
    }
  }

  private async loadLearningPathData(): Promise<void> {
    try {
      // Load current path progress
      await this.curriculumService.getUserCurrentPath();
      
      // Load current module if path exists
      if (this.currentPath()) {
        await this.curriculumService.getCurrentModule();
        
        // Debug: Log progress data
        const progress = this.pathProgress();
        const module = this.currentModule();
        if (progress && module) {
          console.log('[Home] Current module:', module.id);
          console.log('[Home] Module progress:', progress.moduleProgress[module.id]);
        }
      }
      
      // Load today's daily challenge
      try {
        const challenge = await this.adaptiveEngineService.getTodaysDailyChallenge();
        this.dailyChallenge.set(challenge);
      } catch (error) {
        console.error('[Home] Error loading daily challenge:', error);
        this.dailyChallenge.set(null);
      }
      
      // Load current weekly goal
      try {
        const goal = await this.curriculumService.getCurrentWeeklyGoal();
        this.weeklyGoal.set(goal);
      } catch (error) {
        console.error('[Home] Error loading weekly goal:', error);
        this.weeklyGoal.set(null);
      }
    } catch (error) {
      console.error('[Home] Error loading learning path data:', error);
    }
  }

  navigateToLearningPath(): void {
    this.router.navigate(['/learning-path']);
  }

  navigateToDailyChallenge(): void {
    const challenge = this.dailyChallenge();
    if (challenge?.exercise) {
      this.router.navigate(['/exercise', challenge.exercise.id]);
    }
  }

  async activateDailyChallenge(): Promise<void> {
    // If no path selected, navigate to learning path selection
    if (!this.currentPath()) {
      this.router.navigate(['/learning-path']);
      return;
    }
    
    // Try to generate today's challenge
    try {
      const challenge = await this.adaptiveEngineService.getTodaysDailyChallenge();
      this.dailyChallenge.set(challenge);
      
      // Navigate to the challenge exercise
      if (challenge?.exercise) {
        this.router.navigate(['/exercise', challenge.exercise.id]);
      }
    } catch (error) {
      console.error('[Home] Error activating daily challenge:', error);
      // If error, navigate to learning path
      this.router.navigate(['/learning-path']);
    }
  }

  navigateToCurrentModule(): void {
    const module = this.currentModule();
    if (!module || !module.exerciseIds || module.exerciseIds.length === 0) {
      console.warn('[Home] No module or exercises found');
      return;
    }
    
    // Find first incomplete exercise in current module
    const progress = this.pathProgress();
    const completedExercises = progress?.moduleProgress[module.id]?.completedExercises || [];
    
    console.log('[Home] Module:', module.id);
    console.log('[Home] Total exercises:', module.exerciseIds.length);
    console.log('[Home] Completed exercises:', completedExercises);
    
    const firstIncomplete = module.exerciseIds.find((exId: string) => !completedExercises.includes(exId));
    
    console.log('[Home] First incomplete exercise:', firstIncomplete);
    
    if (firstIncomplete) {
      this.router.navigate(['/exercise', firstIncomplete]);
    } else if (module.exerciseIds.length > 0) {
      // All exercises completed, go to first one
      console.log('[Home] All exercises completed, going to first one');
      this.router.navigate(['/exercise', module.exerciseIds[0]]);
    }
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
