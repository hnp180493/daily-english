import { Injectable, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { filter, take } from 'rxjs/operators';
import { Exercise } from '../models/exercise.model';
import { ExerciseService } from './exercise.service';
import { ExerciseStateService } from './exercise-state.service';
import { ExerciseSeoService } from './exercise-seo.service';
import { AnalyticsService } from './analytics.service';
import { ProgressService } from './progress.service';
import { ExerciseQuickReviewService } from './exercise-quick-review.service';

export interface ExerciseLoadResult {
  exercise: Exercise;
  isCustom: boolean;
  mode: 'normal' | 'review' | 'quick-review';
}

@Injectable({
  providedIn: 'root'
})
export class ExerciseLoaderService {
  private exerciseService = inject(ExerciseService);
  private stateService = inject(ExerciseStateService);
  private seoService = inject(ExerciseSeoService);
  private analyticsService = inject(AnalyticsService);
  private progressService = inject(ProgressService);
  private quickReviewService = inject(ExerciseQuickReviewService);
  private router = inject(Router);

  isLoadingExercise = signal(true);

  loadFromRoute(route: ActivatedRoute, onLoaded: (result: ExerciseLoadResult) => void): void {
    const slug = route.snapshot.paramMap.get('slug')!;
    const mode = route.snapshot.queryParamMap.get('mode');
    const quickReview = route.snapshot.queryParamMap.get('quickReview');

    const isCustom = slug.startsWith('custom-');
    
    const exercise$ = isCustom 
      ? this.exerciseService.getExerciseByIdUnified(slug)
      : this.exerciseService.getExerciseBySlug(slug);

    exercise$.pipe(
      filter(exercise => !!exercise),
      take(1)
    ).subscribe(exercise => {
      if (exercise) {
        let loadMode: 'normal' | 'review' | 'quick-review' = 'normal';
        
        if (mode === 'review') {
          loadMode = 'review';
        } else if (quickReview === 'true') {
          loadMode = 'quick-review';
          this.quickReviewService.initializeFromUrl(exercise.id);
        }
        
        onLoaded({ exercise, isCustom, mode: loadMode });
      } else {
        this.router.navigate(['/exercises']);
      }
    });
  }

  initializeExercise(
    exercise: Exercise,
    isCustom: boolean,
    mode: 'normal' | 'review' | 'quick-review',
    loadProgressFn: (id: string) => boolean,
    loadBestAttemptFn: (id: string) => void
  ): void {
    this.stateService.initializeSentences(exercise.sourceText);
    this.seoService.updateExerciseSeo(exercise);
    this.seoService.updateVietnameseSeo(exercise);

    if (mode === 'review') {
      loadBestAttemptFn(exercise.id);
    } else if (mode === 'quick-review') {
      this.setupQuickReviewMode(exercise.id, isCustom);
    } else {
      this.setupNormalMode(exercise, isCustom, loadProgressFn);
    }

    setTimeout(() => this.isLoadingExercise.set(false), 300);
  }

  private setupQuickReviewMode(exerciseId: string, isCustom: boolean): void {
    const progress = this.progressService.getProgressSignal()();
    const attempt = progress.exerciseHistory[exerciseId];
    
    if (attempt?.sentenceAttempts) {
      const sentences = this.stateService.sentences();
      this.quickReviewService.setupQuickReview(exerciseId, sentences);
    }
    
    this.analyticsService.trackExerciseStart(
      exerciseId,
      'general',
      'intermediate',
      'quick-review'
    );
  }

  private setupNormalMode(
    exercise: Exercise,
    isCustom: boolean,
    loadProgressFn: (id: string) => boolean
  ): void {
    const hasProgress = loadProgressFn(exercise.id);
    if (!hasProgress) {
      this.stateService.currentSentenceIndex.set(0);
    }
    
    this.analyticsService.trackExerciseStart(
      exercise.id,
      exercise.category || 'general',
      exercise.level || 'intermediate',
      isCustom ? 'custom' : 'standard'
    );
  }
}
