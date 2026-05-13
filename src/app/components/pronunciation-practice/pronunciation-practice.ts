import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  OnInit,
  computed,
  effect,
  inject,
  signal
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Exercise } from '../../models/exercise.model';
import {
  PRONUNCIATION_DEFAULTS,
  PronunciationAttempt,
  PronunciationFeedback
} from '../../models/pronunciation.model';
import { ExerciseService } from '../../services/exercise.service';
import { AudioRecorderService } from '../../services/pronunciation/audio-recorder.service';
import { PronunciationPracticeService } from '../../services/pronunciation/pronunciation-practice.service';
import { TTSService } from '../../services/tts.service';
import { SeoService } from '../../services/seo.service';

@Component({
  selector: 'app-pronunciation-practice',
  standalone: true,
  imports: [CommonModule, RouterLink],
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
  readonly tts = inject(TTSService);

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
  }

  ngOnInit(): void {
    this.seoService.updateTags({
      title: 'Luyện phát âm (Beta) - Daily English',
      description: 'Luyện phát âm tiếng Anh với phản hồi AI'
    });

    this.recorderSupported.set(this.recorder.isSupported());
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
    if (this.recorder.state() === 'recording') {
      this.recorder.cancel();
    }
    if (this.revokeAudioOnDestroy) {
      URL.revokeObjectURL(this.revokeAudioOnDestroy);
      this.revokeAudioOnDestroy = null;
    }
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

    const context = this.practiceService.buildContext(exercise, this.currentSentence());

    this.practiceService.analyze(blob, context).subscribe({
      next: (result) => {
        this.feedback.set(result);
        const attempt: PronunciationAttempt = {
          exerciseId: exercise.id,
          sentenceIndex: this.currentIndex(),
          expectedText: this.currentSentence(),
          feedback: result,
          durationMs: this.durationMs(),
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
    if (this.isLastSentence()) return;
    this.currentIndex.update(i => i + 1);
    this.resetRecording();
    this.feedback.set(null);
    this.errorMessage.set(null);
  }

  previousSentence(): void {
    if (this.currentIndex() === 0) return;
    this.currentIndex.update(i => i - 1);
    this.resetRecording();
    this.feedback.set(null);
    this.errorMessage.set(null);
  }

  retryRecording(): void {
    this.resetRecording();
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
}
