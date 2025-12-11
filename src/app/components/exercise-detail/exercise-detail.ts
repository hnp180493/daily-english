import { Component, ChangeDetectionStrategy, OnInit, OnDestroy, viewChild, inject, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Location } from '@angular/common';
import { Exercise } from '../../models/exercise.model';
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
import { SettingsService } from '../../services/settings.service';
import { AnalyticsService } from '../../services/analytics.service';
import { ExerciseCompletionService } from '../../services/exercise-completion.service';
import { ExerciseKeyboardService } from '../../services/exercise-keyboard.service';
import { ExerciseQuickReviewService } from '../../services/exercise-quick-review.service';
import { ExerciseLoaderService } from '../../services/exercise-loader.service';
import { ExerciseNavigationService } from '../../services/exercise-navigation.service';
import { ExerciseMetricsService } from '../../services/exercise-metrics.service';
import { TTSSettings } from '../tts-settings/tts-settings';
import { PenaltyScore } from '../penalty-score/penalty-score';
import { ExerciseContext } from '../../models/ai.model';
import { MarkdownPipe } from '../../pipes/markdown.pipe';

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
    TTSSettings,
    PenaltyScore,
    MarkdownPipe,
  ],
  templateUrl: './exercise-detail.html',
  styleUrl: './exercise-detail.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:keydown)': 'onKeyDown($event)'
  }
})
export class ExerciseDetailComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private location = inject(Location);
  private aiService = inject(AIService);
  private progressService = inject(ProgressService);
  private favoriteService = inject(FavoriteService);
  private configService = inject(ConfigService);
  private settingsService = inject(SettingsService);
  private analyticsService = inject(AnalyticsService);
  private completionService = inject(ExerciseCompletionService);
  private keyboardService = inject(ExerciseKeyboardService);
  private loaderService = inject(ExerciseLoaderService);
  private navigationService = inject(ExerciseNavigationService);
  private metricsService = inject(ExerciseMetricsService);

  private progressSignal = this.progressService.getProgressSignal();

  stateService = inject(ExerciseStateService);
  submissionService = inject(ExerciseSubmissionService);
  persistenceService = inject(ExercisePersistenceService);
  ttsService = inject(TTSService);
  quickReviewService = inject(ExerciseQuickReviewService);

  translationInput = viewChild<any>('translationInput');

  exercise = signal<Exercise | null>(null);
  isCustomExercise = signal(false);
  isLoadingHint = signal(false);
  showApiKeyPrompt = signal(false);
  showErrorModal = signal(false);
  errorMessage = signal('');
  isReviewMode = signal(false);
  exerciseStartTime: Date | null = null;
  private saveProgressTimeout: any = null;
  // Delegate to state service
  sentences = this.stateService.sentences;
  currentSentenceIndex = this.stateService.currentSentenceIndex;
  currentSentence = this.stateService.currentSentence;
  completedSentences = this.stateService.completedSentences;

  // Delegate to quick review service
  quickReviewMode = this.quickReviewService.quickReviewMode;
  quickReviewProgress = this.quickReviewService.quickReviewProgress;
  
  // Delegate to loader service
  isLoadingExercise = this.loaderService.isLoadingExercise;
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

  // Delegate to metrics service
  points = computed(() => this.metricsService.getPoints());
  streak = computed(() => this.metricsService.getStreak());
  achievements = computed(() => this.metricsService.getAchievements());
  exerciseStatus = computed(() => this.metricsService.getExerciseStatus(this.exercise()));
  perfectCompletions = computed(() => this.exerciseStatus()?.perfectCompletions || 0);
  creditsToEarn = computed(() => 1);
  exercisePoints = computed(() => this.metricsService.getExercisePoints(this.exercise(), this.exerciseStatus()));
  penaltyMetrics = computed(() => this.metricsService.getPenaltyMetrics(this.exercise(), this.isExerciseComplete(), this.isReviewMode()));
  currentPenaltyMetrics = computed(() => this.metricsService.getCurrentPenaltyMetrics(this.isReviewMode()));
  isFavorite = computed(() => {
    const ex = this.exercise();
    return ex ? this.metricsService.isFavorite(ex.id) : false;
  });

  isPlayingTTS = computed(() => this.ttsService.isPlaying());
  isPausedTTS = computed(() => this.ttsService.isPaused());
  currentTTSSentenceIndex = computed(() => this.ttsService.currentSentenceIndex());

  // Settings
  settings = this.settingsService.getSettingsSignal();

  constructor() {
    this.setupEffects();
    this.setupKeyboardShortcuts();
  }

  private setupEffects(): void {
    effect(() => {
      const points = this.points();
      console.log('[ExerciseDetail] Points changed:', points);
    });

    effect(() => {
      const progress = this.progressSignal();
      const ex = this.exercise();

      if (ex && this.isReviewMode() && Object.keys(progress.exerciseHistory || {}).length > 0) {
        const attempt = progress.exerciseHistory[ex.id];
        if (attempt && attempt.sentenceAttempts && attempt.sentenceAttempts.length > 0) {
          const currentSentences = this.sentences();
          const hasLoadedTranslations = currentSentences.some(s => s.translation && s.isCompleted);

          if (!hasLoadedTranslations) {
            this.stateService.loadBestAttempt(attempt);
          }
        }
      }
    });
  }

  private setupKeyboardShortcuts(): void {
    this.keyboardService.registerShortcuts([
      {
        key: 'Enter',
        description: 'Submit or next sentence',
        action: () => {
          if (this.canProceedToNext()) {
            this.onNextSentence();
          } else if (!this.isReviewMode() && !this.isExerciseComplete()) {
            this.onSubmit();
          }
        }
      },
      {
        key: 'r',
        description: 'Retry sentence',
        action: () => this.onRetrySentence(),
        condition: () => this.canProceedToNext() || this.hasThreeConsecutiveFailures()
      }
    ]);
  }

  ngOnInit(): void {
    // Scroll to top when entering exercise detail
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    this.submissionService.reset();
    this.loadExercise();
  }

  private loadExercise(): void {
    this.loaderService.loadFromRoute(this.route, (result) => {
      this.exercise.set(result.exercise);
      this.isCustomExercise.set(result.isCustom);
      
      if (result.mode === 'review') {
        this.isReviewMode.set(true);
      }

      this.exerciseStartTime = new Date();
      
      this.loaderService.initializeExercise(
        result.exercise,
        result.isCustom,
        result.mode,
        (id) => this.loadProgress(id),
        (id) => this.loadBestAttempt(id)
      );
    });
  }



  private loadProgress(exerciseId: string): boolean {
    const state = this.persistenceService.loadProgress(exerciseId);
    if (state) {
      // Find the first incomplete sentence OR sentence with score < 90
      const firstIncomplete = state.sentences.findIndex(s =>
        !s.isCompleted || (s.accuracyScore !== undefined && s.accuracyScore < 90)
      );

      // If there's an incomplete or failed sentence, set currentIndex to it
      if (firstIncomplete !== -1) {
        state.currentIndex = firstIncomplete;
        // console.log('[ExerciseDetail] Resuming at first incomplete/failed sentence:', firstIncomplete);
        this.stateService.setState(state);
        return true;
      } else {
        // All sentences completed with passing scores - clear progress and don't load
        // This prevents "cheating" by redoing the exercise after passing
        console.log('[ExerciseDetail] All sentences passed, clearing progress');
        this.persistenceService.clearProgress(exerciseId);
        return false;
      }
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
        // Track submission
        this.analyticsService.trackExerciseSubmit(ex.id, result.accuracyScore >= 75);
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

  onTextareaEnter(event: KeyboardEvent): void {
    // Allow Enter when can proceed to next (even if textarea is readonly)
    if (this.canProceedToNext()) {
      event.preventDefault();
      this.onNextSentence();
      return;
    }

    // Otherwise, check normal conditions for submit
    if (!this.isSubmitting() && !this.hasThreeConsecutiveFailures() && this.userInput()) {
      event.preventDefault();
      this.onSubmit();
    }
  }

  onKeyDown(event: KeyboardEvent): void {
    this.keyboardService.handleKeyDown(event);
  }

  ngOnDestroy(): void {
    this.keyboardService.clearShortcuts();
    
    // Clear any pending save (but don't save in Quick Review mode)
    if (this.saveProgressTimeout) {
      clearTimeout(this.saveProgressTimeout);
      if (!this.quickReviewMode()) {
        this.saveProgress(); // Save immediately on destroy
      }
    }
    
    const ex = this.exercise();
    if (ex && !this.isExerciseComplete() && !this.isReviewMode() && this.exerciseStartTime) {
      const timeSpent = Math.floor((new Date().getTime() - this.exerciseStartTime.getTime()) / 1000);
      this.analyticsService.trackExerciseAbandoned(ex.id, timeSpent, this.progressPercentage());
    }
  }

  onInputChange(): void {
    // Don't save progress in Quick Review mode
    if (this.quickReviewMode()) return;

    // Debounce save progress - only save after 500ms of no typing
    if (this.saveProgressTimeout) {
      clearTimeout(this.saveProgressTimeout);
    }
    
    this.saveProgressTimeout = setTimeout(() => {
      this.saveProgress();
      this.saveProgressTimeout = null;
    }, 500);
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

    // Extract corresponding English sentence
    const sentenceRegex = /[^.!?]+[.!?]+/g;
    const englishSentences = ex.englishText?.match(sentenceRegex) || [];
    const currentEnglishSentence = englishSentences[currentIdx]?.trim() || '';

    const tempExercise = {
      ...ex,
      sourceText: currentSentence.original,
      fullContext: ex.sourceText,
      translatedContext: translatedContext || undefined,
      englishText: currentEnglishSentence
    } as ExerciseContext;

    this.aiService.generateHint(
      currentSentence.original,
      this.userInput(),
      this.previousHints(),
      tempExercise
    ).subscribe({
      next: (hint) => {
        this.stateService.addHint(hint);
        this.isLoadingHint.set(false);
        
        // Track hint usage
        this.analyticsService.trackHintUsed(ex.id, 'ai_hint');
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
    // If in quick review mode, exit to review mode instead of going back
    if (this.quickReviewMode()) {
      this.exitQuickReview();
      return;
    }

    // Only save progress if exercise is not completed
    if (!this.isExerciseComplete()) {
      this.saveProgress();
    }
    this.location.back();
  }

  onNextSentence(): void {
    this.navigationService.moveToNextSentence(
      () => this.completeExercise(),
      () => {
        // Don't save progress in Quick Review mode
        if (!this.quickReviewMode()) {
          this.saveProgress();
        }
        this.focusInput();
      }
    );
  }

  onRetrySentence(): void {
    this.navigationService.retrySentence();
    // Don't save progress in Quick Review mode
    if (!this.quickReviewMode()) {
      this.saveProgress();
    }
    this.focusInput();
  }

  onSkipToNextSentence(): void {
    this.navigationService.skipToNextSentence(
      () => this.completeExercise(),
      () => {
        // Don't save progress in Quick Review mode
        if (!this.quickReviewMode()) {
          this.saveProgress();
        }
        this.focusInput();
      }
    );
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

  onPracticeDictation(): void {
    const ex = this.exercise();
    if (!ex) return;

    // Navigate to dictation with mode=user (use user's translation)
    this.router.navigate(['/exercises', ex.id, 'dictation'], {
      queryParams: { mode: 'user' }
    });
  }

  onPracticeDictationOriginal(): void {
    const ex = this.exercise();
    if (!ex) return;

    // Navigate to dictation with mode=original (use englishText)
    this.router.navigate(['/exercises', ex.id, 'dictation'], {
      queryParams: { mode: 'original' }
    });
  }

  onStartQuickReview(): void {
    const ex = this.exercise();
    if (!ex) return;

    const allSentences = this.sentences();
    const { difficultIndices, hasDifficult } = this.quickReviewService.startQuickReview(allSentences);

    if (!hasDifficult) {
      console.log('[ExerciseDetail] No difficult sentences to review');
      return;
    }

    this.isReviewMode.set(false);
    this.clearProgress();
    this.stateService.reset();
    this.submissionService.reset();
    this.stateService.initializeSentences(ex.sourceText);

    this.quickReviewService.markCorrectSentences(allSentences, difficultIndices);

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { mode: null, quickReview: 'true' },
      queryParamsHandling: 'merge',
      replaceUrl: true
    });

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

    // If in Quick Review mode, just exit to review mode without scoring
    if (this.quickReviewMode()) {
      this.exitQuickReview();
      return;
    }

    // Normal completion with scoring
    this.completionService.completeExercise(
      ex,
      this.isCustomExercise(),
      this.exercisePoints(),
      this.hintsShown(),
      this.exerciseStartTime,
      true
    );

    this.isReviewMode.set(true);
    this.completionService.navigateToReviewMode(this.route);
  }

  exitQuickReview(): void {
    const ex = this.exercise();
    if (!ex) return;

    this.quickReviewService.reset();
    this.isReviewMode.set(true);

    this.stateService.reset();
    this.submissionService.reset();
    this.stateService.initializeSentences(ex.sourceText);
    
    this.loadBestAttempt(ex.id);

    // Use replaceUrl to avoid adding to history stack
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { mode: 'review', quickReview: null },
      queryParamsHandling: 'merge',
      replaceUrl: true
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
