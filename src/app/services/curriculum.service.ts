import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, from, of, firstValueFrom, timeout } from 'rxjs';
import { catchError } from 'rxjs/operators';
import {
  LearningPath,
  LearningModule,
  UserPathProgress,
  PathCompletion,
} from '../models/learning-path.model';
import { DatabaseService } from './database/database.service';
import { AuthService } from './auth.service';
import { ExerciseService } from './exercise.service';

@Injectable({
  providedIn: 'root',
})
export class CurriculumService {
  private http = inject(HttpClient);
  private db = inject(DatabaseService);
  private auth = inject(AuthService);
  private exerciseService = inject(ExerciseService);

  // Signals for reactive state
  currentPath = signal<LearningPath | null>(null);
  currentModule = signal<LearningModule | null>(null);
  pathProgress = signal<UserPathProgress | null>(null);

  // Computed values
  pathCompletion = computed(() => {
    const progress = this.pathProgress();
    if (!progress) return 0;

    const path = this.currentPath();
    if (!path) return 0;

    // Calculate based on exercises completed across all modules
    let totalExercises = 0;
    let completedExercises = 0;

    for (const module of path.modules) {
      totalExercises += module.exerciseIds.length;
      const moduleProgress = progress.moduleProgress[module.id];
      if (moduleProgress) {
        completedExercises += moduleProgress.completedExercises.length;
      }
    }

    if (totalExercises === 0) return 0;
    return Math.round((completedExercises / totalExercises) * 100);
  });

  // Path management methods
  async getAllPaths(): Promise<LearningPath[]> {
    try {
      const paths = await Promise.all([
        this.http.get<LearningPath>('data/learning-paths/beginner-path.json').toPromise(),
        this.http.get<LearningPath>('data/learning-paths/intermediate-path.json').toPromise(),
        this.http.get<LearningPath>('data/learning-paths/advanced-path.json').toPromise(),
      ]);
      return paths.filter((p): p is LearningPath => p !== undefined);
    } catch (error) {
      console.error('Error loading paths:', error);
      return [];
    }
  }

  getPathById(pathId: string): Observable<LearningPath | null> {
    const pathFile = `data/learning-paths/${pathId}.json`;
    return this.http.get<LearningPath>(pathFile).pipe(
      catchError((error) => {
        console.error(`Error loading path ${pathId}:`, error);
        return of(null);
      })
    );
  }

  async getUserCurrentPath(): Promise<LearningPath | null> {
    const progress = await firstValueFrom(this.db.loadLearningPathProgressAuto()).catch(() => null);
    if (!progress || !progress.currentPathId) {
      this.pathProgress.set(null);
      this.currentPath.set(null);
      this.currentModule.set(null);
      return null;
    }
    
    const path = await firstValueFrom(this.getPathById(progress.currentPathId)).catch(() => null);
    this.currentPath.set(path || null);
    this.pathProgress.set(progress);
    
    // Set current module
    if (path && progress.currentModuleId) {
      const module = path.modules.find(m => m.id === progress.currentModuleId);
      this.currentModule.set(module || path.modules[0]);
    }
    
    // Migrate existing exercise history to learning path progress
    if (path) {
      await this.migrateExerciseHistoryToPath(path, progress);
    }
    
    return path || null;
  }

