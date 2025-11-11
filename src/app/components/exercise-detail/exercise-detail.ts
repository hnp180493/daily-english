import { Component, ChangeDetectionStrategy, OnInit, viewChild, inject, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Location } from '@angular/common';
import { filter, take } from 'rxjs/operators';
import { Exercise } from '../../models/exercise.model';
import { ExerciseService } from '../../services/exercise.service';
import { AIService } from '../../services/ai/ai.service';
import { ProgressService } from '../../services/progress.service';
import { FavoriteService } from '../../services/favorite.service';
import { TTSService } from '../../services/tts.service';
import { FeedbackPanelComponent } from '../feedback-panel/feedback-panel';
import { ApiKeyPromptComponent } from '../api-key-prompt/api-key-prompt';
import { ErrorModal } from '../error-modal/error-modal';
import { LoadingSpinnerComponent } from '../loading-spinner/loading-spinner';
import { TranslationReview } from '../translation-review/translation-review';
import { ConfigService } from '../../services/config.service';
import { ExerciseStateService } from '../../services/exercise-state.service';
import { ExerciseSubmissionService } from '../../services/exercise-submission.service';
import { ExercisePersistenceService } from '../../services/exercise-persistence.service';
import { ExerciseValidationService } from '../../services/exercise-validation.service';
import { SettingsService } from '../../services/settings.service';
import { ExerciseSeoService } from '../../services/exercise-seo.service';
import { ExerciseRecordingService } from '../../services/exercise-recording.service';
import { TTSSettings } from '../tts-settings/tts-settings';

@Component({
  selector: 'app-exercise-detail',
  imports: [
    CommonModule,
    FormsModule,
    FeedbackPanelComponent,
    ApiKeyPromptComponent,
    ErrorModal,
    LoadingSpinnerComponent,
    TranslationReview,
    TTSSettings
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
  private aiService = inject(AIService);
  private progressService = inject(ProgressService);
  private favoriteService = inject(FavoriteService);
  private configService = inject(ConfigService);
  private validationService = inject(ExerciseValidationService);
  private settingsService = inject(SettingsService);
  private seoService = inject(ExerciseSeoService);
  private recordingService = inject(ExerciseRecordingService);

  stateService = inject(ExerciseStateService);
  submissionService = inject(ExerciseSubmissionService);
  persistenceService = inject(ExercisePersistenceService);
  ttsService = inject(TTSService);

  translationInput = viewChild<any>('translationInput');

  exercise = signal<Exercise | null>(null);
  isCustomExercise = signal(false);
  isLoadingHint = signal(false);
  isLoadingExercise = signal(true);
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
  hasThreeConsecutiveFailures = this.stateService.hasThreeConsecutiveFailures;

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

    this.seoService.updateExerciseSeo(exercise);
    this.seoService.updateVietnameseSeo(exercise);

    if (this.isReviewMode()) {
      this.loadBestAttempt(id);
    } else {
      const hasProgress = this.loadProgress(id);
      if (!hasProgress) {
        this.stateService.currentSentenceIndex.set(0);
      }
    }

    setTimeout(() => this.isLoadingExercise.set(false), 300);
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
          this.completeExercise();
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
      this.completeExercise();
    } else {
      this.saveProgress();
      this.focusInput();
    }
  }

  onRetrySentence(): void {
    // Reset current sentence state
    this.stateService.retrySentence();
    this.submissionService.feedback.set(null);
    this.submissionService.accuracyScore.set(0);
    this.submissionService.userInputAfterSubmit.set('');
    this.saveProgress();
    this.focusInput();
  }

  onSkipToNextSentence(): void {
    // Skip to next sentence after 3 failed attempts
    const wasLastSentence = (this.currentSentenceIndex() + 1) >= this.sentences().length;

    this.stateService.moveToNextSentence();
    this.submissionService.feedback.set(null);
    this.submissionService.accuracyScore.set(0);
    this.submissionService.userInputAfterSubmit.set('');

    if (wasLastSentence) {
      this.completeExercise();
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

  private completeExercise(): void {
    const ex = this.exercise();
    if (!ex) return;

    console.log('Exercise completed, recording attempt...');
    this.recordingService.recordAttempt(ex, this.hintsShown(), this.exercisePoints());
    this.clearProgress();
    this.isReviewMode.set(true);

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { mode: 'review' },
      queryParamsHandling: 'merge'
    });
  }

  onCloseApiKeyPrompt(): void {
    this.showApiKeyPrompt.set(false);
  }

  onGoToSettings(): void {
    this.showApiKeyPrompt.set(false);
    this.router.navigate(['/profile'], { queryParams: { tab: 'settings' } });
  }

  onCloseErrorModal(): void {
    this.showErrorModal.set(false);
    this.errorMessage.set('');
  }
}
