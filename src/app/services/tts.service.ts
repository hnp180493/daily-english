import { Injectable, signal } from '@angular/core';

export interface TTSVoice {
  name: string;
  lang: string;
  gender: 'Male' | 'Female';
}

@Injectable({
  providedIn: 'root'
})
export class TTSService {
  private synth = window.speechSynthesis;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  /** Fires when the current utterance fails or is cut off before onEnd. */
  private currentOnInterrupt: (() => void) | null = null;
  
  isPlaying = signal(false);
  isPaused = signal(false);
  currentSentenceIndex = signal<number | null>(null);
  currentVoiceName = signal<string>('');
  
  private voices: SpeechSynthesisVoice[] = [];
  private selectedVoice: SpeechSynthesisVoice | null = null;

  // Voice parameters for more natural speech
  private rate = 0.95;
  private pitch = 1.1;
  private volume = 1.0;

  private readonly STORAGE_KEY = 'tts-settings';

  constructor() {
    this.loadSettings();
    this.loadVoices();
    
    // Voices may load asynchronously
    if (speechSynthesis.onvoiceschanged !== undefined) {
      speechSynthesis.onvoiceschanged = () => {
        this.loadVoices();
      };
    }
  }

  private loadSettings(): void {
    try {
      const saved = localStorage.getItem(this.STORAGE_KEY);
      if (saved) {
        const settings = JSON.parse(saved);
        this.rate = settings.rate ?? 0.95;
        this.pitch = settings.pitch ?? 1.1;
        this.volume = settings.volume ?? 1.0;
        console.log('Loaded TTS settings from localStorage:', settings);
      }
    } catch (error) {
      console.error('Failed to load TTS settings:', error);
    }
  }

