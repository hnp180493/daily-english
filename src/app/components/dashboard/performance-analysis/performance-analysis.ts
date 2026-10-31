import { Component, ChangeDetectionStrategy, input, inject, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AnalyticsData } from '../../../models/analytics.model';
import { ExerciseService } from '../../../services/exercise.service';
import { TranslationService } from '../../../services/translation.service';
import { categoryLabel, levelLabel } from '../dashboard-i18n';

@Component({
  selector: 'app-performance-analysis',
  imports: [CommonModule],
  templateUrl: './performance-analysis.html',
  styleUrl: './performance-analysis.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PerformanceAnalysisComponent {
  private router = inject(Router);
  private exerciseService = inject(ExerciseService);
  protected translate = inject(TranslationService);
  
  analytics = input.required<AnalyticsData>();
  exerciseTitles = signal<Map<string, string>>(new Map());

  constructor() {
    effect(() => {
      const data = this.analytics();
      const ids = data.exercisesNeedingReview?.map(e => e.exerciseId) || [];
      
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

  getExerciseTitle(exerciseId: string): string {
    return this.exerciseTitles().get(exerciseId) || exerciseId;
  }

  getAccuracyClass(avgScore: number): string {
    if (avgScore >= 80) return 'high';
    if (avgScore >= 60) return 'medium';
    return 'low';
  }

  getPerformanceLabel(avgScore: number): string {
    if (avgScore >= 80) return this.translate.t('dashboard.perf.excellent');
    if (avgScore >= 60) return this.translate.t('dashboard.perf.good');
    return this.translate.t('dashboard.perf.needs_practice');
  }

  getCategoryName(category: string, fallback: string): string {
    return categoryLabel(this.translate, category, fallback);
  }

  getLevelName(level: string, fallback: string): string {
    return levelLabel(this.translate, level, fallback);
  }

  goToExercise(exerciseId: string): void {
    this.router.navigate(['/exercise', exerciseId]);
  }
}
