import { Component, OnInit, signal, computed, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { firstValueFrom, timeout } from 'rxjs';
import { CurriculumService } from '../../../services/curriculum.service';
import { ProgressService } from '../../../services/progress.service';
import { ExerciseService } from '../../../services/exercise.service';
import { Exercise } from '../../../models/exercise.model';
import { LearningModule } from '../../../models/learning-path.model';

interface ExerciseListItem {
  exercise: Exercise;
  moduleId: string;
  moduleName: string;
  isCompleted: boolean;
  score?: number;
  attemptCount: number;
}

@Component({
  selector: 'app-exercise-list',
  imports: [CommonModule, RouterModule],
  templateUrl: './exercise-list.html',
  styleUrl: './exercise-list.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true
})
export class ExerciseList implements OnInit {
  private curriculumService = inject(CurriculumService);
  private progressService = inject(ProgressService);
  private exerciseService = inject(ExerciseService);

  isLoading = signal(true);
  exercises = signal<ExerciseListItem[]>([]);
  selectedModule = signal<string>('all');
  selectedCategory = signal<string>('all');
  selectedStatus = signal<string>('all');

  currentPath = computed(() => this.curriculumService.currentPath());
  modules = computed(() => this.currentPath()?.modules || []);
  
  filteredExercises = computed(() => {
    let filtered = this.exercises();
    
    const module = this.selectedModule();
    if (module !== 'all') {
      filtered = filtered.filter(e => e.moduleId === module);
    }
    
    const category = this.selectedCategory();
    if (category !== 'all') {
      filtered = filtered.filter(e => e.exercise.category === category);
    }
    
    const status = this.selectedStatus();
    if (status === 'completed') {
      filtered = filtered.filter(e => e.isCompleted);
    } else if (status === 'incomplete') {
      filtered = filtered.filter(e => !e.isCompleted);
    }
    
    return filtered;
  });

  categories = computed(() => {
    const cats = new Set(this.exercises().map(e => e.exercise.category));
    return Array.from(cats).sort();
  });

  stats = computed(() => {
    const all = this.exercises();
    const completed = all.filter(e => e.isCompleted);
    const avgScore = completed.length > 0
      ? Math.round(completed.reduce((sum, e) => sum + (e.score || 0), 0) / completed.length)
      : 0;
    
    return {
      total: all.length,
      completed: completed.length,
      incomplete: all.length - completed.length,
      averageScore: avgScore
    };
  });

  async ngOnInit(): Promise<void> {
    await this.loadExercises();
  }

  async loadExercises(): Promise<void> {
    this.isLoading.set(true);
    
    try {
      const path = await this.curriculumService.getUserCurrentPath();
      if (!path) {
        this.isLoading.set(false);
        return;
      }

      const progress = await firstValueFrom(
        this.progressService.getUserProgress().pipe(timeout(2000))
      ).catch(() => null);
      const exerciseHistory = progress?.exerciseHistory || {};

      const exerciseList: ExerciseListItem[] = [];

      for (const module of path.modules) {
        for (const exerciseId of module.exerciseIds) {
          try {
            const exercise = await firstValueFrom(
              this.exerciseService.getExerciseById(exerciseId).pipe(timeout(2000))
            ).catch(() => null);
            if (exercise) {
              const history = exerciseHistory[exerciseId];
              exerciseList.push({
                exercise,
                moduleId: module.id,
                moduleName: module.topics[0] || module.name,
                isCompleted: !!history,
                score: history?.accuracyScore,
                attemptCount: history?.attemptNumber || 0
              });
            }
          } catch (error) {
            console.error(`Failed to load exercise ${exerciseId}:`, error);
          }
        }
      }

      this.exercises.set(exerciseList);
    } catch (error) {
      console.error('Failed to load exercises:', error);
    } finally {
      this.isLoading.set(false);
    }
  }

  onModuleChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.selectedModule.set(select.value);
  }

  onCategoryChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.selectedCategory.set(select.value);
  }

  onStatusChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.selectedStatus.set(select.value);
  }

  getDifficultyColor(level: string): string {
    const levelStr = typeof level === 'string' ? level.toLowerCase() : level;
    switch (levelStr) {
      case 'beginner':
        return 'text-green-600 bg-green-100 dark:bg-green-900 dark:text-green-300';
      case 'intermediate':
        return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900 dark:text-yellow-300';
      case 'advanced':
        return 'text-red-600 bg-red-100 dark:bg-red-900 dark:text-red-300';
      default:
        return 'text-gray-600 bg-gray-100 dark:bg-gray-700 dark:text-gray-300';
    }
  }

  getScoreColor(score: number): string {
    if (score >= 90) return 'text-green-600 dark:text-green-400';
    if (score >= 70) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  }
}
