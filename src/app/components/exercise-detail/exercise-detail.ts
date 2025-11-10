import { DifficultyLevel } from './../../models/exercise.model';
import { Component, ChangeDetectionStrategy, OnInit, viewChild, inject, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Location } from '@angular/common';
import { filter, take } from 'rxjs/operators';
import { Exercise, ExerciseAttempt, UserProgressHelper } from '../../models/exercise.model';
import { ExerciseService } from '../../services/exercise.service';
import { CustomExerciseService } from '../../services/custom-exercise.service';
import { AIService } from '../../services/ai/ai.service';
import { ProgressService } from '../../services/progress.service';
import { FavoriteService } from '../../services/favorite.service';
import { TTSService } from '../../services/tts.service';
import { AuthService } from '../../services/auth.service';
import { FeedbackPanelComponent } from '../feedback-panel/feedback-panel';
import { ApiKeyPromptComponent } from '../api-key-prompt/api-key-prompt';
import { ErrorModal } from '../error-modal/error-modal';
import { ConfigService } from '../../services/config.service';
import { ExerciseStateService } from '../../services/exercise-state.service';
import { ExerciseSubmissionService } from '../../services/exercise-submission.service';
import { ExercisePersistenceService } from '../../services/exercise-persistence.service';
import { ExerciseValidationService } from '../../services/exercise-validation.service';
import { PointsAnimationService } from '../../services/points-animation.service';
import { SettingsService } from '../../services/settings.service';
import { SeoService } from '../../services/seo.service';
import { VietnameseSeoService } from '../../services/vietnamese-seo.service';

