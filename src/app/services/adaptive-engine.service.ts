import { Injectable, inject } from '@angular/core';
import { Observable, of, throwError, firstValueFrom } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import {
  AdaptiveRecommendation,
  RecommendationReason,
  PerformanceAnalysis,
} from '../models/adaptive-learning.model';
import { Exercise, ExerciseAttempt } from '../models/exercise.model';
import { ProgressService } from './progress.service';
import { ExerciseService } from './exercise.service';
import { CurriculumService } from './curriculum.service';
import { AuthService } from './auth.service';
import { DatabaseService } from './database/database.service';

@Injectable({
  providedIn: 'root',
})
export class AdaptiveEngineService {
  private progressService = inject(ProgressService);
  private exerciseService = inject(ExerciseService);
  private curriculumService = inject(CurriculumService);
  private auth = inject(AuthService);
  private db = inject(DatabaseService);

  // Performance analysis methods
  analyzePerformance(): Observable<PerformanceAnalysis> {
    return this.progressService.getUserProgress().pipe(
      map((progress) => {
        const history = Object.values(progress.exerciseHistory).slice(0, 10);
        
        if (history.length === 0) {
          return {
            userId: '',
            categoryScores: {},
            weakCategories: [],
            strongCategories: [],
            averageScore: 0,
            recentTrend: 'stable' as const,
            translationDependency: 100,
          };
        }

        // Calculate category scores
        const categoryScores: { [category: string]: number[] } = {};
        let totalScore = 0;

        history.forEach((attempt) => {
          const category = attempt.category || 'unknown';
          if (!categoryScores[category]) {
            categoryScores[category] = [];
          }
          categoryScores[category].push(attempt.accuracyScore);
          totalScore += attempt.accuracyScore;
        });

        // Calculate averages
        const categoryAverages: { [category: string]: number } = {};
        Object.keys(categoryScores).forEach((category) => {
          const scores = categoryScores[category];
          categoryAverages[category] = Math.round(
            scores.reduce((sum, score) => sum + score, 0) / scores.length
          );
        });

        // Identify weak and strong categories
        const weakCategories = Object.keys(categoryAverages).filter(
          (cat) => categoryAverages[cat] < 70
        );
        const strongCategories = Object.keys(categoryAverages).filter(
          (cat) => categoryAverages[cat] > 85
        );

        // Calculate trend
        const recentTrend = this.calculateTrend(history.map((h) => h.accuracyScore));

        // Calculate translation dependency (decreases with more exercises)
        const translationDependency = Math.max(
          0,
          100 - history.length * 2
        );

        return {
          userId: '',
          categoryScores: categoryAverages,
          weakCategories,
          strongCategories,
          averageScore: Math.round(totalScore / history.length),
          recentTrend,
          translationDependency,
        };
      })
    );
  }

  identifyWeakCategories(): Observable<string[]> {
    return this.analyzePerformance().pipe(
      map((analysis) => analysis.weakCategories)
    );
  }

  calculateTranslationDependency(): Observable<number> {
    return this.analyzePerformance().pipe(
      map((analysis) => analysis.translationDependency)
    );
  }

  // Recommendation algorithm
  getNextRecommendedExercise(): Observable<AdaptiveRecommendation> {
    return this.progressService.getUserProgress().pipe(
      switchMap((progress) => {
        const history = Object.values(progress.exerciseHistory);
        
        // Step 1: If < 5 exercises completed, return sequential from current module
        if (history.length < 5) {
          return this.getSequentialRecommendation();
        }

        // Step 2: Check for weak categories
        return this.analyzePerformance().pipe(
          switchMap((analysis) => {
            if (analysis.weakCategories.length > 0) {
              return this.getWeakCategoryRecommendation(
                analysis.weakCategories,
                history
              );
            }

            // Step 3: Check if all categories > 85%
            const allStrong = Object.values(analysis.categoryScores).every(
              (score) => score > 85
            );
            if (allStrong) {
              return this.getDifficultyIncreaseRecommendation(history);
            }

            // Default: sequential from current module
            return this.getSequentialRecommendation();
          })
        );
      })
    );
  }

  generateDailyChallenge(): Observable<Exercise> {
    return this.getNextRecommendedExercise().pipe(
      switchMap((recommendation) =>
        this.exerciseService.getExerciseById(recommendation.exerciseId)
      ),
      map((exercise) => {
        if (!exercise) {
          throw new Error('Exercise not found');
        }
        return exercise;
      })
    );
  }

  // Private helper methods
  private calculateTrend(scores: number[]): 'improving' | 'stable' | 'declining' {
    if (scores.length < 3) return 'stable';

    const firstHalf = scores.slice(0, Math.floor(scores.length / 2));
    const secondHalf = scores.slice(Math.floor(scores.length / 2));

    const firstAvg =
      firstHalf.reduce((sum, score) => sum + score, 0) / firstHalf.length;
    const secondAvg =
      secondHalf.reduce((sum, score) => sum + score, 0) / secondHalf.length;

    const diff = secondAvg - firstAvg;

    if (diff > 5) return 'improving';
    if (diff < -5) return 'declining';
    return 'stable';
  }

