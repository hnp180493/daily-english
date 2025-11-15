import { Component, OnInit, signal, computed, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { CurriculumService } from '../../../services/curriculum.service';
import { AdaptiveEngineService } from '../../../services/adaptive-engine.service';
import { ProgressService } from '../../../services/progress.service';
import { StreakService } from '../../../services/streak.service';
import { PerformanceAnalysis } from '../../../models/adaptive-learning.model';

interface RecentActivity {
  id: string;
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

  isLoading = signal(true);
  performance = signal<PerformanceAnalysis | null>(null);
  recentActivity = signal<RecentActivity[]>([]);

  currentPath = computed(() => this.curriculumService.currentPath());
  pathCompletion = computed(() => this.curriculumService.calculatePathCompletion());
  totalExercises = signal(0);
  averageScore = signal(0);
  longestStreak = signal(0);

  async ngOnInit(): Promise<void> {
    await this.loadDashboardData();
    
    // Subscribe to progress updates
    this.progressService.getUserProgress().subscribe(progress => {
      const history = Object.values(progress.exerciseHistory || {});
      this.totalExercises.set(history.length);
      
      if (history.length > 0) {
        const totalScore = history.reduce((sum: number, h: any) => sum + h.accuracyScore, 0);
        this.averageScore.set(Math.round(totalScore / history.length));
      }
      
      const recent = history
        .slice(-5)
        .reverse()
        .map((h: any) => ({
          id: h.exerciseId,
          exerciseTitle: h.exerciseId,
          date: new Date(h.timestamp),
          score: h.accuracyScore
        }));
      this.recentActivity.set(recent);
    });
    
    // Subscribe to streak updates
    this.streakService.getLongestStreak().subscribe(streak => {
      this.longestStreak.set(streak || 0);
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

      // Process progress result
      if (progressResult.status === 'fulfilled' && progressResult.value) {
        const progress = progressResult.value;
        const history = Object.values(progress.exerciseHistory || {});
        this.totalExercises.set(history.length);
        
        if (history.length > 0) {
          const totalScore = history.reduce((sum: number, h: any) => sum + h.accuracyScore, 0);
          this.averageScore.set(Math.round(totalScore / history.length));
        }
        
        const recent = history
          .slice(-5)
          .reverse()
          .map((h: any) => ({
            id: h.exerciseId,
            exerciseTitle: h.exerciseId,
            date: new Date(h.timestamp),
            score: h.accuracyScore
          }));
        this.recentActivity.set(recent);
        console.log('[ProgressDashboard] User progress loaded');
      } else {
        console.log('[ProgressDashboard] User progress skipped or failed');
      }

      // Process streak result
      if (streakResult.status === 'fulfilled') {
        this.longestStreak.set(streakResult.value || 0);
        console.log('[ProgressDashboard] Longest streak loaded');
      } else {
        this.longestStreak.set(0);
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

  estimatedCompletion(): string | null {
    const progress = this.curriculumService.pathProgress();
    if (!progress || !progress.startDate) return null;

    const path = this.currentPath();
    if (!path) return null;

    const startDate = new Date(progress.startDate);
    const estimatedWeeks = 12; // Default estimate
    const completionDate = new Date(startDate);
    completionDate.setDate(completionDate.getDate() + estimatedWeeks * 7);

    return completionDate.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  }

  isModuleCompleted(moduleId: string): boolean {
    const progress = this.curriculumService.pathProgress();
    return progress?.completedModules.includes(moduleId) ?? false;
  }

  isModuleCurrent(moduleId: string): boolean {
    const progress = this.curriculumService.pathProgress();
    return progress?.currentModuleId === moduleId;
  }

  getModuleProgress(moduleId: string): number {
    return this.curriculumService.getModuleProgress(moduleId);
  }

  getCategoryList(): Array<{ name: string; score: number }> {
    const perf = this.performance();
    if (!perf) return [];

    return Object.entries(perf.categoryScores).map(([name, score]) => ({
      name,
      score: Math.round(score)
    }));
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
