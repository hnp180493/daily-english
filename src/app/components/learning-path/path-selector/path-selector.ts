import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { CurriculumService } from '../../../services/curriculum.service';
import { LearningPath } from '../../../models/learning-path.model';

@Component({
  selector: 'app-path-selector',
  imports: [CommonModule],
  templateUrl: './path-selector.html',
  styleUrl: './path-selector.scss',
  standalone: true
})
export class PathSelector implements OnInit {
  private curriculumService = inject(CurriculumService);
  private router = inject(Router);

  paths = signal<LearningPath[]>([]);
  selectedPathId = signal<string | null>(null);
  isLoading = signal(false);

  currentPath = computed(() => this.curriculumService.currentPath());

  async ngOnInit(): Promise<void> {
    await this.loadPaths();
  }

  async loadPaths(): Promise<void> {
    this.isLoading.set(true);
    try {
      const allPaths = await this.curriculumService.getAllPaths();
      this.paths.set(allPaths);
    } catch (error) {
      console.error('Failed to load learning paths:', error);
    } finally {
      this.isLoading.set(false);
    }
  }

  async selectPath(pathId: string): Promise<void> {
    if (this.isLoading()) return;

    const isAlreadyActive = this.isPathActive(pathId);
    
    this.isLoading.set(true);
    try {
      await this.curriculumService.selectPath(pathId);
      this.selectedPathId.set(pathId);
      
      // Only navigate to exercise if this is the active path (Continue Path)
      // For new path selection (Start Path), just go back to home
      if (isAlreadyActive) {
        await this.navigateToNextExercise();
      } else {
        await this.router.navigate(['/']);
      }
    } catch (error) {
      console.error('Failed to select path:', error);
    } finally {
      this.isLoading.set(false);
    }
  }

  private async navigateToNextExercise(): Promise<void> {
    const module = this.curriculumService.currentModule();
    const progress = this.curriculumService.pathProgress();
    
    if (!module || !module.exerciseIds || module.exerciseIds.length === 0) {
      console.warn('No exercises found in current module');
      return;
    }

    // Find first incomplete exercise
    const completedExercises = progress?.moduleProgress[module.id]?.completedExercises || [];
    const firstIncomplete = module.exerciseIds.find((exId: string) => !completedExercises.includes(exId));
    
    if (firstIncomplete) {
      await this.router.navigate(['/exercise', firstIncomplete]);
    } else {
      // All exercises completed, go to first one
      await this.router.navigate(['/exercise', module.exerciseIds[0]]);
    }
  }

  // Computed signals for reactive updates
  pathProgress = computed(() => this.curriculumService.pathProgress());
  
  // Computed progress for current path
  currentPathProgress = computed(() => {
    const progress = this.pathProgress();
    const currentPath = this.currentPath();
    
    if (!progress || !currentPath) return 0;
    
    console.log('[PathSelector] Computing progress for:', currentPath.id);
    console.log('[PathSelector] Module progress:', progress.moduleProgress);
    
    // Calculate based on exercises completed
    let totalExercises = 0;
    let completedExercises = 0;

    for (const module of currentPath.modules) {
      totalExercises += module.exerciseIds.length;
      const moduleProgress = progress.moduleProgress[module.id];
      if (moduleProgress) {
        completedExercises += moduleProgress.completedExercises.length;
        console.log(`[PathSelector] Module ${module.id}: ${moduleProgress.completedExercises.length}/${module.exerciseIds.length}`);
      }
    }

    const result = totalExercises === 0 ? 0 : Math.round((completedExercises / totalExercises) * 100);
    console.log(`[PathSelector] Total progress: ${completedExercises}/${totalExercises} = ${result}%`);
    return result;
  });

  // Computed map of all path progress percentages
  pathProgressMap = computed(() => {
    const progress = this.pathProgress();
    const allPaths = this.paths();
    const currentPathId = this.currentPath()?.id;
    
    const map = new Map<string, number>();
    
    for (const path of allPaths) {
      if (path.id === currentPathId) {
        // Use the detailed calculation for current path
        map.set(path.id, this.currentPathProgress());
      } else {
        // Other paths show 0 progress
        map.set(path.id, 0);
      }
    }
    
    return map;
  });

  isPathLocked(path: LearningPath): boolean {
    return !this.curriculumService.isPathUnlocked(path);
  }

  isPathActive(pathId: string): boolean {
    return this.currentPath()?.id === pathId;
  }

  getPathProgress(pathId: string): number {
    return this.pathProgressMap().get(pathId) ?? 0;
  }
}
