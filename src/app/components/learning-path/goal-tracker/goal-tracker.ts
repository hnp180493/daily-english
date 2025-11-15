import { Component, OnInit, signal, computed, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DatabaseService } from '../../../services/database/database.service';
import { ProgressService } from '../../../services/progress.service';
import { NotificationService } from '../../../services/notification.service';
import { WeeklyGoal } from '../../../models/weekly-goal.model';
import { ExerciseHistoryRecord } from '../../../models/exercise-history.model';

@Component({
  selector: 'app-goal-tracker',
  imports: [CommonModule],
  templateUrl: './goal-tracker.html',
  styleUrl: './goal-tracker.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true
})
export class GoalTracker implements OnInit {
  private databaseService = inject(DatabaseService);
  private progressService = inject(ProgressService);
  private notificationService = inject(NotificationService);

  currentGoal = signal<WeeklyGoal | null>(null);
  targetExercises = signal(10);
  isLoading = signal(true);
  achievementRate = signal<number | null>(null);

  completedExercises = computed(() => this.currentGoal()?.completedExercises || 0);
  progressPercentage = computed(() => {
    const goal = this.currentGoal();
    if (!goal || goal.targetExercises === 0) return 0;
    return Math.min(100, Math.round((goal.completedExercises / goal.targetExercises) * 100));
  });
  isGoalAchieved = computed(() => this.currentGoal()?.isAchieved ?? false);
  daysRemaining = computed(() => {
    const goal = this.currentGoal();
    if (!goal) return 0;
    
    const weekStart = new Date(goal.weekStartDate);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);
    
    const now = new Date();
    const diff = weekEnd.getTime() - now.getTime();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  });

  async ngOnInit(): Promise<void> {
    console.log('[GoalTracker] Component initialized');
    await this.loadCurrentGoal();
    await this.calculateAchievementRate();
    
    // Update progress immediately after loading goal
    console.log('[GoalTracker] Current goal after load:', this.currentGoal());
    await this.updateProgress();
    
    // Subscribe to progress updates to auto-update goal progress
    console.log('[GoalTracker] Setting up progress subscription');
    this.progressService.getUserProgress().subscribe(async (progress) => {
      console.log('[GoalTracker] Progress update received, total exercises:', Object.keys(progress.exerciseHistory || {}).length);
      console.log('[GoalTracker] Current goal in subscription:', this.currentGoal());
      await this.updateProgress();
    });
  }

  async loadCurrentGoal(): Promise<void> {
    this.isLoading.set(true);
    try {
      const weekStart = this.getWeekStartDate();
      console.log('[GoalTracker] Loading goal for week starting:', weekStart);
      const goal = await this.databaseService.loadWeeklyGoalByDateAuto(weekStart).toPromise();
      console.log('[GoalTracker] Goal loaded from database:', goal);
      
      if (goal) {
        // Ensure goal has all required fields
        const validGoal: WeeklyGoal = {
          userId: goal.userId || '',
          weekStartDate: goal.weekStartDate,
          targetExercises: goal.targetExercises || 10,
          completedExercises: goal.completedExercises || 0,
          isAchieved: goal.isAchieved || false,
          bonusPointsEarned: goal.bonusPointsEarned || 0
        };
        console.log('[GoalTracker] Setting valid goal:', validGoal);
        this.currentGoal.set(validGoal);
      } else {
        console.log('[GoalTracker] No goal found, setting null');
        this.currentGoal.set(null);
      }
      
      console.log('[GoalTracker] Current goal signal value:', this.currentGoal());
    } catch (error) {
      console.error('[GoalTracker] Failed to load weekly goal:', error);
      this.currentGoal.set(null);
    } finally {
      this.isLoading.set(false);
    }
  }

  async setGoal(): Promise<void> {
    const target = this.targetExercises();
    if (target < 3 || target > 50) return;

    this.isLoading.set(true);
    try {
      const weekStart = this.getWeekStartDate();
      const goal: WeeklyGoal = {
        userId: '', // Will be set by database service
        weekStartDate: weekStart,
        targetExercises: target,
        completedExercises: 0,
        isAchieved: false,
        bonusPointsEarned: 0
      };

      await this.databaseService.saveWeeklyGoalAuto(goal).toPromise();
      this.currentGoal.set(goal);
    } catch (error) {
      console.error('Failed to set weekly goal:', error);
    } finally {
      this.isLoading.set(false);
    }
  }

  async updateProgress(): Promise<void> {
    const goal = this.currentGoal();
    if (!goal) {
      console.log('[GoalTracker] No goal set, skipping update');
      return;
    }

    const progress = await this.progressService.getUserProgress().toPromise();
    const history = progress?.exerciseHistory || {};
    const weekStart = new Date(goal.weekStartDate);
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);
    weekEnd.setHours(23, 59, 59, 999);

    console.log('[GoalTracker] Updating progress...');
    console.log('[GoalTracker] Week range:', weekStart.toISOString(), 'to', weekEnd.toISOString());
    console.log('[GoalTracker] Total exercises in history:', Object.keys(history).length);

    const allAttempts = Object.values(history);
    console.log('[GoalTracker] All attempts:', allAttempts.map((h: any) => ({
      id: h.exerciseId,
      timestamp: h.timestamp,
      date: new Date(h.timestamp).toISOString()
    })));

    const completedThisWeek = allAttempts.filter((h: any) => {
      const date = new Date(h.timestamp);
      const inRange = date >= weekStart && date < weekEnd;
      console.log('[GoalTracker] Exercise', h.exerciseId, 'at', date.toISOString(), 'in range?', inRange);
      return inRange;
    }).length;

    console.log('[GoalTracker] Completed this week:', completedThisWeek);
    console.log('[GoalTracker] Previous count:', goal.completedExercises);

    goal.completedExercises = completedThisWeek;
    
    if (completedThisWeek >= goal.targetExercises && !goal.isAchieved) {
      goal.isAchieved = true;
      goal.bonusPointsEarned = 500;
      console.log('[GoalTracker] Goal achieved! Adding bonus points');
      this.progressService.addBonusPoints(500);
    }

    await this.databaseService.saveWeeklyGoalAuto(goal).toPromise();
    this.currentGoal.set({ ...goal });
    console.log('[GoalTracker] Goal updated and saved');
  }

  onTargetChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const value = parseInt(input.value, 10);
    if (!isNaN(value)) {
      this.targetExercises.set(Math.max(3, Math.min(50, value)));
    }
  }

  getRemainingExercises(): number {
    const goal = this.currentGoal();
    if (!goal) return 0;
    return Math.max(0, goal.targetExercises - goal.completedExercises);
  }

  getMotivationalMessage(): string {
    const percentage = this.progressPercentage();
    
    if (percentage >= 100) return "Amazing work!";
    if (percentage >= 75) return "Almost there!";
    if (percentage >= 50) return "You're halfway there!";
    if (percentage >= 25) return "Great start!";
    return "Let's get started!";
  }

  getProgressColor(): string {
    const percentage = this.progressPercentage();
    
    if (percentage >= 100) return 'text-green-500';
    if (percentage >= 75) return 'text-secondary-500';
    if (percentage >= 50) return 'text-primary-500';
    return 'text-yellow-500';
  }

  private getWeekStartDate(): string {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Monday as start
    const monday = new Date(now);
    monday.setDate(now.getDate() + diff);
    monday.setHours(0, 0, 0, 0);
    return monday.toISOString().split('T')[0];
  }

  private async calculateAchievementRate(): Promise<void> {
    try {
      // This would need to query historical goals from database
      // For now, return null
      this.achievementRate.set(null);
    } catch (error) {
      console.error('Failed to calculate achievement rate:', error);
    }
  }
}