  private getSequentialRecommendation(): Observable<AdaptiveRecommendation> {
    const module = this.curriculumService.currentModule();
    if (!module) {
      return throwError(() => new Error('No active module'));
    }

    return this.progressService.getUserProgress().pipe(
      map((progress) => {
        const completedIds = Object.keys(progress.exerciseHistory);
        const nextExercise = module.exerciseIds.find(
          (id) => !completedIds.includes(id)
        );

        if (!nextExercise) {
          // All exercises completed, return first one
          return {
            exerciseId: module.exerciseIds[0],
            confidence: 0.8,
            reason: RecommendationReason.SEQUENTIAL_PROGRESSION,
            priority: 'medium' as const,
          };
        }

        return {
          exerciseId: nextExercise,
          confidence: 0.9,
          reason: RecommendationReason.SEQUENTIAL_PROGRESSION,
          priority: 'high' as const,
        };
      })
    );
  }

  private getWeakCategoryRecommendation(
    weakCategories: string[],
    history: ExerciseAttempt[]
  ): Observable<AdaptiveRecommendation> {
    const completedIds = history.map((h) => h.exerciseId);
    const recentIds = history.slice(0, 30).map((h) => h.exerciseId);

    // Get all exercises and filter by category
    return this.exerciseService.getAllExercises().pipe(
      map((exercises) => {
        // Filter by weak category
        const categoryExercises = exercises.filter(
          (ex) => ex.category === weakCategories[0]
        );
        
        // Filter out recently completed exercises
        const available = categoryExercises.filter(
          (ex) => !recentIds.includes(ex.id)
        );

        if (available.length === 0) {
          // Fallback to any exercise from weak category
          const fallback = categoryExercises.find((ex) => !completedIds.includes(ex.id));
          if (fallback) {
            return {
              exerciseId: fallback.id,
              confidence: 0.7,
              reason: RecommendationReason.WEAK_CATEGORY,
              priority: 'high' as const,
            };
          }
          // No exercises available, use sequential
          return this.createFallbackRecommendation();
        }

        // Pick random from available
        const selected = available[Math.floor(Math.random() * available.length)];
        return {
          exerciseId: selected.id,
          confidence: 0.85,
          reason: RecommendationReason.WEAK_CATEGORY,
          priority: 'high' as const,
        };
      })
    );
  }

  private getDifficultyIncreaseRecommendation(
    history: ExerciseAttempt[]
  ): Observable<AdaptiveRecommendation> {
    const currentLevel = this.getCurrentDifficultyLevel();
    const nextLevel = this.getNextDifficultyLevel(currentLevel);

    if (!nextLevel) {
      return this.getSequentialRecommendation();
    }

    const recentIds = history.slice(0, 30).map((h) => h.exerciseId);

    return this.exerciseService.getAllExercises().pipe(
      map((exercises) => {
        // Filter by next difficulty level
        const levelExercises = exercises.filter(
          (ex) => ex.level === nextLevel
        );
        
        const available = levelExercises.filter(
          (ex) => !recentIds.includes(ex.id)
        );

        if (available.length === 0) {
          return this.createFallbackRecommendation();
        }

        const selected = available[Math.floor(Math.random() * available.length)];
        return {
          exerciseId: selected.id,
          confidence: 0.8,
          reason: RecommendationReason.DIFFICULTY_INCREASE,
          priority: 'medium' as const,
        };
      })
    );
  }

  private getCurrentDifficultyLevel(): string {
    const path = this.curriculumService.currentPath();
    return path?.level || 'beginner';
  }

  private getNextDifficultyLevel(
    currentLevel: string
  ): string | null {
    const levels = ['beginner', 'intermediate', 'advanced'];
    const currentIndex = levels.indexOf(currentLevel);
    if (currentIndex === -1 || currentIndex >= levels.length - 1) {
      return null;
    }
    return levels[currentIndex + 1];
  }

  private createFallbackRecommendation(): AdaptiveRecommendation {
    const module = this.curriculumService.currentModule();
    const exerciseId = module?.exerciseIds[0] || 'ex-001';

    return {
      exerciseId,
      confidence: 0.5,
      reason: RecommendationReason.SEQUENTIAL_PROGRESSION,
      priority: 'low' as const,
    };
  }

  async getTodaysDailyChallenge(): Promise<any> {
    const userId = this.auth.getUserId();
    if (!userId) return null;

    const today = new Date().toISOString().split('T')[0];
    
    // Try to load existing challenge
    let challenge = await firstValueFrom(this.db.loadDailyChallengeByDate(userId, today));
    
    if (challenge) {
      // Load exercise details
      const exercise = await firstValueFrom(this.exerciseService.getExerciseById(challenge.exerciseId));
      return {
        ...challenge,
        exercise,
      };
    }

    // Generate new challenge
    const recommendation = await firstValueFrom(this.getNextRecommendedExercise());
    const exercise = await firstValueFrom(this.exerciseService.getExerciseById(recommendation.exerciseId));
    
    const isWeekend = new Date().getDay() === 0 || new Date().getDay() === 6;
    
    challenge = {
      id: `${userId}-${today}`,
      userId,
      date: today,
      exerciseId: recommendation.exerciseId,
      isCompleted: false,
      completedAt: undefined,
      score: 0,
      bonusPoints: isWeekend ? 100 : 50,
      isWeekendChallenge: isWeekend,
    };

    await firstValueFrom(this.db.saveDailyChallengeAuto(challenge!));

    return {
      ...challenge,
      exercise,
    };
  }
}