  private async migrateExerciseHistoryToPath(path: LearningPath, progress: UserPathProgress): Promise<void> {
    try {
      // Load exercise history from progress service
      const exerciseHistory = await firstValueFrom(
        this.db.loadProgressAuto().pipe(
          timeout(2000)
        )
      ).catch(() => null);

      if (!exerciseHistory || !exerciseHistory.exerciseHistory) {
        return;
      }

      let hasChanges = false;

      // Check each module in the path
      for (const module of path.modules) {
        const moduleProgress = progress.moduleProgress[module.id] || {
          moduleId: module.id,
          completedExercises: [],
          averageScore: 0,
          totalExercises: module.exerciseIds.length,
          completionPercentage: 0,
          unlocked: true,
          totalPoints: 0,
        };

        // Check each exercise in the module
        for (const exerciseId of module.exerciseIds) {
          const history = exerciseHistory.exerciseHistory[exerciseId];
          
          // If exercise has history but not in completed list, add it
          if (history && history.accuracyScore >= 60 && !moduleProgress.completedExercises.includes(exerciseId)) {
            console.log(`[CurriculumService] Migrating exercise ${exerciseId} to module ${module.id}`);
            moduleProgress.completedExercises.push(exerciseId);
            hasChanges = true;
          }
        }

        // Update module progress if there were changes
        if (hasChanges) {
          // Recalculate average score
          let totalScore = 0;
          let count = 0;
          for (const exId of moduleProgress.completedExercises) {
            const history = exerciseHistory.exerciseHistory[exId];
            if (history) {
              totalScore += history.accuracyScore;
              count++;
            }
          }
          moduleProgress.averageScore = count > 0 ? Math.round(totalScore / count) : 0;
          
          // Update completion percentage
          moduleProgress.completionPercentage = Math.round(
            (moduleProgress.completedExercises.length / module.exerciseIds.length) * 100
          );

          progress.moduleProgress[module.id] = moduleProgress;
        }
      }

      // Save updated progress if there were changes
      if (hasChanges) {
        console.log('[CurriculumService] Saving migrated progress');
        await this.db.saveLearningPathProgressAuto(progress);
        this.pathProgress.set(progress);
      }
    } catch (error) {
      console.error('[CurriculumService] Error migrating exercise history:', error);
    }
  }

  async selectPath(pathId: string): Promise<void> {
    const userId = this.auth.getUserId();
    if (!userId) {
      throw new Error('User not authenticated');
    }

    const path = await this.getPathById(pathId).toPromise();
    if (!path) {
      throw new Error('Path not found');
    }

    // Check if user already has progress for this path
    const existingProgress = await this.db.loadLearningPathProgressAuto().toPromise();
    
    if (existingProgress && existingProgress.currentPathId === pathId) {
      // User already has progress for this path, just load it
      this.pathProgress.set(existingProgress);
      this.currentPath.set(path);
      
      // Find current module
      const currentModule = path.modules.find(m => m.id === existingProgress.currentModuleId);
      this.currentModule.set(currentModule || path.modules[0]);
      return;
    }

    // Create new progress for this path
    const firstModule = path.modules[0];
    const progress: UserPathProgress = {
      userId,
      currentPathId: pathId,
      currentModuleId: firstModule.id,
      startDate: new Date(),
      completedModules: [],
      moduleProgress: {
        [firstModule.id]: {
          moduleId: firstModule.id,
          completedExercises: [],
          averageScore: 0,
          totalExercises: firstModule.exerciseIds.length,
          completionPercentage: 0,
          unlocked: true,
          totalPoints: 0,
        },
      },
      pathCompletions: [],
    };

    await this.db.saveLearningPathProgressAuto(progress);
    this.pathProgress.set(progress);
    this.currentPath.set(path);
    this.currentModule.set(firstModule);
  }

  // Module management methods
  getCurrentModule(): Observable<LearningModule | null> {
    const progress = this.pathProgress();
    const path = this.currentPath();

    if (!progress || !path) {
      return of(null);
    }

    const module = path.modules.find((m) => m.id === progress.currentModuleId) || null;
    this.currentModule.set(module);
    return of(module);
  }