@Component({
  selector: 'app-exercise-detail',
  imports: [
    CommonModule,
    FormsModule,
    FeedbackPanelComponent,
    ApiKeyPromptComponent,
    ErrorModal
  ],
  templateUrl: './exercise-detail.html',
  styleUrl: './exercise-detail.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ExerciseDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private location = inject(Location);
  private exerciseService = inject(ExerciseService);
  private customExerciseService = inject(CustomExerciseService);
  private aiService = inject(AIService);
  private progressService = inject(ProgressService);
  private favoriteService = inject(FavoriteService);
  private authService = inject(AuthService);
  private configService = inject(ConfigService);
  private validationService = inject(ExerciseValidationService);
  private pointsAnimationService = inject(PointsAnimationService);
  private settingsService = inject(SettingsService);
  private seoService = inject(SeoService);
  private vietnameseSeoService = inject(VietnameseSeoService);

  // Extracted services
  stateService = inject(ExerciseStateService);
  submissionService = inject(ExerciseSubmissionService);
  persistenceService = inject(ExercisePersistenceService);
  ttsService = inject(TTSService);

  translationInput = viewChild<any>('translationInput');

  exercise = signal<Exercise | null>(null);
  isCustomExercise = signal(false);
  isLoadingHint = signal(false);
  showApiKeyPrompt = signal(false);
  showErrorModal = signal(false);
  errorMessage = signal('');
  isReviewMode = signal(false);
  // Delegate to state service
  sentences = this.stateService.sentences;
  currentSentenceIndex = this.stateService.currentSentenceIndex;
  currentSentence = this.stateService.currentSentence;
  completedSentences = this.stateService.completedSentences;
  progressPercentage = this.stateService.progressPercentage;
  isExerciseComplete = this.stateService.isExerciseComplete;
  canProceedToNext = this.stateService.canProceedToNext;
  hasMoreHints = this.stateService.hasMoreHints;
  hintsShown = this.stateService.hintsShown;
  currentHint = this.stateService.currentHint;
  previousHints = this.stateService.previousHints;
  userInput = this.stateService.userInput;

  // Delegate to submission service
  feedback = this.submissionService.feedback;
  accuracyScore = this.submissionService.accuracyScore;
  isSubmitting = this.submissionService.isSubmitting;
  isStreaming = this.submissionService.isStreaming;
  userInputAfterSubmit = this.submissionService.userInputAfterSubmit;

  // Progress tracking
  private progressSignal = this.progressService.getProgressSignal();
  credits = computed(() => this.progressSignal().totalCredits);
  points = computed(() => this.progressSignal().totalPoints);
  streak = computed(() => {
    this.progressSignal();
    return this.progressService.calculateStreak();
  });
  achievements = computed(() => this.progressSignal().achievements);

  exerciseStatus = computed(() => {
    const ex = this.exercise();
    if (!ex) return null;

    const progress = this.progressSignal();
    const attempt = progress.exerciseHistory[ex.id];

    if (!attempt) {
      return { status: 'new' as const, attemptCount: 0 };
    }

    return {
      status: 'attempted' as const,
      attemptCount: attempt.attemptNumber,
      bestScore: attempt.accuracyScore,
      perfectCompletions: attempt.accuracyScore === 100 ? 1 : 0
    };
  });

  perfectCompletions = computed(() => this.exerciseStatus()?.perfectCompletions || 0);
  creditsToEarn = computed(() => 1);

  exercisePoints = computed(() => {
    const ex = this.exercise();
    if (!ex) return 0;

    const status = this.exerciseStatus();
    if (!status) return 0;

    return this.validationService.calculateExercisePoints(ex, status.attemptCount);
  });

  isFavorite = computed(() => {
    const ex = this.exercise();
    return ex ? this.favoriteService.isFavorite(ex.id) : false;
  });

  isPlayingTTS = computed(() => this.ttsService.isPlaying());
  isPausedTTS = computed(() => this.ttsService.isPaused());
  currentTTSSentenceIndex = computed(() => this.ttsService.currentSentenceIndex());

  // Settings
  settings = this.settingsService.getSettingsSignal();

  constructor() {
    effect(() => {
      const points = this.points();
      console.log('[ExerciseDetail] Points changed:', points);
    });

    // Watch for progress data to load best attempt in review mode
    effect(() => {
      const progress = this.progressSignal();
      const ex = this.exercise();

      if (ex && this.isReviewMode() && Object.keys(progress.exerciseHistory || {}).length > 0) {
        const attempt = progress.exerciseHistory[ex.id];
        if (attempt && attempt.sentenceAttempts && attempt.sentenceAttempts.length > 0) {
          // Only load if sentences are not already loaded
          const currentSentences = this.sentences();
          const hasLoadedTranslations = currentSentences.some(s => s.translation && s.isCompleted);

          if (!hasLoadedTranslations) {
            console.log('[ExerciseDetail] Loading best attempt from progress effect');
            this.stateService.loadBestAttempt(attempt);
          }
        }
      }
    });
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id')!;
    const mode = this.route.snapshot.queryParamMap.get('mode');

    if (mode === 'review') {
      this.isReviewMode.set(true);
    }

    // Use unified method that handles both regular and custom exercises
    this.exerciseService.getExerciseByIdUnified(id).pipe(
      filter(exercise => !!exercise),
      take(1)
    ).subscribe(exercise => {
      if (exercise) {
        const isCustom = this.exerciseService.isCustomExercise(id);
        this.loadExercise(exercise, isCustom, id);
      } else {
        this.router.navigate(['/exercises']);
      }
    });
  }

  private loadExercise(exercise: Exercise, isCustom: boolean, id: string): void {
    this.exercise.set(exercise);
    this.isCustomExercise.set(isCustom);
    this.stateService.initializeSentences(exercise.sourceText);

    // Update Vietnamese SEO for exercise page
    this.updateVietnameseSEO(exercise);

    // Update SEO meta tags for this exercise
    this.updateExerciseSeo(exercise);

    if (this.isReviewMode()) {
      this.loadBestAttempt(id);
    } else {
      const hasProgress = this.loadProgress(id);
      // If no valid progress found, ensure we start from sentence 0
      if (!hasProgress) {
        this.stateService.currentSentenceIndex.set(0);
      }
    }
  }

  private updateExerciseSeo(exercise: Exercise): void {
    // Generate title from exercise title or first sentence
    const title = exercise.title || exercise.sourceText.split('.')[0].substring(0, 50);
    
    // Generate description from exercise description or source text
    const description = exercise.description || 
      `Luyện tập dịch tiếng Anh: ${exercise.sourceText.substring(0, 120)}...`;
    
    // Update meta tags
    this.seoService.updateTags({
      title: `${title} - Daily English`,
      description,
      keywords: ['bài tập tiếng anh', 'luyện dịch', exercise.category],
      type: 'article',
    });

    // Add LearningResource structured data
    const difficultyLevel = exercise.level || 'Beginner';
    const learningResourceSchema = this.seoService.generateLearningResourceSchema(
      title,
      description,
      difficultyLevel
    );
    this.seoService.setStructuredData(learningResourceSchema);
  }

  private loadProgress(exerciseId: string): boolean {
    const state = this.persistenceService.loadProgress(exerciseId);
    if (state) {
      // Find the first incomplete sentence
      const firstIncomplete = state.sentences.findIndex(s => !s.isCompleted);

      // If there's an incomplete sentence, set currentIndex to it
      if (firstIncomplete !== -1) {
        state.currentIndex = firstIncomplete;
        console.log('[ExerciseDetail] Resuming at first incomplete sentence:', firstIncomplete);
      } else {
        // All sentences completed, set to last sentence
        state.currentIndex = state.sentences.length - 1;
      }

      this.stateService.setState(state);
      return true;
    }
    return false;
  }

  private saveProgress(): void {
    const ex = this.exercise();
    if (!ex) return;
    this.persistenceService.saveProgress(ex.id, this.stateService.getState());
  }

  private clearProgress(): void {
    const ex = this.exercise();
    if (!ex) return;
    this.persistenceService.clearProgress(ex.id);
  }

  private checkAndLoadCompletedExercise(exerciseId: string): void {
    const progress = this.progressSignal();
    const attempt = progress.exerciseHistory[exerciseId];

    console.log('[ExerciseDetail] checkAndLoadCompletedExercise:', {
      exerciseId,
      hasAttempt: !!attempt,
      hasSentenceAttempts: attempt?.sentenceAttempts?.length || 0,
      attemptData: attempt
    });

    // Don't auto-load completed exercises - let user start fresh
    // They can use "Practice Again" button if they want to redo
    // This prevents jumping to sentence 2 when entering an exercise
  }

  private loadBestAttempt(exerciseId: string): void {
    const progress = this.progressSignal();
    const attempt = progress.exerciseHistory[exerciseId];

    if (!attempt) return;

    console.log('[ExerciseDetail] loadBestAttempt:', {
      exerciseId,
      sentenceAttemptsCount: attempt.sentenceAttempts?.length || 0
    });

    this.stateService.loadBestAttempt(attempt);
  }

  private createFallbackSentenceAttempts(attempt: ExerciseAttempt): void {
    // Create fallback sentence attempts from the overall userInput
    const sentences = this.stateService.sentences();
    const userInputParts = attempt.userInput.split(/[.!?]+/).filter(s => s.trim());

    this.stateService.sentences.update(sents => {
      return sents.map((s, index) => ({
        ...s,
        translation: userInputParts[index]?.trim() || attempt.userInput,
        isCompleted: true,
        accuracyScore: attempt.accuracyScore
      }));
    });

    this.stateService.currentSentenceIndex.set(sentences.length);
  }

  onSubmit(): void {
    if (!this.configService.hasValidConfig()) {
      this.showApiKeyPrompt.set(true);
      return;
    }

    const ex = this.exercise();
    if (!ex || !this.userInput().trim()) return;

    this.submissionService.submitTranslation(ex, ex.id).subscribe({
      next: (result) => {
        // Auto-play TTS if enabled, translation is complete, and score >= 90
        if (
          result.complete &&
          this.settings().autoPlayTTSAfterTranslation &&
          result.score >= 90
        ) {
          const translatedText = this.submissionService.userInputAfterSubmit();
          this.ttsService.speak(translatedText);
          // if (translatedText) {
          //   setTimeout(() => {
          //     this.ttsService.speak(translatedText);
          //   }, 300);
          // }
        }

        if (result.autoAdvance && result.wasLastSentence) {
          this.recordAttempt();
          this.clearProgress();
          this.isReviewMode.set(true);

          // Update URL to include review mode so refresh works correctly
          this.router.navigate([], {
            relativeTo: this.route,
            queryParams: { mode: 'review' },
            queryParamsHandling: 'merge'
          });
        }

        if (result.complete) {
          this.focusInput();
        }
      },
      error: (error) => {
        console.error('Translation analysis error:', error);
        this.errorMessage.set(error?.message || 'An error occurred while analyzing your translation.');
        this.showErrorModal.set(true);
      }
    });
  }

  onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.canProceedToNext() ? this.onNextSentence() : this.onSubmit();
    }
  }

  onInputChange(): void {
    this.saveProgress();
  }

  onHint(): void {
    if (!this.configService.hasValidConfig()) {
      this.showApiKeyPrompt.set(true);
      return;
    }

    const ex = this.exercise();
    const currentSentence = this.currentSentence();

    if (!ex || !currentSentence || this.isLoadingHint()) return;

    this.isLoadingHint.set(true);

    const currentIdx = this.currentSentenceIndex();
    const sents = this.sentences();

    // Collect previous translations as a single paragraph for context
    const translatedContext = sents
      .slice(0, currentIdx)
      .filter(s => s.isCompleted && s.translation)
      .map(s => s.translation)
      .join(' ');

    const tempExercise = {
      ...ex,
      sourceText: currentSentence.original,
      fullContext: ex.sourceText,
      translatedContext: translatedContext || undefined
    };

    this.aiService.generateHint(
      currentSentence.original,
      this.userInput(),
      this.previousHints(),
      tempExercise
    ).subscribe({
      next: (hint) => {
        this.stateService.addHint(hint);
        this.isLoadingHint.set(false);
      },
      error: (error) => {
        console.error('Failed to generate hint:', error);
        this.errorMessage.set(error?.message || 'Failed to generate hint. Please try again.');
        this.showErrorModal.set(true);
        this.isLoadingHint.set(false);
      }
    });
  }

  onQuit(): void {
    this.saveProgress();
    this.location.back();
  }

  onNextSentence(): void {
    const wasLastSentence = (this.currentSentenceIndex() + 1) >= this.sentences().length;

    this.stateService.moveToNextSentence();
    this.submissionService.feedback.set(null);
    this.submissionService.accuracyScore.set(0);

    if (wasLastSentence) {
      console.log('Last sentence completed, recording attempt...');
      this.recordAttempt();
      this.clearProgress();
      this.isReviewMode.set(true);

      // Update URL to include review mode so refresh works correctly
      const ex = this.exercise();
      if (ex) {
        this.router.navigate([], {
          relativeTo: this.route,
          queryParams: { mode: 'review' },
          queryParamsHandling: 'merge'
        });
      }
    } else {
      this.saveProgress();
      this.focusInput();
    }
  }

  onPracticeAgain(): void {
    const ex = this.exercise();
    if (!ex) return;

    this.clearProgress();
    this.isReviewMode.set(false);
    this.stateService.reset();
    this.submissionService.reset();
    this.stateService.initializeSentences(ex.sourceText);
    this.focusInput();
  }

  private focusInput(): void {
    setTimeout(() => {
      const inputEl = this.translationInput();
      if (inputEl?.nativeElement) {
        inputEl.nativeElement.focus();
      }
    }, 100);
  }

  toggleFavorite(): void {
    const ex = this.exercise();
    if (ex) {
      this.favoriteService.toggleFavorite(ex.id);
    }
  }

  toggleFullTextTTS(): void {
    if (this.isPlayingTTS()) {
      this.ttsService.toggle();
    } else {
      const sents = this.sentences().filter(s => s.isCompleted);
      if (sents.length === 0) return;

      const fullText = sents.map(s => s.translation).join(' ');
      this.ttsService.speak(fullText);
    }
  }

  playSentence(index: number): void {
    const sentence = this.sentences()[index];
    if (!sentence || !sentence.isCompleted) return;

    this.ttsService.speak(sentence.translation);
  }

  stopTTS(): void {
    this.ttsService.stop();
  }

  private recordAttempt(): void {
    const ex = this.exercise();
    if (!ex) return;

    const status = this.progressService.getExerciseStatus(ex.id);
    const sents = this.sentences();

    const accuracyScores = sents.map(s => s.accuracyScore || 0);
    const avgAccuracy = this.validationService.calculateAverageAccuracy(accuracyScores);
    const fullTranslation = sents.map(s => s.translation).join(' ');

    const sentenceAttempts = sents.map((s, index) => ({
      sentenceIndex: index,
      userInput: s.translation,
      accuracyScore: s.accuracyScore || 0,
      feedback: []
    }));

    const pointsEarned = this.exercisePoints();
    const attempt: ExerciseAttempt = {
      exerciseId: ex.id,
      category: ex.category,
      attemptNumber: status.attemptCount + 1,
      userInput: fullTranslation,
      accuracyScore: avgAccuracy,
      pointsEarned,
      feedback: [],
      timestamp: new Date(),
      hintsUsed: this.hintsShown(),
      sentenceAttempts
    };

    // Trigger points animation first, then record attempt when animation completes
    if (pointsEarned > 0) {
      setTimeout(() => {
        const pointsElement = document.querySelector('.stat-item');
        if (pointsElement) {
          // Start animation and wait for it to complete before recording
          this.pointsAnimationService.triggerPointsAnimation(pointsEarned, pointsElement as HTMLElement)
            .then(() => {
              // Record attempt only after animation completes
              this.progressService.recordAttempt(attempt);
              console.log('Attempt recorded after animation:', attempt);
            });
        } else {
          // Fallback: record immediately if element not found
          this.progressService.recordAttempt(attempt);
          console.log('Attempt recorded (no animation):', attempt);
        }
      }, 500);
    } else {
      // No points earned, record immediately
      this.progressService.recordAttempt(attempt);
      console.log('Attempt recorded (no points):', attempt);
    }
  }

  onCloseApiKeyPrompt(): void {
    this.showApiKeyPrompt.set(false);
  }

  onGoToSettings(): void {
    this.showApiKeyPrompt.set(false);
    this.router.navigate(['/profile']);
  }

  onCloseErrorModal(): void {
    this.showErrorModal.set(false);
    this.errorMessage.set('');
  }

  /**
   * Update Vietnamese SEO for exercise page
   */
  private updateVietnameseSEO(exercise: Exercise): void {
    if (!this.vietnameseSeoService.isConfigurationLoaded()) {
      console.warn('[ExerciseDetail] Vietnamese SEO configuration not loaded');
      return;
    }

    // Use exercise level directly (it's already a string)
    const level = exercise.level;
    const category = 'translation'; // Default category for exercises

    // Generate Vietnamese title
    const vietnameseTitle = this.vietnameseSeoService.getVietnameseTitle(
      exercise.title,
      category,
      level,
      exercise.title
    );

    // Generate Vietnamese description
    const exerciseDescription = exercise.description || `Luyện tập ${exercise.title}`;
    const vietnameseDescription = this.vietnameseSeoService.getVietnameseDescription(
      exercise.description || '',
      category,
      level,
      exerciseDescription
    );

    // Generate Vietnamese keywords
    const vietnameseKeywords = this.vietnameseSeoService.generateVietnameseKeywords(
      category,
      level
    );

    // Update Vietnamese meta tags
    this.vietnameseSeoService.updateVietnameseTags({
      title: exercise.title,
      description: exercise.description || '',
      vietnameseTitle,
      vietnameseDescription,
      vietnameseKeywords,
      image: '/og-image-vi.png',
      url: `https://dailyenglish.qzz.io/exercise/${exercise.id}`,
    });

    // Generate and set Vietnamese breadcrumb schema
    const breadcrumbs = [
      { name: 'Trang chủ', url: 'https://dailyenglish.qzz.io/' },
      { name: 'Bài tập', url: 'https://dailyenglish.qzz.io/exercises' },
      { name: exercise.title, url: `https://dailyenglish.qzz.io/exercise/${exercise.id}` },
    ];
    const breadcrumbSchema = this.vietnameseSeoService.generateVietnameseBreadcrumbSchema(breadcrumbs);
    this.vietnameseSeoService.setVietnameseStructuredData(breadcrumbSchema, 'exercise-breadcrumb');

    // Generate and set Vietnamese LearningResource schema
    const levelVietnamese = this.vietnameseSeoService['getLevelVietnamese'](level);
    const courseSchema = this.vietnameseSeoService.generateVietnameseCourseSchema({
      name: vietnameseTitle,
      description: vietnameseDescription,
      educationalLevel: levelVietnamese,
      teaches: 'Tiếng Anh',
    });
    this.vietnameseSeoService.setVietnameseStructuredData(courseSchema, 'exercise-course');

    // Set Zalo tags for sharing
    this.vietnameseSeoService.setZaloTags({
      title: vietnameseTitle,
      description: vietnameseDescription,
      image: 'https://dailyenglish.qzz.io/og-image-vi.png',
      url: `https://dailyenglish.qzz.io/exercise/${exercise.id}`,
    });

    console.log('[ExerciseDetail] Vietnamese SEO updated', {
      title: vietnameseTitle,
      keywords: vietnameseKeywords.length,
    });
  }
}
