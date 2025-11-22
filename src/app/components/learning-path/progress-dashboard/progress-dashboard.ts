import { Component, OnInit, signal, computed, inject, ChangeDetectionStrategy, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { CurriculumService } from '../../../services/curriculum.service';
import { AdaptiveEngineService } from '../../../services/adaptive-engine.service';
import { ProgressService } from '../../../services/progress.service';
import { StreakService } from '../../../services/streak.service';
import { ExerciseService } from '../../../services/exercise.service';
import { PerformanceAnalysis } from '../../../models/adaptive-learning.model';

interface RecentActivity {
  id: string;
  exerciseId: string;
  exerciseTitle: string;
  date: Date;
  score: number;
}

@Component({
  selector: 'app-progress-dashboard',
  imports: [CommonModule, RouterModule],
  templateUrl: './progress-dashboard.html',
  styleUrl: './progress-dashboard.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true
})
export class ProgressDashboard implements OnInit {
  private curriculumService = inject(CurriculumService);
  private adaptiveEngine = inject(AdaptiveEngineService);
  private progressService = inject(ProgressService);
  private streakService = inject(StreakService);
  private exerciseService = inject(ExerciseService);

  isLoading = signal(true);
  performance = signal<PerformanceAnalysis | null>(null);
  
  // Store user progress from ProgressService
  private userProgressSignal = signal<any>(null);
  private longestStreakSignal = signal(0);
  exerciseTitles = signal<Map<string, string>>(new Map());

  // Computed signals for reactive data
  currentPath = computed(() => this.curriculumService.currentPath());
  pathProgress = computed(() => this.curriculumService.pathProgress());
  pathCompletion = computed(() => this.curriculumService.calculatePathCompletion());
  
  totalExercises = computed(() => {
    const progress = this.userProgressSignal();
    if (!progress) return 0;
    return Object.keys(progress.exerciseHistory || {}).length;
  });

  averageScore = computed(() => {
    const progress = this.userProgressSignal();
    if (!progress) return 0;
    
    const history = Object.values(progress.exerciseHistory || {});
    if (history.length === 0) return 0;
    
    const totalScore = history.reduce((sum: number, h: any) => sum + h.accuracyScore, 0);
    return Math.round(totalScore / history.length);
  });

  recentActivity = computed(() => {
    const progress = this.userProgressSignal();
    if (!progress) return [];
    
    const history = Object.values(progress.exerciseHistory || {});
    const titles = this.exerciseTitles();
    
    return history
      .slice(-5)
      .reverse()
      .map((h: any) => ({
        id: h.exerciseId,
        exerciseId: h.exerciseId,
        exerciseTitle: titles.get(h.exerciseId) || h.exerciseId,
        date: new Date(h.timestamp),
        score: h.accuracyScore,
        language: h.language // Include language if available
      }));
  });
  
  longestStreak = computed(() => this.longestStreakSignal());

  constructor() {
    effect(() => {
      const progress = this.userProgressSignal();
      if (!progress) return;
      
      const history = Object.values(progress.exerciseHistory || {});
      const ids = history.map((h: any) => h.exerciseId);
      
      if (ids.length === 0) return;
      
      this.exerciseService.getExercisesByIds(ids).subscribe(exercises => {
        const titleMap = new Map<string, string>();
        exercises.forEach(ex => {
          titleMap.set(ex.id, ex.title);
        });
        this.exerciseTitles.set(titleMap);
      });
    });
  }

  async ngOnInit(): Promise<void> {
    await this.loadDashboardData();
    
    // Subscribe to user progress updates
    this.progressService.getUserProgress().subscribe(progress => {
      this.userProgressSignal.set(progress);
    });
    
    // Subscribe to streak updates
    this.streakService.getLongestStreak().subscribe(streak => {
      this.longestStreakSignal.set(streak || 0);
    });
  }

  async loadDashboardData(): Promise<void> {
    this.isLoading.set(true);
    
    try {
      console.log('[ProgressDashboard] Loading dashboard data...');
      
      // Load all data in parallel for faster loading
      const [pathResult, perfResult, progressResult, streakResult] = await Promise.allSettled([
        this.curriculumService.getUserCurrentPath(),
        Promise.race([
          this.adaptiveEngine.analyzePerformance().toPromise(),
          new Promise<null>((resolve) => setTimeout(() => resolve(null), 1000))
        ]),
        Promise.race([
          this.progressService.getUserProgress().toPromise(),
          new Promise<null>((resolve) => setTimeout(() => resolve(null), 1000))
        ]),
        Promise.race([
          this.streakService.getLongestStreak().toPromise(),
          new Promise<number>((resolve) => setTimeout(() => resolve(0), 1000))
        ])
      ]);

      // Process path result
      if (pathResult.status === 'fulfilled') {
        console.log('[ProgressDashboard] Current path loaded');
      }

      // Process performance result
      if (perfResult.status === 'fulfilled' && perfResult.value) {
        this.performance.set(perfResult.value);
        console.log('[ProgressDashboard] Performance analysis loaded');
      } else {
        this.performance.set(null);
        console.log('[ProgressDashboard] Performance analysis skipped or failed');
      }

      // Process user progress result
      if (progressResult.status === 'fulfilled' && progressResult.value) {
        this.userProgressSignal.set(progressResult.value);
        console.log('[ProgressDashboard] User progress loaded');
      } else {
        console.log('[ProgressDashboard] User progress skipped or failed');
      }

      // Process streak result
      if (streakResult.status === 'fulfilled') {
        this.longestStreakSignal.set(streakResult.value || 0);
        console.log('[ProgressDashboard] Longest streak loaded');
      } else {
        this.longestStreakSignal.set(0);
        console.log('[ProgressDashboard] Longest streak skipped or failed');
      }
      
      console.log('[ProgressDashboard] Dashboard data loaded successfully');
    } catch (error) {
      console.error('[ProgressDashboard] Failed to load dashboard data:', error);
    } finally {
      this.isLoading.set(false);
      console.log('[ProgressDashboard] Loading complete');
    }
  }

  // Computed estimated completion date
  estimatedCompletion = computed(() => {
    const progress = this.pathProgress();
    if (!progress || !progress.startDate) return null;

    const path = this.currentPath();
    if (!path) return null;

    const startDate = new Date(progress.startDate);
    const estimatedWeeks = path.durationWeeks || 12; // Use path duration or default
    const completionDate = new Date(startDate);
    completionDate.setDate(completionDate.getDate() + estimatedWeeks * 7);

    return completionDate.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  });

  // Computed category list
  categoryList = computed(() => {
    const perf = this.performance();
    if (!perf) return [];

    return Object.entries(perf.categoryScores).map(([name, score]) => ({
      name,
      score: Math.round(score)
    }));
  });

  // Methods that use computed signals internally
  isModuleCompleted(moduleId: string): boolean {
    const progress = this.pathProgress();
    return progress?.completedModules.includes(moduleId) ?? false;
  }

  isModuleCurrent(moduleId: string): boolean {
    const progress = this.pathProgress();
    return progress?.currentModuleId === moduleId;
  }

  getModuleProgress(moduleId: string): number {
    return this.curriculumService.getModuleProgress(moduleId);
  }

  getCategoryList(): Array<{ name: string; score: number }> {
    return this.categoryList();
  }

  formatDate(date: Date): string {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    });
  }
}