  private saveSettings(): void {
    try {
      const settings = {
        rate: this.rate,
        pitch: this.pitch,
        volume: this.volume,
        voiceName: this.selectedVoice?.name
      };
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(settings));
    } catch (error) {
      console.error('Failed to save TTS settings:', error);
    }
  }

  private loadVoices(): void {
    this.voices = this.synth.getVoices();
    
    if (this.voices.length === 0) {
      console.log('No voices available yet, waiting...');
      return;
    }
    
    // If we already have a selected voice, try to restore it
    const currentVoiceName = this.currentVoiceName();
    if (currentVoiceName) {
      const existingVoice = this.voices.find(v => v.name === currentVoiceName);
      if (existingVoice) {
        this.selectedVoice = existingVoice;
        // console.log('Kept current voice:', existingVoice.name);
        return;
      }
    }
    
    // Try to restore saved voice from localStorage
    const saved = localStorage.getItem(this.STORAGE_KEY);
    if (saved) {
      try {
        const settings = JSON.parse(saved);
        if (settings.voiceName) {
          const savedVoice = this.voices.find(v => v.name === settings.voiceName);
          if (savedVoice) {
            this.selectedVoice = savedVoice;
            this.currentVoiceName.set(savedVoice.name);
            console.log('Restored saved voice:', savedVoice.name);
            return;
          }
        }
      } catch (error) {
        console.error('Failed to restore saved voice:', error);
      }
    }
    
    // Only select default voice if no voice is currently selected
    if (!this.selectedVoice) {
      // Priority 1: Microsoft Ava Neural voice (en-US) - Edge
      const avaVoice = this.voices.find(v => 
        v.name.includes('Ava') && v.lang === 'en-US'
      );
      
      // Priority 2: Any female Microsoft voice (en-US)
      const femaleEdgeVoice = this.voices.find(v => 
        v.name.includes('Microsoft') && 
        v.lang.startsWith('en-US') &&
        (v.name.includes('Female') || v.name.includes('Zira') || v.name.includes('Jenny'))
      );
      
      // Priority 3: Google US English Female (Chrome)
      const googleFemaleVoice = this.voices.find(v => 
        v.name.includes('Google US English') && v.name.includes('Female')
      );
      
      // Priority 4: Any female English voice
      const femaleVoice = this.voices.find(v => 
        v.lang.startsWith('en') && 
        (v.name.toLowerCase().includes('female') || 
         v.name.includes('Samantha') || 
         v.name.includes('Victoria') ||
         v.name.includes('Karen'))
      );
      
      // Priority 5: Any English voice
      const englishVoice = this.voices.find(v => v.lang.startsWith('en'));
      
      this.selectedVoice = avaVoice || femaleEdgeVoice || googleFemaleVoice || femaleVoice || englishVoice || this.voices[0] || null;
      
      if (this.selectedVoice) {
        this.currentVoiceName.set(this.selectedVoice.name);
      }
      
      console.log('Selected default TTS voice:', this.selectedVoice?.name, '(', this.selectedVoice?.lang, ')');
    }
  }

  getAvailableVoices(): SpeechSynthesisVoice[] {
    return this.voices.filter(v => v.lang.startsWith('en'));
  }

  getPopularVoices(): SpeechSynthesisVoice[] {
    const popularNames = [
      'Ava',
      'Jenny',
      'Aria',
      'Guy',
      'Zira',
      'David',
      'Mark',
      'Google US English Female',
      'Google US English Male',
      'Google UK English Female',
      'Google UK English Male'
    ];

    return this.voices.filter(v => {
      if (!v.lang.startsWith('en')) return false;
      
      // Only show US and UK voices
      if (!v.lang.includes('en-US') && !v.lang.includes('en-GB')) return false;
      
      // Check if voice name contains any popular name
      return popularNames.some(name => v.name.includes(name));
    });
  }

  getAvailableFemaleVoices(): SpeechSynthesisVoice[] {
    return this.voices.filter(v => 
      v.lang.startsWith('en') && 
      (v.name.toLowerCase().includes('female') || 
       v.name.includes('Ava') ||
       v.name.includes('Zira') ||
       v.name.includes('Jenny') ||
       v.name.includes('Samantha') ||
       v.name.includes('Victoria') ||
       v.name.includes('Karen'))
    );
  }

  setVoice(voiceName: string): void {
    const voice = this.voices.find(v => v.name === voiceName);
    if (voice) {
      this.selectedVoice = voice;
      this.currentVoiceName.set(voice.name);
      console.log('Voice changed to:', voice.name);
      this.saveSettings();
    }
  }

  getCurrentVoice(): SpeechSynthesisVoice | null {
    return this.selectedVoice;
  }

  setRate(rate: number): void {
    this.rate = Math.max(0.5, Math.min(2.0, rate));
    this.saveSettings();
  }

  setPitch(pitch: number): void {
    this.pitch = Math.max(0.5, Math.min(2.0, pitch));
    this.saveSettings();
  }

  setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1.0, volume));
    this.saveSettings();
  }

  getSettings(): { rate: number; pitch: number; volume: number } {
    return { rate: this.rate, pitch: this.pitch, volume: this.volume };
  }

  /**
   * Speak text. `options.rate` applies to this utterance only and is NOT
   * persisted (use setRate() to change the user's saved rate).
   * `options.onError` fires instead of onEnd when the utterance fails or is
   * cut off (stop() or another speak()), so callers can reset their UI state.
   */
  speak(
    text: string,
    onEnd?: () => void,
    onBoundary?: (charIndex: number) => void,
    options?: { rate?: number; onError?: () => void }
  ): void {
    if (!text.trim()) return;

    // Cancel any ongoing speech
    this.stop();

    const u = new SpeechSynthesisUtterance(text);
    this.currentUtterance = u;
    this.currentOnInterrupt = options?.onError ?? null;

    if (this.selectedVoice) {
      u.voice = this.selectedVoice;
    }

    // Configure speech parameters for more natural female voice
    u.rate = options?.rate != null ? Math.max(0.5, Math.min(2.0, options.rate)) : this.rate;
    u.pitch = this.pitch;
    u.volume = this.volume;
    u.lang = 'en-US';

    u.onstart = () => {
      if (this.currentUtterance !== u) return;
      this.isPlaying.set(true);
      this.isPaused.set(false);
    };

    u.onend = () => {
      // Stale utterance (cancelled / replaced) — don't touch state or fire callbacks
      if (this.currentUtterance !== u) return;
      this.currentUtterance = null;
      this.currentOnInterrupt = null;
      this.isPlaying.set(false);
      this.isPaused.set(false);
      this.currentSentenceIndex.set(null);
      if (onEnd) onEnd();
    };

    u.onerror = (event) => {
      if (this.currentUtterance !== u) return;
      // stop()/a new speak() cancels the current utterance — expected, not an error
      if (event.error !== 'interrupted' && event.error !== 'canceled') {
        console.error('Speech synthesis error:', event);
      }
      const onInterrupt = this.currentOnInterrupt;
      this.currentUtterance = null;
      this.currentOnInterrupt = null;
      this.isPlaying.set(false);
      this.isPaused.set(false);
      this.currentSentenceIndex.set(null);
      onInterrupt?.();
    };

    if (onBoundary) {
      u.onboundary = (event) => {
        if (this.currentUtterance !== u) return;
        onBoundary(event.charIndex);
      };
    }

    this.synth.speak(u);
  }

  speakSentences(sentences: string[], startIndex: number = 0): void {
    if (sentences.length === 0) return;

    const speakNext = (index: number): void => {
      if (index >= sentences.length) {
        this.currentSentenceIndex.set(null);
        return;
      }

      this.currentSentenceIndex.set(index);
      this.speak(sentences[index], () => {
        // Speak next sentence after a brief pause
        setTimeout(() => speakNext(index + 1), 300);
      });
    };

    speakNext(startIndex);
  }

  pause(): void {
    if (this.isPlaying() && !this.isPaused()) {
      this.synth.pause();
      this.isPaused.set(true);
    }
  }

  resume(): void {
    if (this.isPaused()) {
      this.synth.resume();
      this.isPaused.set(false);
    }
  }

  stop(): void {
    // Chrome keeps the synth paused across cancel(), silencing the next speak()
    if (this.synth.paused) this.synth.resume();
    this.synth.cancel();
    this.isPlaying.set(false);
    this.isPaused.set(false);
    this.currentSentenceIndex.set(null);
    this.currentUtterance = null;
    const onInterrupt = this.currentOnInterrupt;
    this.currentOnInterrupt = null;
    onInterrupt?.();
  }

  toggle(): void {
    if (this.isPlaying()) {
      if (this.isPaused()) {
        this.resume();
      } else {
        this.pause();
      }
    }
  }
}