  async unlockNextModule(): Promise<void> {
    const progress = this.pathProgress();
    const path = this.currentPath();

    if (!progress || !path) {
      throw new Error('No active path');
    }

    const currentModuleIndex = path.modules.findIndex(
      (m) => m.id === progress.currentModuleId
    );

    if (currentModuleIndex === -1 || currentModuleIndex >= path.modules.length - 1) {
      return;
    }

    const nextModule = path.modules[currentModuleIndex + 1];
    const updatedProgress = {
      ...progress,
      currentModuleId: nextModule.id,
      moduleProgress: {
        ...progress.moduleProgress,
        [nextModule.id]: {
          moduleId: nextModule.id,
          completedExercises: [],
          averageScore: 0,
          totalExercises: nextModule.exerciseIds.length,
          completionPercentage: 0,
          unlocked: true,
          totalPoints: 0,
        },
      },
    };

    await this.db.saveLearningPathProgressAuto(updatedProgress);
    this.pathProgress.set(updatedProgress);
    this.currentModule.set(nextModule);
  }

  getModuleProgress(moduleId: string): number {
    const progress = this.pathProgress();
    if (!progress || !progress.moduleProgress[moduleId]) {
      return 0;
    }
    return progress.moduleProgress[moduleId].completionPercentage;
  }

  // Progress tracking methods
  async getUserPathProgress(): Promise<UserPathProgress | null> {
    try {
      const progress = await this.db.loadLearningPathProgressAuto().toPromise();
      this.pathProgress.set(progress || null);
      return progress || null;
    } catch (error) {
      console.error('Error loading path progress:', error);
      return null;
    }
  }

  async updateModuleProgressWithId(
    moduleId: string,
    exerciseId: string,
    score: number
  ): Promise<void> {
    const progress = this.pathProgress();
    if (!progress) {
      throw new Error('No active path progress');
    }

    const moduleProgress = progress.moduleProgress[moduleId] || {
      moduleId,
      completedExercises: [],
      averageScore: 0,
      totalExercises: 0,
      completionPercentage: 0,
      unlocked: true,
    };

    // Add exercise if not already completed
    if (!moduleProgress.completedExercises.includes(exerciseId)) {
      moduleProgress.completedExercises.push(exerciseId);
    }

    // Recalculate average score
    const totalScore =
      moduleProgress.averageScore * (moduleProgress.completedExercises.length - 1) + score;
    moduleProgress.averageScore = Math.round(
      totalScore / moduleProgress.completedExercises.length
    );

    // Update completion percentage
    moduleProgress.completionPercentage = Math.round(
      (moduleProgress.completedExercises.length / moduleProgress.totalExercises) * 100
    );

    const updatedProgress = {
      ...progress,
      moduleProgress: {
        ...progress.moduleProgress,
        [moduleId]: moduleProgress,
      },
    };

    await this.db.saveLearningPathProgressAuto(updatedProgress);
    this.pathProgress.set(updatedProgress);
  }

  calculatePathCompletion(): number {
    return this.pathCompletion();
  }

  isPathUnlocked(path: LearningPath): boolean {
    if (!path.unlockRequirement) {
      return true;
    }

    const progress = this.pathProgress();
    if (!progress) {
      return false;
    }

    const requirement: any = path.unlockRequirement;
    const requiredPathId = typeof requirement === 'string' 
      ? requirement 
      : requirement.requiredPathId;

    const requiredCompletion = progress.pathCompletions.find(
      (c) => c.pathId === requiredPathId
    );

    return !!requiredCompletion;
  }

  async getExerciseById(exerciseId: string): Promise<any> {
    try {
      const exercise = await firstValueFrom(
        this.exerciseService.getExerciseById(exerciseId).pipe(
          timeout(2000)
        )
      );
      return exercise;
    } catch (error) {
      console.error('Failed to load exercise:', error);
      // Return placeholder if exercise not found
      return {
        id: exerciseId,
        title: 'Daily Challenge',
        description: 'Complete this exercise',
        category: 'General',
        difficulty: 'Intermediate'
      };
    }
  }

