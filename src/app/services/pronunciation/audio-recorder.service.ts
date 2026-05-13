import { Injectable, signal } from '@angular/core';
import { PRONUNCIATION_DEFAULTS } from '../../models/pronunciation.model';

export type AudioRecorderState = 'idle' | 'requesting' | 'recording' | 'stopped' | 'error';

export interface AudioRecording {
  blob: Blob;
  mimeType: string;
  durationMs: number;
}

@Injectable({ providedIn: 'root' })
export class AudioRecorderService {
  readonly state = signal<AudioRecorderState>('idle');
  readonly elapsedMs = signal<number>(0);
  readonly errorMessage = signal<string | null>(null);

  private mediaRecorder: MediaRecorder | null = null;
  private mediaStream: MediaStream | null = null;
  private chunks: Blob[] = [];
  private startedAt = 0;
  private tickHandle: number | null = null;
  private autoStopHandle: number | null = null;
  private resolveStop: ((rec: AudioRecording) => void) | null = null;
  private rejectStop: ((err: Error) => void) | null = null;

  isSupported(): boolean {
    return (
      typeof navigator !== 'undefined' &&
      !!navigator.mediaDevices?.getUserMedia &&
      typeof MediaRecorder !== 'undefined'
    );
  }

  async start(): Promise<void> {
    if (!this.isSupported()) {
      this.state.set('error');
      this.errorMessage.set('Trình duyệt không hỗ trợ ghi âm.');
      throw new Error('MediaRecorder not supported');
    }

    if (this.state() === 'recording' || this.state() === 'requesting') {
      return;
    }

    this.errorMessage.set(null);
    this.state.set('requesting');

    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err) {
      this.state.set('error');
      this.errorMessage.set('Bạn cần cấp quyền micro để dùng tính năng này.');
      throw err;
    }

    const mimeType = MediaRecorder.isTypeSupported(PRONUNCIATION_DEFAULTS.AUDIO_MIME_PREFERRED)
      ? PRONUNCIATION_DEFAULTS.AUDIO_MIME_PREFERRED
      : MediaRecorder.isTypeSupported(PRONUNCIATION_DEFAULTS.AUDIO_MIME_FALLBACK)
        ? PRONUNCIATION_DEFAULTS.AUDIO_MIME_FALLBACK
        : '';

    this.mediaRecorder = mimeType
      ? new MediaRecorder(this.mediaStream, { mimeType })
      : new MediaRecorder(this.mediaStream);
    this.chunks = [];

    this.mediaRecorder.ondataavailable = (event: BlobEvent) => {
      if (event.data && event.data.size > 0) {
        this.chunks.push(event.data);
      }
    };

    this.mediaRecorder.onstop = () => {
      const finalMime = this.mediaRecorder?.mimeType || mimeType || 'audio/webm';
      const blob = new Blob(this.chunks, { type: finalMime });
      const recording: AudioRecording = {
        blob,
        mimeType: finalMime,
        durationMs: Date.now() - this.startedAt
      };
      this.cleanupStream();
      this.state.set('stopped');
      this.resolveStop?.(recording);
      this.resolveStop = null;
      this.rejectStop = null;
    };

    this.mediaRecorder.onerror = (event: Event) => {
      this.errorMessage.set('Lỗi khi ghi âm.');
      this.state.set('error');
      this.cleanupStream();
      this.rejectStop?.(new Error('MediaRecorder error'));
      this.resolveStop = null;
      this.rejectStop = null;
    };

    this.startedAt = Date.now();
    this.mediaRecorder.start();
    this.state.set('recording');

    this.tickHandle = window.setInterval(() => {
      this.elapsedMs.set(Date.now() - this.startedAt);
    }, 100);

    this.autoStopHandle = window.setTimeout(() => {
      if (this.state() === 'recording') {
        this.stop().catch(() => undefined);
      }
    }, PRONUNCIATION_DEFAULTS.MAX_RECORDING_MS);
  }

  stop(): Promise<AudioRecording> {
    return new Promise<AudioRecording>((resolve, reject) => {
      if (!this.mediaRecorder || this.state() !== 'recording') {
        reject(new Error('No active recording'));
        return;
      }
      this.resolveStop = resolve;
      this.rejectStop = reject;
      this.clearTimers();
      try {
        this.mediaRecorder.stop();
      } catch (err) {
        reject(err as Error);
      }
    });
  }

  cancel(): void {
    if (this.mediaRecorder && this.state() === 'recording') {
      try {
        this.mediaRecorder.stop();
      } catch {
        // ignore
      }
    }
    this.cleanupStream();
    this.state.set('idle');
    this.elapsedMs.set(0);
    this.errorMessage.set(null);
    this.resolveStop = null;
    this.rejectStop = null;
  }

  reset(): void {
    this.state.set('idle');
    this.elapsedMs.set(0);
    this.errorMessage.set(null);
  }

  private clearTimers(): void {
    if (this.tickHandle !== null) {
      clearInterval(this.tickHandle);
      this.tickHandle = null;
    }
    if (this.autoStopHandle !== null) {
      clearTimeout(this.autoStopHandle);
      this.autoStopHandle = null;
    }
  }

  private cleanupStream(): void {
    this.clearTimers();
    this.mediaStream?.getTracks().forEach(track => track.stop());
    this.mediaStream = null;
    this.mediaRecorder = null;
  }
}
