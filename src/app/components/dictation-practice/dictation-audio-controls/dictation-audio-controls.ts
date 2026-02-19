import { CommonModule } from '@angular/common';
import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy, inject, signal, OnDestroy } from '@angular/core';
import { TTSSettings } from '../../tts-settings/tts-settings';
import { TTSService } from '../../../services/tts.service';
import { DictationSettingsService } from '../../../services/dictation-settings.service';
import { DictationSentence } from '../../../models/dictation.model';

@Component({
  selector: 'app-dictation-audio-controls',
  imports: [CommonModule, TTSSettings],
  templateUrl: './dictation-audio-controls.html',
  styleUrl: './dictation-audio-controls.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DictationAudioControls implements OnDestroy {
  private ttsService = inject(TTSService);
  private settingsService = inject(DictationSettingsService);
  
  @Input() currentSentence: DictationSentence | null = null;
  @Input() canGoPrevious!: boolean;
  @Input() canGoNext!: boolean;
  @Input() currentSentenceIndex!: number;
  @Input() totalSentences!: number;

  @Output() previous = new EventEmitter<void>();
  @Output() next = new EventEmitter<void>();
  @Output() playingChange = new EventEmitter<boolean>();
  @Output() pausedChange = new EventEmitter<boolean>();
  @Output() speedChange = new EventEmitter<number>();

  readonly speedOptions = [0.5, 0.75, 1.0, 1.25, 1.5];
  readonly settings = this.settingsService.settings;
  
  isPlaying = signal<boolean>(false);
  isPaused = signal<boolean>(false);
  playbackSpeed = signal<number>(1.0);
  
  private autoReplayTimer: any = null;
  private autoReplayCount = 0;

  ngOnDestroy(): void {
    this.stopAudio();
    this.clearAutoReplay();
  }

  onPlay(): void {
    if (!this.currentSentence) return;
    
    this.clearAutoReplay();
    const settings = this.settings();
    const autoReplayTimes = settings.autoReplay;
    
    if (autoReplayTimes > 0) {
      this.autoReplayCount = 0;
      this.playWithAutoReplay(this.currentSentence.original, autoReplayTimes, settings.secondsBetweenReplays);
    } else {
      this.isPlaying.set(true);
      this.isPaused.set(false);
      this.playingChange.emit(true);
      
      this.ttsService.speak(this.currentSentence.original, () => {
        this.isPlaying.set(false);
        this.playingChange.emit(false);
      });
    }
  }

  onPause(): void {
    this.ttsService.pause();
    this.isPaused.set(true);
    this.isPlaying.set(false);
    this.pausedChange.emit(true);
    this.playingChange.emit(false);
  }

  stopAudio(): void {
    this.clearAutoReplay();
    this.ttsService.stop();
    this.isPlaying.set(false);
    this.isPaused.set(false);
    this.playingChange.emit(false);
    this.pausedChange.emit(false);
  }

  onPrevious(): void {
    this.stopAudio();
    this.previous.emit();
  }

  onNext(): void {
    this.stopAudio();
    this.next.emit();
  }

  onSpeedChange(speed: number): void {
    this.playbackSpeed.set(speed);
    const settings = this.ttsService.getSettings();
    (this.ttsService as any).rate = speed;
    this.speedChange.emit(speed);
  }

  private playWithAutoReplay(text: string, totalTimes: number, delaySeconds: number): void {
    this.isPlaying.set(true);
    this.isPaused.set(false);
    this.playingChange.emit(true);
    
    this.ttsService.speak(text, () => {
      this.autoReplayCount++;
      
      if (this.autoReplayCount < totalTimes) {
        this.autoReplayTimer = setTimeout(() => {
          this.playWithAutoReplay(text, totalTimes, delaySeconds);
        }, delaySeconds * 1000);
      } else {
        this.isPlaying.set(false);
        this.autoReplayCount = 0;
        this.playingChange.emit(false);
      }
    });
  }

  private clearAutoReplay(): void {
    if (this.autoReplayTimer) {
      clearTimeout(this.autoReplayTimer);
      this.autoReplayTimer = null;
    }
    this.autoReplayCount = 0;
  }
}