  // Path completion methods
  async completeModule(moduleId: string): Promise<void> {
    const progress = this.pathProgress();
    const path = this.currentPath();

    if (!progress || !path) {
      throw new Error('No active path');
    }

    // Check if module meets required score
    const moduleProgress = progress.moduleProgress[moduleId];
    const module = path.modules.find((m) => m.id === moduleId);

    if (!moduleProgress || !module) {
      throw new Error('Module not found');
    }

    if (
      module.requiredScore &&
      moduleProgress.averageScore < module.requiredScore
    ) {
      throw new Error(
        `Module requires ${module.requiredScore}% average score. Current: ${moduleProgress.averageScore}%`
      );
    }

    // Mark module as completed
    const updatedProgress = {
      ...progress,
      completedModules: [...progress.completedModules, moduleId],
    };

    await this.db.saveLearningPathProgressAuto(updatedProgress);
    this.pathProgress.set(updatedProgress);
    
    try {
      await this.unlockNextModule();
    } catch (error) {
      console.error('Error unlocking next module:', error);
    }
  }

  async completePath(pathId: string): Promise<PathCompletion> {
    const progress = this.pathProgress();
    const path = this.currentPath();

    if (!progress || !path || path.id !== pathId) {
      throw new Error('Invalid path');
    }

    // Calculate final score
    const moduleScores = Object.values(progress.moduleProgress).map(
      (m) => m.averageScore
    );
    const finalScore = Math.round(
      moduleScores.reduce((sum, score) => sum + score, 0) / moduleScores.length
    );

    // Calculate total points from all modules
    const totalPoints = Object.values(progress.moduleProgress).reduce(
      (sum, m) => sum + m.totalPoints,
      0
    );

    const completion: PathCompletion = {
      pathId,
      pathName: path.name,
      completedAt: new Date(),
      finalScore,
      certificateId: this.generateCertificateId(pathId),
      modulesCompleted: progress.completedModules.length,
      totalPoints,
    };

    const updatedProgress = {
      ...progress,
      pathCompletions: [...progress.pathCompletions, completion],
    };

    await this.db.saveLearningPathProgressAuto(updatedProgress);
    this.pathProgress.set(updatedProgress);
    return completion;
  }

  generateCertificate(pathId: string): string {
    return this.generateCertificateId(pathId);
  }

  private generateCertificateId(pathId: string): string {
    const userId = this.auth.getUserId();
    const timestamp = Date.now();
    return `cert-${userId}-${pathId}-${timestamp}`;
  }

  // Integration methods for exercise completion
  updateModuleProgress(exerciseId: string, score: number, points: number = 0): Observable<void> {
    return from(this.updateModuleProgressAsync(exerciseId, score, points));
  }

  private async updateModuleProgressAsync(exerciseId: string, score: number, points: number = 0): Promise<void> {
    console.log('[CurriculumService] updateModuleProgressAsync called:', { exerciseId, score, points });
    const progress = this.pathProgress();
    const path = this.currentPath();

    console.log('[CurriculumService] Current progress:', progress);
    console.log('[CurriculumService] Current path:', path);

    if (!progress || !path) {
      console.log('[CurriculumService] No active path, skipping module progress update');
      return;
    }

    // Find which module contains this exercise
    const module = path.modules.find((m) =>
      m.exerciseIds.includes(exerciseId)
    );

    if (!module) {
      console.log('[CurriculumService] Exercise not in current path, exerciseId:', exerciseId);
      console.log('[CurriculumService] Available modules:', path.modules.map(m => ({ id: m.id, exercises: m.exerciseIds })));
      return;
    }
    
    console.log('[CurriculumService] Found module:', module.id);

    // Update module progress
    const moduleProgress = progress.moduleProgress[module.id] || {
      moduleId: module.id,
      completedExercises: [],
      averageScore: 0,
      totalExercises: module.exerciseIds.length,
      completionPercentage: 0,
      unlocked: true,
      totalPoints: 0,
    };

    // Add exercise if not already completed
    if (!moduleProgress.completedExercises.includes(exerciseId)) {
      moduleProgress.completedExercises.push(exerciseId);
    }

    // Add points
    moduleProgress.totalPoints += points;

    // Recalculate average score
    const scores = moduleProgress.completedExercises.map(() => score); // Simplified
    moduleProgress.averageScore = Math.round(
      scores.reduce((sum, s) => sum + s, 0) / scores.length
    );

    // Update completion percentage
    moduleProgress.completionPercentage = Math.round(
      (moduleProgress.completedExercises.length / module.exerciseIds.length) * 100
    );

    const updatedProgress = {
      ...progress,
      moduleProgress: {
        ...progress.moduleProgress,
        [module.id]: moduleProgress,
      },
    };

    console.log('[CurriculumService] Updated progress:', updatedProgress);
    console.log('[CurriculumService] Module progress for', module.id, ':', moduleProgress);
    
    await this.db.saveLearningPathProgressAuto(updatedProgress);
    this.pathProgress.set(updatedProgress);
    
    console.log('[CurriculumService] Progress saved and signal updated');
  }

