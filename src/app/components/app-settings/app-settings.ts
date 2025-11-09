import { Component, ChangeDetectionStrategy, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SettingsService } from '../../services/settings.service';

@Component({
  selector: 'app-settings',
  imports: [CommonModule, FormsModule],
  templateUrl: './app-settings.html',
  styleUrl: './app-settings.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppSettingsComponent {
  private settingsService = inject(SettingsService);

  settings = this.settingsService.getSettingsSignal();

  autoPlayTTS = computed(() => this.settings().autoPlayTTSAfterTranslation);

  toggleAutoPlayTTS(): void {
    this.settingsService.toggleAutoPlayTTS();
  }

  resetSettings(): void {
    if (confirm('Bạn có chắc muốn đặt lại tất cả cài đặt về mặc định?')) {
      this.settingsService.resetSettings();
    }
  }
}
