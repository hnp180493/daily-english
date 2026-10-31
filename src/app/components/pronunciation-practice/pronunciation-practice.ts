import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnDestroy,
  OnInit,
  computed,
  effect,
  inject,
  signal
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { Exercise } from '../../models/exercise.model';
import {
  PRONUNCIATION_DEFAULTS,
  PronunciationAttempt,
  PronunciationFeedback
} from '../../models/pronunciation.model';
import { ExerciseService } from '../../services/exercise.service';
import { AudioRecorderService } from '../../services/pronunciation/audio-recorder.service';
import { PronunciationPracticeService } from '../../services/pronunciation/pronunciation-practice.service';
import { SpeechRecognitionService } from '../../services/pronunciation/speech-recognition.service';
import { AzureSpeechPronunciationService } from '../../services/pronunciation/azure-speech-pronunciation.service';
import { TTSService } from '../../services/tts.service';
import { SeoService } from '../../services/seo.service';
import { TranslationService } from '../../services/translation.service';
import { ToastService } from '../../services/toast.service';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-pronunciation-practice',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './pronunciation-practice.html',
  styleUrl: './pronunciation-practice.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PronunciationPracticeComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private exerciseService = inject(ExerciseService);
  private practiceService = inject(PronunciationPracticeService);
  private seoService = inject(SeoService);
  readonly recorder = inject(AudioRecorderService);
  readonly speechRecognition = inject(SpeechRecognitionService);
  readonly azureSpeech = inject(AzureSpeechPronunciationService);
  readonly tts = inject(TTSService);
  protected translate = inject(TranslationService);
  private toast = inject(ToastService);
  private destroyRef = inject(DestroyRef);

  // Azure Speech (Tier 3) state
  showAzureConfig = signal(false);
  azureKeyInput = signal('');
  azureRegionInput = signal('');
  isEnrichingPhonemes = signal(false);

  exercise = signal<Exercise | null>(null);
  sentences = signal<string[]>([]);
  currentIndex = signal<number>(0);
  isLoading = signal<boolean>(true);
  errorMessage = signal<string | null>(null);

  audioBlob = signal<Blob | null>(null);
  audioUrl = signal<string | null>(null);
  durationMs = signal<number>(0);

  isAnalyzing = signal<boolean>(false);
  feedback = signal<PronunciationFeedback | null>(null);
  history = signal<PronunciationAttempt[]>([]);

  readonly currentSentence = computed(() => this.sentences()[this.currentIndex()] ?? '');
  readonly isLastSentence = computed(
    () => this.currentIndex() >= this.sentences().length - 1
  );
  readonly totalSentences = computed(() => this.sentences().length);
  readonly maxRecordingMs = PRONUNCIATION_DEFAULTS.MAX_RECORDING_MS;
  readonly minRecordingMs = PRONUNCIATION_DEFAULTS.MIN_RECORDING_MS;
  readonly providerSupportsAudio = signal<boolean>(true);
  readonly recorderSupported = signal<boolean>(true);
  readonly webSpeechSupported = signal<boolean>(false);
  /** When provider has no audio support, we fall back to browser SpeechRecognition. */
  readonly useWebSpeechFallback = computed(
    () => !this.providerSupportsAudio() && this.webSpeechSupported()
  );
  readonly lastTranscript = signal<string>('');

  private revokeAudioOnDestroy: string | null = null;

  constructor() {
    effect(() => {
      const url = this.audioUrl();
      if (url && url !== this.revokeAudioOnDestroy) {
        if (this.revokeAudioOnDestroy) {
          URL.revokeObjectURL(this.revokeAudioOnDestroy);
        }
        this.revokeAudioOnDestroy = url;
      }
    });

    // Chrome (continuous=false) ends recognition on its own after the first final
    // result — nobody is awaiting stop() then, so analyze/surface errors from here.
    this.speechRecognition.ended.pipe(takeUntilDestroyed()).subscribe((end) => {
      if (end.stopRequested) return; // toggleWebSpeech() handles the stop() result
      void this.handleWebSpeechResult(end.transcript, end.confidence, end.error);
    });
  }

  ngOnInit(): void {
    this.seoService.updateTags({
      title: 'Luyện phát âm (Beta) - Daily English',
      description: 'Luyện phát âm tiếng Anh với phản hồi AI'
    });

    this.recorderSupported.set(this.recorder.isSupported());
    this.webSpeechSupported.set(this.practiceService.supportsWebSpeechFallback());
    try {
      this.providerSupportsAudio.set(this.practiceService.supportsAudio());
    } catch {
      this.providerSupportsAudio.set(false);
    }

    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.errorMessage.set('Thiếu mã bài tập trong URL.');
      this.isLoading.set(false);
      return;
    }

    this.exerciseService.getExerciseByIdUnified(id).subscribe({
      next: (exercise) => {
        if (!exercise) {
          this.errorMessage.set('Không tìm thấy bài tập.');
          this.isLoading.set(false);
          return;
        }
        this.exercise.set(exercise);
        const sentences = this.practiceService.splitIntoSentences(exercise.englishText);
        this.sentences.set(sentences);
        this.isLoading.set(false);
      },
      error: () => {
        this.errorMessage.set('Lỗi khi tải bài tập.');
        this.isLoading.set(false);
      }
    });
  }

  ngOnDestroy(): void {
    // Always cancel: releases the mic and timers whatever state the recorder is in
    this.recorder.cancel();
    const srState = this.speechRecognition.state();
    if (srState === 'listening' || srState === 'requesting') {
      this.speechRecognition.cancel();
    }
    if (this.revokeAudioOnDestroy) {
      URL.revokeObjectURL(this.revokeAudioOnDestroy);
      this.revokeAudioOnDestroy = null;
    }
  }

  async toggleWebSpeech(): Promise<void> {
    if (this.isAnalyzing()) return;

    if (this.speechRecognition.state() === 'listening') {
      try {
        const result = await this.speechRecognition.stop();
        await this.handleWebSpeechResult(result.transcript, result.confidence, null);
      } catch (err) {
        this.errorMessage.set((err as Error).message || 'Lỗi nhận diện giọng nói.');
      }
      return;
    }

    this.lastTranscript.set('');
    this.feedback.set(null);
    this.errorMessage.set(null);
    this.speechRecognition.reset();
    try {
      await this.speechRecognition.start();
    } catch (err) {
      this.errorMessage.set(
        this.speechRecognition.errorMessage() || (err as Error).message || 'Không thể bắt đầu nhận diện.'
      );
    }
  }

  private async handleWebSpeechResult(
    transcript: string,
    confidence: number,
    error: string | null
  ): Promise<void> {
    this.lastTranscript.set(transcript);
    if (!transcript) {
      this.errorMessage.set(error || 'Không nghe được. Hãy thử lại to và rõ hơn.');
      return;
    }
    await this.submitTranscriptForAnalysis(transcript, confidence);
  }

  private async submitTranscriptForAnalysis(transcript: string, confidence: number): Promise<void> {
    const exercise = this.exercise();
    if (!exercise) return;
    this.isAnalyzing.set(true);
    // Capture the sentence now — the result must not land on a different one
    const sentenceIndex = this.currentIndex();
    const expectedText = this.currentSentence();
    const context = this.practiceService.buildContext(exercise, expectedText);
    this.practiceService.analyzeTranscript(transcript, context, confidence).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (result) => {
        if (this.currentIndex() === sentenceIndex) {
          this.feedback.set(result);
        }
        const attempt: PronunciationAttempt = {
          exerciseId: exercise.id,
          sentenceIndex,
          expectedText,
          feedback: result,
          durationMs: 0,
          timestamp: new Date(),
        };
        this.history.update((arr) => [...arr, attempt]);
        this.practiceService.saveAttempt(attempt);
        this.isAnalyzing.set(false);
      },
      error: (err) => {
        this.errorMessage.set(err?.message || 'Không phân tích được.');
        this.isAnalyzing.set(false);
      },
    });
  }

  async toggleRecording(): Promise<void> {
    if (this.isAnalyzing()) return;

    if (this.recorder.state() === 'recording') {
      try {
        const recording = await this.recorder.stop();
        if (recording.durationMs < this.minRecordingMs) {
          this.errorMessage.set('Đoạn ghi quá ngắn. Vui lòng nói lại.');
          this.resetRecording();
          return;
        }
        this.audioBlob.set(recording.blob);
        this.durationMs.set(recording.durationMs);
        const url = URL.createObjectURL(recording.blob);
        this.audioUrl.set(url);
        this.errorMessage.set(null);
      } catch (err) {
        this.errorMessage.set((err as Error).message || 'Lỗi khi dừng ghi âm.');
      }
      return;
    }

    this.resetRecording();
    try {
      await this.recorder.start();
      this.errorMessage.set(null);
    } catch (err) {
      this.errorMessage.set(
        this.recorder.errorMessage() || (err as Error).message || 'Không thể bắt đầu ghi âm.'
      );
    }
  }

  async submitForAnalysis(): Promise<void> {
    const blob = this.audioBlob();
    const exercise = this.exercise();
    if (!blob || !exercise) return;

    this.isAnalyzing.set(true);
    this.errorMessage.set(null);

    // Capture the sentence now — the result must not land on a different one
    const sentenceIndex = this.currentIndex();
    const expectedText = this.currentSentence();
    const durationMs = this.durationMs();
    const context = this.practiceService.buildContext(exercise, expectedText);

    this.practiceService.analyze(blob, context).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (result) => {
        if (this.currentIndex() === sentenceIndex) {
          this.feedback.set(result);
        }
        const attempt: PronunciationAttempt = {
          exerciseId: exercise.id,
          sentenceIndex,
          expectedText,
          feedback: result,
          durationMs,
          timestamp: new Date()
        };
        this.history.update(arr => [...arr, attempt]);
        this.practiceService.saveAttempt(attempt);
        this.isAnalyzing.set(false);
      },
      error: (err) => {
        this.errorMessage.set(err?.message || 'Phân tích phát âm thất bại.');
        this.isAnalyzing.set(false);
      }
    });
  }

  playExpectedSentence(): void {
    const text = this.currentSentence();
    if (text) {
      this.tts.speak(text);
    }
  }

  nextSentence(): void {
    if (this.isLastSentence() || this.isAnalyzing()) return;
    this.currentIndex.update(i => i + 1);
    this.resetRecording();
    this.lastTranscript.set('');
    this.speechRecognition.reset();
    this.feedback.set(null);
    this.errorMessage.set(null);
  }

  previousSentence(): void {
    if (this.currentIndex() === 0 || this.isAnalyzing()) return;
    this.currentIndex.update(i => i - 1);
    this.resetRecording();
    this.lastTranscript.set('');
    this.speechRecognition.reset();
    this.feedback.set(null);
    this.errorMessage.set(null);
  }

  retryRecording(): void {
    this.resetRecording();
    this.lastTranscript.set('');
    this.speechRecognition.reset();
    this.feedback.set(null);
    this.errorMessage.set(null);
  }

  goBackToExercise(): void {
    const exercise = this.exercise();
    if (exercise) {
      const slug = this.exerciseService.getExerciseSlug(exercise);
      this.router.navigate(['/exercise', slug]);
    } else {
      this.router.navigate(['/exercises']);
    }
  }

  private resetRecording(): void {
    const url = this.audioUrl();
    if (url) {
      URL.revokeObjectURL(url);
    }
    this.audioBlob.set(null);
    this.audioUrl.set(null);
    this.durationMs.set(0);
    this.recorder.reset();
  }

  formatSeconds(ms: number): string {
    const s = Math.floor(ms / 1000);
    const cs = Math.floor((ms % 1000) / 100);
    return `${s}.${cs}s`;
  }

  // ============================================
  // Azure Speech (Tier 3) — phoneme-level scoring
  // ============================================

  toggleAzureConfig(): void {
    this.showAzureConfig.update((v) => !v);
    if (this.showAzureConfig() && this.azureSpeech.credentials()) {
      const c = this.azureSpeech.credentials()!;
      this.azureKeyInput.set(c.apiKey);
      this.azureRegionInput.set(c.region);
    }
  }

  saveAzureConfig(): void {
    const key = this.azureKeyInput().trim();
    const region = this.azureRegionInput().trim();
    if (!key || !region) {
      this.toast.show('Both key and region are required.', 'error', 3000);
      return;
    }
    this.azureSpeech.setCredentials(key, region);
    this.showAzureConfig.set(false);
    this.toast.show('Azure Speech credentials saved.', 'success', 2500);
  }

  clearAzureConfig(): void {
    if (!confirm('Remove saved Azure Speech credentials?')) return;
    this.azureSpeech.clearCredentials();
    this.azureKeyInput.set('');
    this.azureRegionInput.set('');
    this.toast.show('Cleared.', 'info', 2000);
  }

  async enrichPhonemes(): Promise<void> {
    const blob = this.audioBlob();
    const exercise = this.exercise();
    const currentFeedback = this.feedback();
    if (!blob || !exercise || !currentFeedback) return;
    if (!this.azureSpeech.isConfigured()) {
      this.showAzureConfig.set(true);
      this.toast.show('Configure Azure Speech first, then try again.', 'info', 3000);
      return;
    }
    this.isEnrichingPhonemes.set(true);
    const context = this.practiceService.buildContext(exercise, this.currentSentence());
    this.azureSpeech.enrichWithPhonemes(blob, context, currentFeedback).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (enriched) => {
        // Only replace what's on screen if the user is still looking at that feedback
        if (this.feedback() === currentFeedback) {
          this.feedback.set(enriched);
        }
        // Update the attempt this feedback came from (not blindly the last one)
        const attemptIdx = this.history().findIndex((a) => a.feedback === currentFeedback);
        if (attemptIdx >= 0) {
          const updated = { ...this.history()[attemptIdx], feedback: enriched };
          this.history.update((arr) => arr.map((a, i) => (i === attemptIdx ? updated : a)));
          this.practiceService.saveAttempt(updated);
        }
        this.isEnrichingPhonemes.set(false);
        this.toast.show('Phoneme scores added from Azure Speech.', 'success', 2500);
      },
      error: (err) => {
        this.isEnrichingPhonemes.set(false);
        this.toast.show(err?.message || 'Azure Speech request failed.', 'error', 4000);
      },
    });
  }

  phonemeScoreColor(score: number): string {
    if (score >= 80) return 'text-green-400';
    if (score >= 60) return 'text-amber-400';
    return 'text-red-400';
  }
}