  checkAndCompleteDailyChallenge(exerciseId: string, date: string, score: number): Observable<boolean> {
    return from(this.checkAndCompleteDailyChallengeAsync(exerciseId, date, score));
  }

  private async checkAndCompleteDailyChallengeAsync(
    exerciseId: string,
    date: string,
    score: number
  ): Promise<boolean> {
    const challenge = await this.db.loadDailyChallengeByDate(this.auth.getUserId() || '', date).toPromise();

    if (!challenge || challenge.exerciseId !== exerciseId) {
      return false;
    }

    if (challenge.isCompleted) {
      return false;
    }

    // Mark as completed
    const updatedChallenge = {
      ...challenge,
      isCompleted: true,
      completedAt: new Date(),
      score,
      bonusPoints: challenge.bonusPoints || 0,
    };

    await this.db.saveDailyChallengeAuto(updatedChallenge).toPromise();
    return true;
  }

  incrementWeeklyGoalProgress(): Observable<void> {
    return from(this.incrementWeeklyGoalProgressAsync());
  }

  private async incrementWeeklyGoalProgressAsync(): Promise<void> {
    const userId = this.auth.getUserId();
    if (!userId) return;

    // Calculate Monday of current week
    const now = new Date();
    const dayOfWeek = now.getDay();
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(now);
    monday.setDate(now.getDate() + diff);
    monday.setHours(0, 0, 0, 0);
    const weekStartDate = monday.toISOString().split('T')[0];

    const goal = await this.db.loadWeeklyGoalByDate(userId, weekStartDate).toPromise();

    if (!goal) {
      // Create new goal with default target
      const newGoal = {
        userId,
        weekStartDate,
        targetExercises: 10,
        completedExercises: 1,
        isAchieved: false,
        bonusPointsEarned: 0,
      };
      await this.db.saveWeeklyGoalAuto(newGoal).toPromise();
      return;
    }

    // Increment completed exercises
    const updatedGoal = {
      ...goal,
      completedExercises: goal.completedExercises + 1,
      isAchieved: goal.completedExercises + 1 >= goal.targetExercises,
      bonusPointsEarned:
        goal.completedExercises + 1 >= goal.targetExercises && !goal.isAchieved
          ? 500
          : goal.bonusPointsEarned,
    };

    await this.db.saveWeeklyGoalAuto(updatedGoal).toPromise();
  }

  async getCurrentWeeklyGoal(): Promise<any> {
    const userId = this.auth.getUserId();
    if (!userId) return null;

    // Calculate Monday of current week
    const now = new Date();
    const dayOfWeek = now.getDay();
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(now);
    monday.setDate(now.getDate() + diff);
    monday.setHours(0, 0, 0, 0);
    const weekStartDate = monday.toISOString().split('T')[0];

    const goal = await this.db.loadWeeklyGoalByDate(userId, weekStartDate).toPromise();

    if (!goal) {
      // Return default goal
      return {
        userId,
        weekStartDate,
        targetExercises: 10,
        completedExercises: 0,
        isAchieved: false,
        bonusPointsEarned: 0,
      };
    }

    return goal;
  }
}
