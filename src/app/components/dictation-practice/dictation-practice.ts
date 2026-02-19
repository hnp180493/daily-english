import { CommonModule } from '@angular/common';
import { Component, ChangeDetectionStrategy, OnInit, OnDestroy, inject, signal, computed, HostListener, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { DictationSentence, DictationPracticeAttempt } from '../../models/dictation.model';
import { Exercise } from '../../models/exercise.model';
import { DictationPracticeService } from '../../services/dictation-practice.service';
import { TTSService } from '../../services/tts.service';
import { ProgressService } from '../../services/progress.service';
import { ExerciseService } from '../../services/exercise.service';
import { DictationSettingsService } from '../../services/dictation-settings.service';
import { DictationFeedbackComponent } from '../dictation-feedback/dictation-feedback';
import { DictationSettingsComponent } from '../dictation-settings/dictation-settings';
import { SeoService } from '../../services/seo.service';
import { DictationHeader } from './dictation-header/dictation-header';
import { DictationAudioControls } from './dictation-audio-controls/dictation-audio-controls';
import { DictationInput } from './dictation-input/dictation-input';
import { DictationActions } from './dictation-actions/dictation-actions';
import { DictationCompletion } from './dictation-completion/dictation-completion';
import { DictationOverview } from './dictation-overview/dictation-overview';
import { DictationShortcuts } from './dictation-shortcuts/dictation-shortcuts';

@Component({
  selector: 'app-dictation-practice',
  imports: [
    CommonModule,
    DictationFeedbackComponent,
    DictationSettingsComponent,
    DictationHeader,
    DictationAudioControls,
    DictationInput,
    DictationActions,
    DictationCompletion,
    DictationOverview,
    DictationShortcuts
  ],
  templateUrl: './dictation-practice.html',
  styleUrl: './dictation-practice.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DictationPracticeComponent implements OnInit, OnDestroy {
  // Constants
  readonly PASSING_SCORE = 100;
  readonly DICTATION_COMPLETION_POINTS = 10;
  
  // ViewChild references
  @ViewChild(DictationInput) dictationInputComponent?: DictationInput;
  
  // Injected services
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private dictationService = inject(DictationPracticeService);
  private ttsService = inject(TTSService);
  private progressService = inject(ProgressService);
  private exerciseService = inject(ExerciseService);
  private settingsService = inject(DictationSettingsService);
  private seoService = inject(SeoService);
  
  // Signals for reactive state
  exercise = signal<Exercise | null>(null);
  translatedText = signal<string>('');
  sentences = signal<DictationSentence[]>([]);
  currentSentenceIndex = signal<number>(0);
  userInput = signal<string>('');
  isPlaying = signal<boolean>(false);
  isPaused = signal<boolean>(false);
  playbackSpeed = signal<number>(1.0);
  showFeedback = signal<boolean>(false);
  currentAccuracy = signal<number>(0);
  isLoading = signal<boolean>(true);
  error = signal<string | null>(null);
  sessionStartTime = signal<number>(Date.now());
  isComplete = signal<boolean>(false);
  showSettings = signal<boolean>(false);
  isSubmitting = signal<boolean>(false);
  justSubmitted = signal<boolean>(false);
  showOverview = signal<boolean>(false);
  attemptCount = signal<number>(0);
  
  settings = this.settingsService.settings;
  
  // Performance optimization: Cache accuracy calculations
  private accuracyCache = new Map<string, any>();
  private debounceTimer: any = null;
  
  // Computed values
  currentSentence = computed(() => {
    const index = this.currentSentenceIndex();
    const sentenceList = this.sentences();
    return sentenceList[index] || null;
  });
  
  progressPercentage = computed(() => {
    const sentenceList = this.sentences();
    if (sentenceList.length === 0) return 0;
    const completed = sentenceList.filter(s => s.isCompleted).length;
    return (completed / sentenceList.length) * 100;
  });
  
  allSentencesComplete = computed(() => {
    const sentenceList = this.sentences();
    return sentenceList.length > 0 && sentenceList.every(s => s.isCompleted);
  });
  
  canGoNext = computed(() => {
    const currentSent = this.currentSentence();
    const hasNext = this.currentSentenceIndex() < this.sentences().length - 1;
    
    // Only allow next if current sentence is completed with passing score
    if (!currentSent) return hasNext;
    return hasNext && currentSent.isCompleted && currentSent.accuracyScore >= this.PASSING_SCORE;
  });
  
  canGoPrevious = computed(() => {
    return this.currentSentenceIndex() > 0;
  });
  
  overallAccuracy = computed(() => {
    const sentenceList = this.sentences();
    if (sentenceList.length === 0) return 0;
    const total = sentenceList.reduce((sum, s) => sum + s.accuracyScore, 0);
    return total / sentenceList.length;
  });
  
  completedSentencesCount = computed(() => {
    return this.sentences().filter(s => s.isCompleted).length;
  });

  ngOnInit(): void {
    // Reset playback speed to 1.0 when entering dictation practice
    this.playbackSpeed.set(1.0);
    (this.ttsService as any).rate = 1.0;
    
    const exerciseId = this.route.snapshot.paramMap.get('id');
    const mode = this.route.snapshot.queryParamMap.get('mode'); // 'original' or 'user'
    
    if (!exerciseId) {
      this.error.set('Invalid exercise ID');
      this.isLoading.set(false);
      return;
    }
    
    // Load exercise
    this.exerciseService.getExerciseById(exerciseId).subscribe({
      next: (ex) => {
        if (!ex) {
          this.error.set('Exercise not found');
          this.isLoading.set(false);
          return;
        }
        
        this.exercise.set(ex);
        this.updateDictationSeo(ex);
        this.loadAttemptCount(exerciseId);
        this.loadTranslatedText(exerciseId, mode);
      },
      error: (err) => {
        console.error('Error loading exercise:', err);
        this.error.set('Failed to load exercise');
        this.isLoading.set(false);
      }
    });
  }
  
  private updateDictationSeo(exercise: Exercise): void {
    // Update SEO for dictation practice page
    const title = `Luyện Nghe Chính Tả: ${exercise.title}`;
    const description = `Luyện nghe và chính tả tiếng Anh với bài tập ${exercise.title}. Cải thiện kỹ năng nghe hiểu và viết chính xác qua phương pháp dictation practice.`;
    
    this.seoService.updateTags({
      title,
      description,
      keywords: [
        'luyện nghe tiếng anh',
        'dictation practice',
        'chính tả tiếng anh',
        'luyện nghe chính tả',
        'bài tập nghe',
        exercise.category,
        exercise.level
      ],
      type: 'article',
      image: 'https://dailyenglish.qzz.io/og-image-dictation.png'
    });
    
    // Add structured data for dictation practice
    const dictationSchema = {
      '@context': 'https://schema.org',
      '@type': 'LearningResource',
      name: title,
      description,
      educationalLevel: exercise.level,
      learningResourceType: 'Dictation Exercise',
      inLanguage: 'en',
      teaches: 'English Listening and Writing Skills',
      educationalUse: 'Practice',
      interactivityType: 'active',
      typicalAgeRange: '13-99',
      isAccessibleForFree: true,
      provider: {
        '@type': 'Organization',
        name: 'Daily English',
        url: 'https://dailyenglish.qzz.io'
      }
    };
    
    this.seoService.setStructuredData(dictationSchema);
  }
  
  ngOnDestroy(): void {
    // Clear debounce timer
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    
    // Clear accuracy cache
    this.accuracyCache.clear();
  }
  
  private loadAttemptCount(exerciseId: string): void {
    this.progressService.getUserProgress().subscribe(progress => {
      const dictationAttempt = progress.dictationHistory[exerciseId];
      if (dictationAttempt) {
        this.attemptCount.set(dictationAttempt.attemptNumber);
      }
    });
  }
  
  private loadTranslatedText(exerciseId: string, mode: string | null): void {
    const ex = this.exercise();
    if (!ex) {
      this.error.set('Exercise not found');
      this.isLoading.set(false);
      return;
    }
    
    // Determine which text to use based on mode
    let textToUse: string | null = null;
    
    if (mode === 'original') {
      // Use englishText directly (original text)
      textToUse = ex.englishText || null;
      
      if (textToUse) {
        this.translatedText.set(textToUse);
        
        // Check for in-progress session
        const savedSession = this.dictationService.loadInProgressSession(exerciseId);
        
        // Verify saved session matches current text
        if (savedSession) {
          const savedText = savedSession.sentences.map(s => s.original).join('. ') + '.';
          const currentText = textToUse.trim();
          
          // If text doesn't match, clear old session and start fresh
          if (savedText.trim() !== currentText) {
            console.log('[DictationPractice] Text mismatch, clearing old session');
            this.dictationService.clearInProgressSession(exerciseId);
            const sentenceList = this.dictationService.initializeDictationSession(exerciseId, textToUse);
            this.sentences.set(sentenceList);
          } else {
            // Restore saved session
            this.sentences.set(savedSession.sentences);
            this.currentSentenceIndex.set(savedSession.currentIndex);
          }
        } else {
          // Start new session
          const sentenceList = this.dictationService.initializeDictationSession(exerciseId, textToUse);
          this.sentences.set(sentenceList);
        }
        
        this.isLoading.set(false);
      } else {
        this.error.set('No English text available for this exercise.');
        this.isLoading.set(false);
      }
    } else {
      // Default mode: use user's translation (from guest_progress or cloud)
      this.dictationService.getTranslatedText(exerciseId, ex.englishText).subscribe({
        next: (text) => {
          if (!text) {
            this.error.set('No translation available. Please complete the translation exercise first.');
            this.isLoading.set(false);
            return;
          }
          
          this.translatedText.set(text);
          
          // Check for in-progress session
          const savedSession = this.dictationService.loadInProgressSession(exerciseId);
          
          // Verify saved session matches current text
          if (savedSession) {
            const savedText = savedSession.sentences.map(s => s.original).join('. ') + '.';
            const currentText = text.trim();
            
            // If text doesn't match, clear old session and start fresh
            if (savedText.trim() !== currentText) {
              console.log('[DictationPractice] Text mismatch, clearing old session');
              this.dictationService.clearInProgressSession(exerciseId);
              const sentenceList = this.dictationService.initializeDictationSession(exerciseId, text);
              this.sentences.set(sentenceList);
            } else {
              // Restore saved session
              this.sentences.set(savedSession.sentences);
              this.currentSentenceIndex.set(savedSession.currentIndex);
            }
          } else {
            // Start new session
            const sentenceList = this.dictationService.initializeDictationSession(exerciseId, text);
            this.sentences.set(sentenceList);
          }
          
          this.isLoading.set(false);
        },
        error: (err) => {
          console.error('Error loading translated text:', err);
          this.error.set('Failed to load translation');
          this.isLoading.set(false);
        }
      });
    }
  }
  
  private saveProgress(): void {
    const ex = this.exercise();
    if (!ex) return;
    
    this.dictationService.saveInProgressSession(
      ex.id,
      this.sentences(),
      this.currentSentenceIndex()
    );
  }
  
  private debouncedSaveProgress(): void {
    // Clear existing timer
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    
    // Set new timer (300ms delay)
    this.debounceTimer = setTimeout(() => {
      this.saveProgress();
    }, 300);
  }
  
  onReplayAudio(): void {
    // This will be handled by audio controls component
    // Just trigger play through the component
  }
  
  nextSentence(): void {
    if (!this.canGoNext()) return;
    
    this.currentSentenceIndex.update(i => i + 1);
    this.userInput.set('');
    this.showFeedback.set(false);
    this.currentAccuracy.set(0);
    this.saveProgress();
    
    // Focus textarea after a short delay
    setTimeout(() => {
      this.dictationInputComponent?.focus();
    }, 100);
  }
  
  previousSentence(): void {
    if (!this.canGoPrevious()) return;
    
    this.currentSentenceIndex.update(i => i - 1);
    
    // Load previous sentence state
    const prevSentence = this.currentSentence();
    if (prevSentence && prevSentence.isCompleted) {
      this.userInput.set(prevSentence.userInput);
      this.showFeedback.set(true);
      this.currentAccuracy.set(prevSentence.accuracyScore);
    } else {
      this.userInput.set('');
      this.showFeedback.set(false);
      this.currentAccuracy.set(0);
    }
    
    this.saveProgress();
  }
  
  goToSentence(index: number): void {
    if (index < 0 || index >= this.sentences().length) return;
    
    this.currentSentenceIndex.set(index);
    
    // Load sentence state
    const targetSentence = this.currentSentence();
    if (targetSentence && targetSentence.isCompleted) {
      this.userInput.set(targetSentence.userInput);
      this.showFeedback.set(true);
      this.currentAccuracy.set(targetSentence.accuracyScore);
    } else {
      this.userInput.set('');
      this.showFeedback.set(false);
      this.currentAccuracy.set(0);
    }
    
    this.saveProgress();
  }
  
  submitAnswer(): void {
    const sentence = this.currentSentence();
    if (!sentence) return;
    
    const input = this.userInput().trim();
    if (!input) return;
    
    // Trigger submit animation
    this.isSubmitting.set(true);
    setTimeout(() => this.isSubmitting.set(false), 400);
    
    // Mark as just submitted to prevent immediate Enter key navigation
    this.justSubmitted.set(true);
    setTimeout(() => this.justSubmitted.set(false), 500);
    
    // Performance optimization: Check cache first
    const cacheKey = `${sentence.original}:${input}`;
    let feedback = this.accuracyCache.get(cacheKey);
    
    if (!feedback) {
      // Calculate accuracy and cache result
      feedback = this.dictationService.calculateAccuracy(sentence.original, input);
      this.accuracyCache.set(cacheKey, feedback);
    }
    
    const accuracy = (feedback.characterAccuracy + feedback.wordAccuracy) / 2;
    
    // Update sentence
    const updatedSentences = [...this.sentences()];
    const currentIndex = this.currentSentenceIndex();
    updatedSentences[currentIndex] = {
      ...sentence,
      userInput: input,
      accuracyScore: accuracy,
      attempts: sentence.attempts + 1,
      feedback,
      isCompleted: accuracy >= this.PASSING_SCORE
    };
    
    this.sentences.set(updatedSentences);
    this.currentAccuracy.set(accuracy);
    this.showFeedback.set(true);
    
    // Move cursor to first missing word position if accuracy is not perfect
    if (accuracy < this.PASSING_SCORE) {
      this.dictationInputComponent?.moveCursorToMissingWord(sentence.original, input);
    }
    
    // Debounced save to avoid excessive writes
    this.debouncedSaveProgress();
    
    // Auto advance to next sentence if perfect score and setting is enabled
    const settings = this.settings();
    if (settings.autoNextOnPerfect && accuracy >= this.PASSING_SCORE) {
      setTimeout(() => {
        if (this.canGoNext()) {
          this.nextSentence();
        } else {
          this.completeSession();
        }
      }, 600); // Brief delay to show feedback
    }
  }
  
  retryAnswer(): void {
    // Clear feedback and input to start fresh
    this.showFeedback.set(false);
    this.currentAccuracy.set(0);
    this.userInput.set('');
  }
  
  skipSentence(): void {
    const sentence = this.currentSentence();
    if (!sentence) return;
    
    // Mark as completed with 0 score
    const updatedSentences = [...this.sentences()];
    const currentIndex = this.currentSentenceIndex();
    updatedSentences[currentIndex] = {
      ...sentence,
      isCompleted: true,
      accuracyScore: 0,
      attempts: sentence.attempts + 1
    };
    
    this.sentences.set(updatedSentences);
    
    if (this.canGoNext()) {
      this.nextSentence();
    } else {
      this.completeSession();
    }
  }
  
  completeSession(): void {
    const ex = this.exercise();
    if (!ex) return;
    
    const sentenceList = this.sentences();
    const timeSpent = Math.floor((Date.now() - this.sessionStartTime()) / 1000);
    
    // Calculate overall accuracy
    const totalAccuracy = sentenceList.reduce((sum, s) => sum + s.accuracyScore, 0);
    const overallAccuracy = sentenceList.length > 0 ? totalAccuracy / sentenceList.length : 0;
    
    // Get current attempt count and increment
    const currentAttemptCount = this.attemptCount();
    const newAttemptNumber = currentAttemptCount + 1;
    
    // Create attempt object
    const attempt: DictationPracticeAttempt = {
      exerciseId: ex.id,
      translatedText: this.translatedText(),
      attemptNumber: newAttemptNumber,
      sentenceAttempts: sentenceList,
      overallAccuracy,
      timeSpent,
      timestamp: new Date(),
      playbackSpeed: this.playbackSpeed()
    };
    
    // Save attempt
    this.dictationService.saveDictationAttempt(attempt).subscribe({
      next: () => {
        console.log('Dictation attempt saved');
        this.progressService.recordDictationAttempt(attempt);
        
        // Update local attempt count
        this.attemptCount.set(newAttemptNumber);
        
        // Clear in-progress session after successful completion
        this.dictationService.clearInProgressSession(ex.id);
      },
      error: (err) => {
        console.error('Error saving dictation attempt:', err);
      }
    });
    
    this.isComplete.set(true);
  }
  
  retry(): void {
    // Reset all sentences
    const resetSentences = this.sentences().map(s => ({
      ...s,
      userInput: '',
      isCompleted: false,
      accuracyScore: 0,
      attempts: 0,
      feedback: null
    }));
    
    this.sentences.set(resetSentences);
    this.currentSentenceIndex.set(0);
    this.userInput.set('');
    this.showFeedback.set(false);
    this.currentAccuracy.set(0);
    this.isComplete.set(false);
    this.sessionStartTime.set(Date.now());
  }
  
  goBack(): void {
    // Use browser back to return to previous page
    window.history.back();
  }
  
  openSettings(): void {
    this.showSettings.set(true);
  }
  
  closeSettings(): void {
    this.showSettings.set(false);
  }
  
  @HostListener('document:keydown', ['$event'])
  handleKeyboardShortcut(event: KeyboardEvent): void {
    const settings = this.settings();
    const key = this.getKeyString(event);
    
    // Handle Enter key for navigation when passed (but not immediately after submit)
    if (event.key === 'Enter' && this.showFeedback() && this.currentAccuracy() >= this.PASSING_SCORE && !this.justSubmitted()) {
      event.preventDefault();
      if (this.canGoNext()) {
        this.nextSentence();
      } else {
        this.completeSession();
      }
      return;
    }
    
    // When typing in textarea, only allow shortcuts with modifier keys (Ctrl, Alt, etc.)
    if (event.target instanceof HTMLTextAreaElement) {
      // Block single-key shortcuts (like backtick) when typing
      if (!event.ctrlKey && !event.altKey && !event.metaKey) {
        return;
      }
    }
    
    // Replay key - handled by audio controls component
    if (key === settings.replayKey) {
      event.preventDefault();
      // Will be handled by audio controls component
    }
    
    // Play/Pause key - handled by audio controls component
    if (key === settings.playPauseKey) {
      event.preventDefault();
      // Will be handled by audio controls component
    }
  }
  
  private getKeyString(event: KeyboardEvent): string {
    const parts: string[] = [];
    
    if (event.ctrlKey) parts.push('ctrl');
    if (event.altKey) parts.push('alt');
    if (event.shiftKey) parts.push('shift');
    
    const key = event.key.toLowerCase();
    
    if (key === '`') {
      parts.push('backtick');
    } else if (key === ' ') {
      parts.push('space');
    } else if (key.length === 1) {
      parts.push(key);
    } else {
      parts.push(key);
    }
    
    return parts.join('+');
  }
}
