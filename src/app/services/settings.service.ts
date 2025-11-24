import { Injectable, signal, effect } from '@angular/core';

export interface AppSettings {
  autoPlayTTSAfterTranslation: boolean;
  translateFeedbackToVietnamese: boolean;
}

const DEFAULT_SETTINGS: AppSettings = {
  autoPlayTTSAfterTranslation: false,
  translateFeedbackToVietnamese: false
};

const STORAGE_KEY = 'app_settings';

@Injectable({
  providedIn: 'root'
})
export class SettingsService {
  private settingsSignal = signal<AppSettings>(this.loadSettings());

  constructor() {
    effect(() => {
      const settings = this.settingsSignal();
      this.saveSettings(settings);
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
    return DEFAULT_SETTINGS;
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
