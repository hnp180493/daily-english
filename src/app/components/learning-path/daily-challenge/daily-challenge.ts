import { Component, OnInit, OnDestroy, signal, computed, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { CurriculumService } from '../../../services/curriculum.service';
import { AdaptiveEngineService } from '../../../services/adaptive-engine.service';
import { StreakService } from '../../../services/streak.service';
import { DatabaseService } from '../../../services/database/database.service';
import { DailyChallenge as DailyChallengeModel } from '../../../models/daily-challenge.model';
import { Exercise } from '../../../models/exercise.model';
import { getTodayLocalDate, toLocalDateString } from '../../../utils/date.utils';

@Component({
  selector: 'app-daily-challenge',
  imports: [CommonModule, RouterModule],
  templateUrl: './daily-challenge.html',
  styleUrl: './daily-challenge.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true
})
export class DailyChallenge implements OnInit, OnDestroy {
  private curriculumService = inject(CurriculumService);
  private adaptiveEngine = inject(AdaptiveEngineService);
  private streakService = inject(StreakService);
  private databaseService = inject(DatabaseService);

  challenge = signal<DailyChallengeModel | null>(null);
  exercise = signal<Exercise | null>(null);
  isLoading = signal(true);
  timeRemaining = signal('');
  
  private timerInterval?: number;

  currentStreak = signal(0);
  streakMultiplier = computed(() => this.streakService.getStreakMultiplier());
  isCompleted = computed(() => this.challenge()?.isCompleted ?? false);

  async ngOnInit(): Promise<void> {
    // Load current streak
    this.streakService.getCurrentStreak().subscribe(streak => {
      this.currentStreak.set(streak);
    });
    
    await this.loadDailyChallenge();
    this.startCountdown();
  }

  ngOnDestroy(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
  }

  async loadDailyChallenge(): Promise<void> {
    this.isLoading.set(true);
    try {
      const today = getTodayLocalDate();
      let challenge = await firstValueFrom(this.databaseService.loadDailyChallengeByDateAuto(today));

      console.log('[DailyChallenge] Loaded challenge:', challenge);

      // Check if challenge has invalid exerciseId (old format)
      if (challenge && challenge.exerciseId.startsWith('daily-challenge-')) {
        console.log('[DailyChallenge] Found old challenge with invalid exerciseId, updating...');
        // Update the existing challenge with valid exerciseId
        challenge = await this.updateChallengeWithValidExercise(challenge);
      }

      if (!challenge) {
        console.log('[DailyChallenge] No valid challenge found, generating new one...');
        challenge = await this.generateNewChallenge();
      }

      this.challenge.set(challenge);
      console.log('[DailyChallenge] Challenge set:', challenge);

      if (challenge.exerciseId) {
        console.log('[DailyChallenge] Loading exercise:', challenge.exerciseId);
        const ex = await this.curriculumService.getExerciseById(challenge.exerciseId);
        console.log('[DailyChallenge] Exercise loaded:', ex);
        this.exercise.set(ex);
      }
    } catch (error) {
      console.error('Failed to load daily challenge:', error);
    } finally {
      this.isLoading.set(false);
    }
  }

  private async generateNewChallenge(): Promise<DailyChallengeModel> {
    const today = new Date();
    const isWeekend = today.getDay() === 0 || today.getDay() === 6;
    
    console.log('[DailyChallenge] Generating new challenge...');
    
    // Get recommended exercise from adaptive engine with shorter timeout
    let exerciseId = '';
    try {
      console.log('[DailyChallenge] Trying adaptive engine...');
      const recommended = await Promise.race([
        firstValueFrom(this.adaptiveEngine.getNextRecommendedExercise()),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 500))
      ]);
      exerciseId = recommended?.exerciseId || '';
      console.log('[DailyChallenge] Recommended exercise from adaptive engine:', exerciseId);
    } catch (error) {
      console.error('[DailyChallenge] Failed to get recommended exercise:', error);
    }
    
    // Fallback: Get first exercise from current module
    if (!exerciseId) {
      try {
        console.log('[DailyChallenge] No recommendation, trying current path...');
        const path = await this.curriculumService.getUserCurrentPath();
        console.log('[DailyChallenge] Current path:', path);
        if (path && path.modules.length > 0) {
          const firstModule = path.modules[0];
          console.log('[DailyChallenge] First module:', firstModule);
          if (firstModule.exerciseIds && firstModule.exerciseIds.length > 0) {
            // Get a random exercise from the module instead of always first
            const randomIndex = Math.floor(Math.random() * firstModule.exerciseIds.length);
            exerciseId = firstModule.exerciseIds[randomIndex];
            console.log('[DailyChallenge] Using random exercise from module:', exerciseId);
          }
        }
      } catch (error) {
        console.error('[DailyChallenge] Failed to get path:', error);
      }
    }
    
    // Last fallback: use a default exercise ID
    if (!exerciseId) {
      exerciseId = 'ex-001';
      console.log('[DailyChallenge] Using default exercise:', exerciseId);
    }
    
    console.log('[DailyChallenge] Final exerciseId:', exerciseId);
    
    const challenge: DailyChallengeModel = {
      id: crypto.randomUUID(),
      userId: '', // Will be set by database service
      date: toLocalDateString(today),
      exerciseId,
      isCompleted: false,
      isWeekendChallenge: isWeekend,
      bonusPoints: isWeekend ? 100 : 50
    };

    console.log('[DailyChallenge] Saving challenge:', challenge);
    try {
      await firstValueFrom(this.databaseService.saveDailyChallengeAuto(challenge));
      console.log('[DailyChallenge] Challenge saved successfully');
    } catch (error) {
      console.error('[DailyChallenge] Failed to save challenge:', error);
    }
    return challenge;
  }

  private startCountdown(): void {
    this.updateCountdown();
    this.timerInterval = window.setInterval(() => {
      this.updateCountdown();
    }, 1000);
  }

  private updateCountdown(): void {
    const now = new Date();
    const midnight = new Date(now);
    midnight.setHours(24, 0, 0, 0);
    
    const diff = midnight.getTime() - now.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    
    this.timeRemaining.set(`${hours}h ${minutes}m ${seconds}s`);
  }

  getBonusPoints(): number {
    const challenge = this.challenge();
    if (!challenge) return 0;
    
    const baseBonus = challenge.bonusPoints || 50;
    const multiplier = this.streakMultiplier();
    return Math.floor(baseBonus * (typeof multiplier === 'number' ? multiplier : 1));
  }

  onStartChallenge(): void {
    const ex = this.exercise();
    console.log('[DailyChallenge] Start Challenge clicked');
    console.log('[DailyChallenge] Exercise:', ex);
    console.log('[DailyChallenge] Exercise ID:', ex?.id);
    
    if (!ex || !ex.id) {
      console.error('[DailyChallenge] No exercise or exercise ID available!');
    }
  }

  private async updateChallengeWithValidExercise(oldChallenge: DailyChallengeModel): Promise<DailyChallengeModel> {
    console.log('[DailyChallenge] Updating challenge with valid exercise...');
    
    // Get valid exerciseId
    let exerciseId = '';
    try {
      console.log('[DailyChallenge] Trying adaptive engine...');
      const recommended = await Promise.race([
        firstValueFrom(this.adaptiveEngine.getNextRecommendedExercise()),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 500))
      ]);
      exerciseId = recommended?.exerciseId || '';
      console.log('[DailyChallenge] Recommended exercise:', exerciseId);
    } catch (error) {
      console.error('[DailyChallenge] Failed to get recommended exercise:', error);
    }
    
    // Fallback: Get first exercise from current module
    if (!exerciseId) {
      try {
        console.log('[DailyChallenge] Trying current path...');
        const path = await this.curriculumService.getUserCurrentPath();
        if (path && path.modules.length > 0) {
          const firstModule = path.modules[0];
          if (firstModule.exerciseIds && firstModule.exerciseIds.length > 0) {
            // Get a random exercise from the module
            const randomIndex = Math.floor(Math.random() * firstModule.exerciseIds.length);
            exerciseId = firstModule.exerciseIds[randomIndex];
            console.log('[DailyChallenge] Using random exercise from module:', exerciseId);
          }
        }
      } catch (error) {
        console.error('[DailyChallenge] Failed to get path:', error);
      }
    }
    
    // Last fallback
    if (!exerciseId) {
      exerciseId = 'ex-001';
      console.log('[DailyChallenge] Using default exercise:', exerciseId);
    }
    
    // Update the challenge
    const updatedChallenge = {
      ...oldChallenge,
      exerciseId
    };
    
    console.log('[DailyChallenge] Updating challenge:', updatedChallenge);
    try {
      await firstValueFrom(this.databaseService.saveDailyChallengeAuto(updatedChallenge));
      console.log('[DailyChallenge] Challenge updated successfully');
      return updatedChallenge;
    } catch (error) {
      console.error('[DailyChallenge] Failed to update challenge:', error);
      return updatedChallenge;
    }
  }
}
