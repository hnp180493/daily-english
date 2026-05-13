import { Component, ChangeDetectionStrategy, inject, computed, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SettingsService, UILanguage } from '../../services/settings.service';
import { FontSize, FontFamily } from '../../services/font-size.service';
import { NotificationService, NotificationPreferences } from '../../services/notification.service';
import { TranslationService } from '../../services/translation.service';

interface FontSizeOption {
  value: FontSize;
  label: string;
  sample: string;
}

interface LanguageOption {
  value: UILanguage;
  label: string;
}

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './app-settings.html',
  styleUrl: './app-settings.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppSettingsComponent implements OnInit {
  private settingsService = inject(SettingsService);
  private notificationService = inject(NotificationService);
  protected translate = inject(TranslationService);

  settings = this.settingsService.getSettingsSignal();

  autoPlayTTS = computed(() => this.settings().autoPlayTTSAfterTranslation);
  translateFeedback = computed(() => this.settings().translateFeedbackToVietnamese);
  fontSize = computed(() => this.settings().fontSize);
  fontFamily = computed(() => this.settings().fontFamily);
  uiLanguage = computed(() => this.settings().uiLanguage);
  highContrast = computed(() => this.settings().highContrast);

  notificationPrefs = signal<NotificationPreferences | null>(null);
  notificationPermission = signal<NotificationPermission>('default');

  readonly fontSizeOptions: FontSizeOption[] = [
    { value: 'small', label: 'Nhỏ', sample: 'Aa' },
    { value: 'medium', label: 'Vừa', sample: 'Aa' },
    { value: 'large', label: 'Lớn', sample: 'Aa' },
    { value: 'xlarge', label: 'Rất lớn', sample: 'Aa' }
  ];

  readonly languageOptions: LanguageOption[] = [
    { value: 'vi', label: 'Tiếng Việt' },
    { value: 'en', label: 'English (coming soon)' }
  ];

  ngOnInit(): void {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      this.notificationPermission.set(Notification.permission);
    }
    this.notificationService.getPreferences().subscribe(prefs => {
      this.notificationPrefs.set(prefs);
    });
  }

  toggleAutoPlayTTS(): void {
    this.settingsService.toggleAutoPlayTTS();
  }

  toggleTranslateFeedback(): void {
    this.settingsService.toggleTranslateFeedback();
  }

  setFontSize(size: FontSize): void {
    this.settingsService.setFontSize(size);
  }

  toggleFontFamily(): void {
    const next: FontFamily = this.fontFamily() === 'dyslexic' ? 'default' : 'dyslexic';
    this.settingsService.setFontFamily(next);
  }

  setUILanguage(language: UILanguage): void {
    this.settingsService.setUILanguage(language);
  }

  toggleHighContrast(): void {
    this.settingsService.toggleHighContrast();
  }

  toggleNotifications(): void {
    const prefs = this.notificationPrefs();
    if (prefs?.enabled) {
      this.notificationService.disableNotifications().subscribe(() => {
        this.notificationService.getPreferences().subscribe(p => this.notificationPrefs.set(p));
      });
    } else {
      this.notificationService.enableNotifications().subscribe(success => {
        if (success && typeof Notification !== 'undefined') {
          this.notificationPermission.set(Notification.permission);
        }
        this.notificationService.getPreferences().subscribe(p => this.notificationPrefs.set(p));
      });
    }
  }

  updateReminderTime(time: string): void {
    this.notificationService.setReminderTime(time).subscribe(() => {
      this.notificationService.getPreferences().subscribe(p => this.notificationPrefs.set(p));
    });
  }

  resetSettings(): void {
    if (confirm(this.translate.t('settings.reset.confirm'))) {
      this.settingsService.resetSettings();
    }
  }
}
