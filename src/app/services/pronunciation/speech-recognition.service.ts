import { Injectable, signal } from '@angular/core';

export type SpeechRecognitionState = 'idle' | 'requesting' | 'listening' | 'stopped' | 'error';

export interface SpeechRecognitionResult {
  /** Final transcript (best alternative). */
  transcript: string;
  /** Confidence 0-1 from the Web Speech API. */
  confidence: number;
}

/**
 * Thin wrapper over the browser's webkitSpeechRecognition / SpeechRecognition API.
 * Used as a Tier-1 fallback for pronunciation practice when the active AI provider
 * does not support audio input (only Gemini does today).
 *
 * Web Speech support is uneven: Chrome/Edge desktop and Safari iOS work well;
 * Firefox has no support. Call `isSupported()` before using.
 */
@Injectable({ providedIn: 'root' })
export class SpeechRecognitionService {
  readonly state = signal<SpeechRecognitionState>('idle');
  readonly errorMessage = signal<string | null>(null);
  readonly interimTranscript = signal<string>('');

  private recognition: any | null = null;
  private resolveStop: ((res: SpeechRecognitionResult) => void) | null = null;
  private rejectStop: ((err: Error) => void) | null = null;
  private finalTranscript = '';
  private finalConfidence = 0;

  isSupported(): boolean {
    if (typeof window === 'undefined') return false;
    return 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window;
  }

  async start(): Promise<void> {
    if (!this.isSupported()) {
      this.state.set('error');
      this.errorMessage.set('Trình duyệt không hỗ trợ Web Speech API. Dùng Chrome/Edge hoặc Safari.');
      throw new Error('SpeechRecognition not supported');
    }

    if (this.state() === 'listening' || this.state() === 'requesting') {
      return;
    }

    this.state.set('requesting');
    this.errorMessage.set(null);
    this.interimTranscript.set('');
    this.finalTranscript = '';
    this.finalConfidence = 0;

    const SR: any = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    this.recognition = new SR();
    this.recognition.lang = 'en-US';
    this.recognition.continuous = false;
    this.recognition.interimResults = true;
    this.recognition.maxAlternatives = 1;

    this.recognition.onstart = () => {
      this.state.set('listening');
    };

    this.recognition.onresult = (event: any) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const alt = result[0];
        if (result.isFinal) {
          this.finalTranscript += alt.transcript;
          this.finalConfidence = Math.max(this.finalConfidence, alt.confidence || 0);
        } else {
          interim += alt.transcript;
        }
      }
      this.interimTranscript.set(this.finalTranscript + interim);
    };

    this.recognition.onerror = (event: any) => {
      this.state.set('error');
      const msg = this.errorFromCode(event.error);
      this.errorMessage.set(msg);
      if (this.rejectStop) {
        this.rejectStop(new Error(msg));
        this.resolveStop = null;
        this.rejectStop = null;
      }
    };

    this.recognition.onend = () => {
      if (this.state() === 'listening' || this.state() === 'requesting') {
        this.state.set('stopped');
      }
      if (this.resolveStop) {
        this.resolveStop({
          transcript: this.finalTranscript.trim(),
          confidence: this.finalConfidence,
        });
        this.resolveStop = null;
        this.rejectStop = null;
      }
    };

    try {
      this.recognition.start();
    } catch (err) {
      this.state.set('error');
      this.errorMessage.set('Không thể bắt đầu nhận diện giọng nói.');
      throw err;
    }
  }

  stop(): Promise<SpeechRecognitionResult> {
    if (!this.recognition || this.state() !== 'listening') {
      return Promise.resolve({ transcript: this.finalTranscript.trim(), confidence: this.finalConfidence });
    }
    return new Promise<SpeechRecognitionResult>((resolve, reject) => {
      this.resolveStop = resolve;
      this.rejectStop = reject;
      try {
        this.recognition.stop();
      } catch (err) {
        reject(err as Error);
      }
    });
  }

  cancel(): void {
    if (!this.recognition) return;
    try {
      this.recognition.abort();
    } catch {
      /* noop */
    }
    this.state.set('idle');
    this.interimTranscript.set('');
    this.finalTranscript = '';
    this.finalConfidence = 0;
  }

  reset(): void {
    this.state.set('idle');
    this.errorMessage.set(null);
    this.interimTranscript.set('');
    this.finalTranscript = '';
    this.finalConfidence = 0;
  }

  private errorFromCode(code: string): string {
    switch (code) {
      case 'no-speech':
        return 'Không nghe thấy giọng nói. Hãy thử nói to hơn.';
      case 'audio-capture':
        return 'Không truy cập được micro. Kiểm tra quyền và phần cứng.';
      case 'not-allowed':
        return 'Bạn đã từ chối quyền micro. Cấp lại trong cài đặt trình duyệt.';
      case 'network':
        return 'Lỗi kết nối — Web Speech cần internet để nhận diện.';
      case 'aborted':
        return 'Đã hủy nhận diện giọng nói.';
      default:
        return `Lỗi nhận diện giọng nói (${code}).`;
    }
  }
}
