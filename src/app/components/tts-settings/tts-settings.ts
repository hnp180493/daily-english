import { Component, ChangeDetectionStrategy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TTSService } from '../../services/tts.service';

@Component({
  selector: 'app-tts-settings',
  imports: [CommonModule, FormsModule],
  templateUrl: './tts-settings.html',
  styleUrl: './tts-settings.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'block'
  }
})
export class TTSSettings {
  private ttsService = inject(TTSService);

  isOpen = signal(false);
  
  availableVoices = computed(() => {
    const voices = this.ttsService.getPopularVoices();
    console.log('Popular voices:', voices.map(v => v.name));
    return voices;
  });
  currentVoiceName = this.ttsService.currentVoiceName;
  
  settings = signal(this.ttsService.getSettings());

  toggle(): void {
    this.isOpen.update(v => !v);
  }

  onVoiceChange(voiceName: string): void {
    this.ttsService.setVoice(voiceName);
  }

  onRateChange(value: string): void {
    const rate = parseFloat(value);
    this.ttsService.setRate(rate);
    this.settings.set(this.ttsService.getSettings());
  }

  onPitchChange(value: string): void {
    const pitch = parseFloat(value);
    this.ttsService.setPitch(pitch);
    this.settings.set(this.ttsService.getSettings());
  }

  onVolumeChange(value: string): void {
    const volume = parseFloat(value);
    this.ttsService.setVolume(volume);
    this.settings.set(this.ttsService.getSettings());
  }

  testVoice(): void {
    this.ttsService.speak('Hello! This is a test of the text to speech voice. How does it sound?');
  }

  applyPreset(preset: 'natural' | 'clear' | 'expressive'): void {
    switch (preset) {
      case 'natural':
        this.ttsService.setRate(0.95);
        this.ttsService.setPitch(1.1);
        break;
      case 'clear':
        this.ttsService.setRate(0.85);
        this.ttsService.setPitch(1.0);
        break;
      case 'expressive':
        this.ttsService.setRate(1.0);
        this.ttsService.setPitch(1.2);
        break;
    }
    this.settings.set(this.ttsService.getSettings());
  }
}
