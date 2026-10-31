import { Component, ChangeDetectionStrategy, OnInit, OnDestroy, viewChild, inject, signal, computed, effect, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
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
import { ExerciseSessionLockService } from '../../services/exercise-session-lock.service';
import { FeatureFlagService } from '../../services/feature-flag.service';
import { TTSSettings } from '../tts-settings/tts-settings';
import { PenaltyScore } from '../penalty-score/penalty-score';
import { ExerciseContext } from '../../models/ai.model';
import { MarkdownPipe } from '../../pipes/markdown.pipe';
import { MemoryBoostComponent } from '../memory-boost/memory-boost';
import { QUIZ_CONSTANTS } from '../../models/memory-retention.model';
import { offlineHint, referenceSentence, splitEnglishSentences } from '../../services/offline-grader';
import { TranslationService } from '../../services/translation.service';
import { AuthService } from '../../services/auth.service';

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
    MemoryBoostComponent,
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
  private sessionLockService = inject(ExerciseSessionLockService);
  private featureFlagService = inject(FeatureFlagService);
  private authService = inject(AuthService);
  private destroyRef = inject(DestroyRef);
  private destroyed = false;
  protected translate = inject(TranslationService);

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
  
  // Memory Boost signals
  showMemoryBoost = signal(false);
  memoryBoostBonusAwarded = signal(false);
  // Delegate to state service
  sentences = this.stateService.sentences;
  currentSentenceIndex = this.stateService.currentSentenceIndex;
  currentSentence = this.stateService.currentSentence;
  completedSentences = this.stateService.completedSentences;

  // ---- Rounds: a 10–14 sentence exercise is played in rounds of 5 with a checkpoint between ----
  readonly ROUND_SIZE = 5;
  /** Number of sentences done when the checkpoint is showing, else null. */
  roundCheckpoint = signal<number | null>(null);
  roundLabel = computed(() => {
    const total = this.sentences().length;
    if (total <= this.ROUND_SIZE) return '';
    const rounds = Math.ceil(total / this.ROUND_SIZE);
    const current = Math.min(rounds, Math.floor(this.currentSentenceIndex() / this.ROUND_SIZE) + 1);
    return this.translate.t('exercise.round_label').replace('{n}', String(current)).replace('{total}', String(rounds));
  });
  private lastIndexSeen: number | null = null;
  private roundWatcher = effect(() => {
    const idx = this.currentSentenceIndex();
    const total = this.sentences().length;
    const prev = this.lastIndexSeen;
    this.lastIndexSeen = idx;
    // Only on a forward step during this visit (not when resuming saved progress).
    if (prev === null || idx !== prev + 1) return;
    if (this.isReviewMode() || this.quickReviewMode()) return;
    if (idx % this.ROUND_SIZE === 0 && idx < total) this.roundCheckpoint.set(idx);
  });

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
  pointsBreakdown = computed(() => this.metricsService.getPointsBreakdown(this.exercise(), this.exerciseStatus()));
  penaltyMetrics = computed(() => this.metricsService.getPenaltyMetrics(this.exercise(), this.isExerciseComplete(), this.isReviewMode()));
  currentPenaltyMetrics = computed(() => this.metricsService.getCurrentPenaltyMetrics(this.isReviewMode()));
  isFavorite = computed(() => {
    const ex = this.exercise();
    return ex ? this.metricsService.isFavorite(ex.id) : false;
  });

  isPlayingTTS = computed(() => this.ttsService.isPlaying());
  isPausedTTS = computed(() => this.ttsService.isPaused());
  currentTTSSentenceIndex = computed(() => this.ttsService.currentSentenceIndex());

  // Memory Boost — public (BETA label stays). Show when score >= 75% in review mode.
  canShowMemoryBoost = computed(() => {
    const metrics = this.penaltyMetrics();
    const enabled = this.featureFlagService.isMemoryBoostEnabled();
    return enabled &&
           this.isExerciseComplete() &&
           this.isReviewMode() &&
           metrics &&
           metrics.finalScore >= QUIZ_CONSTANTS.MIN_SCORE_FOR_QUIZ;
  });

  // Get user's full translation for Memory Boost
  userFullTranslation = computed(() => {
    return this.sentences()
      .filter(s => s.isCompleted && s.translation)
      .map(s => s.translation)
      .join(' ');
  });

  // Settings
  settings = this.settingsService.getSettingsSignal();

  // Session lock (anti-cheat)
  isSessionBlocked = this.sessionLockService.isBlocked;
  sessionBlockedMessage = this.sessionLockService.blockedMessage;

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

  async ngOnInit(): Promise<void> {
    // Scroll to top when entering exercise detail
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // State services are app-wide singletons: drop the previous exercise's hints, input and modes.
    this.stateService.reset();
    this.submissionService.reset();
    this.quickReviewService.reset();

    // Saved progress is keyed by user id; on a hard reload auth may not be ready yet (→ guest key).
    await this.authService.waitForAuth().catch(() => undefined);
    if (this.destroyed) return;
    this.loadExercise();
  }

  private loadExercise(): void {
    console.log('[ExerciseDetail] loadExercise called');
    this.loaderService.loadFromRoute(this.route, (result) => {
      console.log('[ExerciseDetail] Exercise loaded from route:', result);
      this.exercise.set(result.exercise);
      this.isCustomExercise.set(result.isCustom);
      
      if (result.mode === 'review') {
        this.isReviewMode.set(true);
      }

      this.exerciseStartTime = new Date();
      
      // Acquire session lock to prevent duplicate tab cheating (only for non-review mode)
      if (result.mode !== 'review') {
        this.sessionLockService.acquireLock(result.exercise.id);
      }
      
      console.log('[ExerciseDetail] Calling initializeExercise');
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
      // Resume on the saved sentence: it may be passed but not yet "Next"-ed (even the last one,
      // so Next completes the exercise) or failed with retry/skip pending. Sentences skipped after
      // 3 failures stay completed and are not revisited.
      const saved = state.currentIndex;
      const resumeAt = Number.isInteger(saved) && saved >= 0 && saved < state.sentences.length
        ? saved
        : state.sentences.findIndex(s => !s.isCompleted);

      if (resumeAt !== -1) {
        state.currentIndex = resumeAt;
        this.stateService.setState(state);
        return true;
      } else {
        // A finished state (already completed and recorded) - clear it so it can't be re-scored
        console.log('[ExerciseDetail] Saved progress is already finished, clearing it');
        this.persistenceService.clearProgress(exerciseId);
        return false;
      }
    }
    return false;
  }

  private saveProgress(): void {
    const ex = this.exercise();
    // A blocked duplicate tab must never overwrite the active tab's progress.
    if (!ex || this.isSessionBlocked()) return;
    this.persistenceService.saveProgress(ex.id, this.stateService.getState());
    // Notify other tabs about progress sync (anti-cheat)
    this.sessionLockService.notifyProgressSync(ex.id);
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



  /** Reference English sentence for the current source sentence (null if the exercise isn't aligned). */
  private currentReference(): string | null {
    const ex = this.exercise();
    if (!ex) return null;
    return referenceSentence(ex.englishText, this.currentSentenceIndex(), this.sentences().length);
  }

  onSubmit(): void {
    const ex = this.exercise();
    if (!ex || !this.userInput().trim() || this.isSubmitting()) return;

    // No AI provider: grade against the exercise's own reference sentence instead of blocking.
    let submission$;
    if (this.configService.hasValidConfig()) {
      submission$ = this.submissionService.submitTranslation(ex, ex.id);
    } else {
      const reference = this.currentReference();
      if (!reference) {
        this.showApiKeyPrompt.set(true);
        return;
      }
      submission$ = this.submissionService.submitOffline(ex.id, reference);
    }

    // Stop grading side effects (state updates, auto-advance, navigation) once the page is left.
    submission$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (result) => {
        // Track submission (once, on the final result)
        if (result.complete) {
          this.analyticsService.trackExerciseSubmit(ex.id, result.score >= 75);
        }
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
    // Enter that confirms an IME composition (Vietnamese input) is not a submit
    if (event.isComposing) return;

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
    if (this.isSessionBlocked()) return;
    this.keyboardService.handleKeyDown(event);
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    this.keyboardService.clearShortcuts();

    // Clear any pending save (but don't save in Quick Review mode).
    // Runs before releasing the lock: saveProgress skips saving while this tab is blocked.
    if (this.saveProgressTimeout) {
      clearTimeout(this.saveProgressTimeout);
      if (!this.quickReviewMode()) {
        this.saveProgress(); // Save immediately on destroy
      }
    }

    // Release session lock
    this.sessionLockService.releaseCurrentLock();

    const ex = this.exercise();
    if (ex && !this.isExerciseComplete() && !this.isReviewMode() && this.exerciseStartTime) {
      const timeSpent = Math.floor((new Date().getTime() - this.exerciseStartTime.getTime()) / 1000);
      this.analyticsService.trackExerciseAbandoned(ex.id, timeSpent, this.progressPercentage());
    }

    this.quickReviewService.reset();
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
      // No AI: progressive hints from the reference sentence (first letters → half → full).
      const reference = this.currentReference();
      const ex = this.exercise();
      if (!reference || !ex) {
        this.showApiKeyPrompt.set(true);
        return;
      }
      if (!this.hasMoreHints()) return;
      this.stateService.addHint(offlineHint(reference, this.hintsShown() + 1));
      this.analyticsService.trackHintUsed(ex.id, 'reference_hint');
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

    // Extract corresponding English sentence (abbreviation-aware, e.g. "Ms. Mai")
    const currentEnglishSentence = splitEnglishSentences(ex.englishText ?? '')[currentIdx] ?? '';

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
    ).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (hint) => {
        this.isLoadingHint.set(false);
        // The learner moved on (e.g. auto-advance) while the hint loaded: it belongs to another sentence.
        if (this.currentSentenceIndex() !== currentIdx) return;
        this.stateService.addHint(hint);
        
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

  continueRound(): void {
    this.roundCheckpoint.set(null);
    this.focusInput();
  }

  /** Stop after a round; progress is saved so the learner resumes at the next sentence. */
  pauseRound(): void {
    this.roundCheckpoint.set(null);
    this.onQuit();
  }

  onQuit(): void {
    // Blocked duplicate tab: just leave; saving here would overwrite the active tab's progress.
    if (this.isSessionBlocked()) {
      this.router.navigate(['/exercises']);
      return;
    }

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

  /**
   * Offline grading only compares with one reference sentence, so a correct
   * paraphrase can score low. Let the learner accept their own answer after
   * seeing the model sentence (like self-grading in Anki) and move on.
   */
  onAcceptOwnAnswer(): void {
    const ex = this.exercise();
    const idx = this.currentSentenceIndex();
    const answer = this.userInputAfterSubmit();
    const current = this.sentences()[idx];
    if (!ex || !answer || !current) return;
    const failedAttemptCounted = current.isCompleted && (current.accuracyScore ?? 0) < 90;
    this.stateService.markSentenceCompleted(idx, answer, 90, this.currentReference() ?? undefined);
    // The answer is accepted as correct, so the failed offline attempt must not keep its penalty.
    if (failedAttemptCounted) {
      this.stateService.undoIncorrectAttempt(idx);
    }
    this.submissionService.feedback.set(null);
    this.onNextSentence();
  }

  /** Offline-graded sentence that didn't pass — offer "my answer is also correct". */
  canAcceptOwnAnswer = computed(() => {
    if (!this.submissionService.gradedOffline()) return false;
    const current = this.sentences()[this.currentSentenceIndex()];
    return !!current?.isCompleted && (current.accuracyScore ?? 0) < 90;
  });

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
    this.exerciseStartTime = new Date();
    this.sessionLockService.acquireLock(ex.id);

    // Drop mode=review so a reload resumes this attempt instead of showing the review
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { mode: null },
      queryParamsHandling: 'merge',
      replaceUrl: true
    });

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

  onPracticePronunciation(): void {
    const ex = this.exercise();
    if (!ex) return;
    this.router.navigate(['/exercises', ex.id, 'pronunciation']);
  }

  get isPronunciationEnabled(): boolean {
    return this.featureFlagService.isPronunciationPracticeEnabled();
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
      this.stateService.totalHintsUsed(),
      this.exerciseStartTime,
      true
    );

    this.sessionLockService.releaseCurrentLock();
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

  /**
   * Handle bonus points awarded from Memory Boost quiz.
   * Requirements: 4.4 - Award bonus points for quiz score >= 80%
   */
  onMemoryBoostBonusAwarded(points: number): void {
    if (!this.memoryBoostBonusAwarded()) {
      this.memoryBoostBonusAwarded.set(true);
      // Add bonus points to user's total
      this.progressService.addBonusPoints(points);
      console.log(`[ExerciseDetail] Memory Boost bonus awarded: ${points} points`);
    }
  }

  /**
   * Toggle Memory Boost section visibility.
   */
  toggleMemoryBoost(): void {
    this.showMemoryBoost.update(v => !v);
  }
}
