import { Component, ChangeDetectionStrategy, input, inject, signal, effect, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { BestPerformanceData } from '../../../models/enhanced-analytics.model';
import { ExerciseService } from '../../../services/exercise.service';
import { TranslationService } from '../../../services/translation.service';
import { dateLocale, unitMin, unitSec } from '../dashboard-i18n';

/**
 * Best Performances Component
 * Showcases top scoring exercises
 */
@Component({
  selector: 'app-best-performances',
  imports: [CommonModule],
  templateUrl: './best-performances.html',
  styleUrl: './best-performances.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BestPerformancesComponent {
  private router = inject(Router);
  private exerciseService = inject(ExerciseService);
  private cdr = inject(ChangeDetectorRef);
  protected translate = inject(TranslationService);
  
  data = input.required<BestPerformanceData[]>();
  exerciseTitles = signal<Map<string, string>>(new Map());

  constructor() {
    effect(() => {
      const performances = this.data();
      const ids = performances.map(p => p.exerciseId);
      
      if (ids.length === 0) return;
      
      this.exerciseService.getExercisesByIds(ids).subscribe(exercises => {
        const titleMap = new Map<string, string>();
        exercises.forEach(ex => {
          titleMap.set(ex.id, ex.title);
        });
        this.exerciseTitles.set(titleMap);
        this.cdr.markForCheck();
      });
    });
  }

  /**
   * Navigate to exercise detail page
   */
  navigateToExercise(exerciseId: string): void {
    this.router.navigate(['/exercise', exerciseId]);
  }

  /**
   * Handle keyboard navigation
   */
  handleKeyDown(event: KeyboardEvent, exerciseId: string): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.navigateToExercise(exerciseId);
    }
  }

  /**
   * Get medal icon for rank
   */
  getMedalIcon(rank: number): string {
    const medals: Record<number, string> = {
      1: '🥇',
      2: '🥈',
      3: '🥉'
    };
    return medals[rank] || '';
  }

  /**
   * Format date
   */
  formatDate(date: Date): string {
    return date.toLocaleDateString(dateLocale(this.translate), { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  }

  /**
   * Format time spent
   */
  formatTime(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    if (minutes === 0) {
      return unitSec(this.translate, remainingSeconds);
    }
    return `${unitMin(this.translate, minutes)} ${unitSec(this.translate, remainingSeconds)}`;
  }

  /**
   * Get exercise title or fallback to ID
   */
  getExerciseTitle(exerciseId: string): string {
    return this.exerciseTitles().get(exerciseId) || exerciseId;
  }
}
