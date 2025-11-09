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
  
  isPlaying = signal(false);
  isPaused = signal(false);
  currentSentenceIndex = signal<number | null>(null);
  
  private voices: SpeechSynthesisVoice[] = [];
  private selectedVoice: SpeechSynthesisVoice | null = null;

  constructor() {
    this.loadVoices();
    
    // Voices may load asynchronously
    if (speechSynthesis.onvoiceschanged !== undefined) {
      speechSynthesis.onvoiceschanged = () => {
        this.loadVoices();
      };
    }
  }

  private loadVoices(): void {
    this.voices = this.synth.getVoices();
    
    // Try to find Microsoft Ava Neural voice (en-US)
    const avaVoice = this.voices.find(v => 
      v.name.includes('Ava') && v.lang === 'en-US'
    );
    
    // Fallback to any Microsoft Edge voice (en-US)
    const edgeVoice = this.voices.find(v => 
      v.name.includes('Microsoft') && v.lang.startsWith('en-US')
    );
    
    // Fallback to any English voice
    const englishVoice = this.voices.find(v => v.lang.startsWith('en'));
    
    this.selectedVoice = avaVoice || edgeVoice || englishVoice || this.voices[0] || null;
    
    console.log('Selected TTS voice:', this.selectedVoice?.name);
  }

  getAvailableVoices(): SpeechSynthesisVoice[] {
    return this.voices.filter(v => v.lang.startsWith('en'));
  }

  setVoice(voiceName: string): void {
    const voice = this.voices.find(v => v.name === voiceName);
    if (voice) {
      this.selectedVoice = voice;
    }
  }

  speak(text: string, onEnd?: () => void, onBoundary?: (charIndex: number) => void): void {
    if (!text.trim()) return;

    // Cancel any ongoing speech
    this.stop();

    this.currentUtterance = new SpeechSynthesisUtterance(text);
    
    if (this.selectedVoice) {
      this.currentUtterance.voice = this.selectedVoice;
    }
    
    // Configure speech parameters
    this.currentUtterance.rate = 0.9; // Slightly slower for learning
    this.currentUtterance.pitch = 1.0;
    this.currentUtterance.volume = 1.0;
    this.currentUtterance.lang = 'en-US';

    this.currentUtterance.onstart = () => {
      this.isPlaying.set(true);
      this.isPaused.set(false);
    };

    this.currentUtterance.onend = () => {
      this.isPlaying.set(false);
      this.isPaused.set(false);
      this.currentSentenceIndex.set(null);
      if (onEnd) onEnd();
    };

    this.currentUtterance.onerror = (event) => {
      console.error('Speech synthesis error:', event);
      this.isPlaying.set(false);
      this.isPaused.set(false);
      this.currentSentenceIndex.set(null);
    };

    if (onBoundary) {
      this.currentUtterance.onboundary = (event) => {
        onBoundary(event.charIndex);
      };
    }

    this.synth.speak(this.currentUtterance);
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
    this.synth.cancel();
    this.isPlaying.set(false);
    this.isPaused.set(false);
    this.currentSentenceIndex.set(null);
    this.currentUtterance = null;
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
