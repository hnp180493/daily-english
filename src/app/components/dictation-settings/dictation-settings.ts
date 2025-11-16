import { CommonModule } from '@angular/common';
import { Component, ChangeDetectionStrategy, output, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DictationSettingsService } from '../../services/dictation-settings.service';
import {
  AVAILABLE_KEYS,
  AUTO_REPLAY_OPTIONS,
  SECONDS_OPTIONS
} from '../../models/settings.model';

@Component({
  selector: 'app-dictation-settings',
  imports: [CommonModule, FormsModule],
  templateUrl: './dictation-settings.html',
  styleUrl: './dictation-settings.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DictationSettingsComponent {
  private settingsService = inject(DictationSettingsService);
  
  close = output<void>();
  
  settings = this.settingsService.settings;
  
  availableKeys = AVAILABLE_KEYS;
  autoReplayOptions = AUTO_REPLAY_OPTIONS;
  secondsOptions = SECONDS_OPTIONS;

  updateReplayKey(value: string): void {
    this.settingsService.updateSetting('replayKey', value);
  }

  updatePlayPauseKey(value: string): void {
    this.settingsService.updateSetting('playPauseKey', value);
  }

  updateAutoReplay(value: number): void {
    this.settingsService.updateSetting('autoReplay', value);
  }

  updateSecondsBetweenReplays(value: number): void {
    this.settingsService.updateSetting('secondsBetweenReplays', value);
  }

  updateShowShortcutTips(value: boolean): void {
    this.settingsService.updateSetting('showShortcutTips', value);
  }

  updateShowAnswerWhenWrong(value: boolean): void {
    this.settingsService.updateSetting('showAnswerWhenWrong', value);
  }

  updateAutoNextOnPerfect(value: boolean): void {
    this.settingsService.updateSetting('autoNextOnPerfect', value);
  }

  resetToDefaults(): void {
    this.settingsService.resetToDefaults();
  }

  closeModal(): void {
    this.close.emit();
  }
}
