import { Injectable, signal } from '@angular/core';
import { DictationSettings, DEFAULT_DICTATION_SETTINGS } from '../models/settings.model';

@Injectable({
  providedIn: 'root'
})
export class DictationSettingsService {
  private readonly STORAGE_KEY = 'dictation_settings';
  
  settings = signal<DictationSettings>(this.loadSettings());

  private loadSettings(): DictationSettings {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        return { ...DEFAULT_DICTATION_SETTINGS, ...JSON.parse(stored) };
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
    return { ...DEFAULT_DICTATION_SETTINGS };
  }

  saveSettings(settings: DictationSettings): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(settings));
      this.settings.set(settings);
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  }

  updateSetting<K extends keyof DictationSettings>(
    key: K,
    value: DictationSettings[K]
  ): void {
    const updated = { ...this.settings(), [key]: value };
    this.saveSettings(updated);
  }

  resetToDefaults(): void {
    this.saveSettings({ ...DEFAULT_DICTATION_SETTINGS });
  }
}
