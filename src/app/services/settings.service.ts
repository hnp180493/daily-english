import { Injectable, signal, effect, inject } from '@angular/core';
import { AnalyticsService } from './analytics.service';
import { FontSize, FontFamily, FontSizeService } from './font-size.service';

export type UILanguage = 'vi' | 'en';

export interface AppSettings {
  autoPlayTTSAfterTranslation: boolean;
  translateFeedbackToVietnamese: boolean;
  fontSize: FontSize;
  fontFamily: FontFamily;
  uiLanguage: UILanguage;
  highContrast: boolean;
}

const DEFAULT_SETTINGS: AppSettings = {
  autoPlayTTSAfterTranslation: false,
  translateFeedbackToVietnamese: false,
  fontSize: 'medium',
  fontFamily: 'default',
  uiLanguage: 'en',
  highContrast: false
};

const STORAGE_KEY = 'app_settings';

@Injectable({
  providedIn: 'root'
})
export class SettingsService {
  private settingsSignal = signal<AppSettings>(this.loadSettings());
  private analyticsService = inject(AnalyticsService);
  private fontSizeService = inject(FontSizeService);

  constructor() {
    // Analytics is always enabled
    this.analyticsService.setAnalyticsEnabled(true);

    // Apply initial appearance settings to DOM
    const initial = this.settingsSignal();
    this.fontSizeService.applyFontSize(initial.fontSize);
    this.fontSizeService.applyFontFamily(initial.fontFamily);
    this.applyHighContrast(initial.highContrast);

    effect(() => {
      const settings = this.settingsSignal();
      this.saveSettings(settings);
      // Re-apply DOM-affecting settings on every change
      this.fontSizeService.applyFontSize(settings.fontSize);
      this.fontSizeService.applyFontFamily(settings.fontFamily);
      this.applyHighContrast(settings.highContrast);
    });
  }

  getSettings(): AppSettings {
    return this.settingsSignal();
  }

  getSettingsSignal() {
    return this.settingsSignal.asReadonly();
  }

  updateSettings(settings: Partial<AppSettings>): void {
    this.settingsSignal.update(current => ({
      ...current,
      ...settings
    }));
  }

  toggleAutoPlayTTS(): void {
    this.settingsSignal.update(current => ({
      ...current,
      autoPlayTTSAfterTranslation: !current.autoPlayTTSAfterTranslation
    }));
  }

  toggleTranslateFeedback(): void {
    this.settingsSignal.update(current => ({
      ...current,
      translateFeedbackToVietnamese: !current.translateFeedbackToVietnamese
    }));
  }

  setFontSize(size: FontSize): void {
    this.updateSettings({ fontSize: size });
  }

  setFontFamily(family: FontFamily): void {
    this.updateSettings({ fontFamily: family });
  }

  setUILanguage(language: UILanguage): void {
    this.updateSettings({ uiLanguage: language });
  }

  toggleHighContrast(): void {
    this.settingsSignal.update(current => ({
      ...current,
      highContrast: !current.highContrast
    }));
  }

  private applyHighContrast(enabled: boolean): void {
    if (typeof document === 'undefined') return;
    document.documentElement.classList.toggle('high-contrast', enabled);
  }

  private loadSettings(): AppSettings {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return { ...DEFAULT_SETTINGS, ...parsed };
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    }

    return { ...DEFAULT_SETTINGS };
  }

  private saveSettings(settings: AppSettings): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
  }

  resetSettings(): void {
    this.settingsSignal.set(DEFAULT_SETTINGS);
  }
}
