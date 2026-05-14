import { Injectable } from '@angular/core';

/**
 * Converts recorded audio blobs (webm/mp4/ogg from MediaRecorder) into formats
 * accepted by OpenAI/Azure/OpenRouter's `input_audio` field — currently only
 * WAV and MP3. We do not have an MP3 encoder client-side, so we always produce
 * WAV (16-bit PCM, mono, 16 kHz — small enough for the chat API and OpenAI
 * has confirmed support for this profile).
 *
 * Conversion is done entirely in the browser via the WebAudio API: decode the
 * compressed blob to a PCM AudioBuffer, then write a minimal WAV header + the
 * samples. No external library needed.
 */
@Injectable({ providedIn: 'root' })
export class AudioConverterService {
  /**
   * Decode a recorded blob and re-encode as 16-bit PCM WAV mono 16 kHz.
   * Returns `{ blob, durationMs }`.
   */
  async toWav(input: Blob, targetSampleRate = 16000): Promise<{ blob: Blob; durationMs: number }> {
    if (typeof window === 'undefined' || !('AudioContext' in window || 'webkitAudioContext' in window)) {
      throw new Error('Trình duyệt không hỗ trợ chuyển đổi audio (AudioContext).');
    }

    const arrayBuffer = await input.arrayBuffer();
    const AudioCtx: typeof AudioContext = (window as any).AudioContext || (window as any).webkitAudioContext;
    // Use a fresh AudioContext so we don't pollute global playback state.
    const ctx = new AudioCtx();
    let pcmBuffer: AudioBuffer;
    try {
      pcmBuffer = await ctx.decodeAudioData(arrayBuffer.slice(0));
    } catch (err) {
      await ctx.close();
      throw new Error('Không decode được audio. Trình duyệt có thể không hỗ trợ định dạng đã ghi.');
    }

    const downmixed = this.downmixToMono(pcmBuffer);
    const resampled = await this.resample(downmixed, pcmBuffer.sampleRate, targetSampleRate);
    await ctx.close();

    const wavBytes = this.encodeWav(resampled, targetSampleRate);
    const durationMs = Math.round((resampled.length / targetSampleRate) * 1000);
    return { blob: new Blob([wavBytes], { type: 'audio/wav' }), durationMs };
  }

  async blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        const base64 = result.split(',')[1] ?? '';
        resolve(base64);
      };
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
  }

  private downmixToMono(buffer: AudioBuffer): Float32Array {
    if (buffer.numberOfChannels === 1) {
      // Need a copy since `getChannelData` returns a live view.
      return new Float32Array(buffer.getChannelData(0));
    }
    const length = buffer.length;
    const result = new Float32Array(length);
    const channels: Float32Array[] = [];
    for (let i = 0; i < buffer.numberOfChannels; i++) {
      channels.push(buffer.getChannelData(i));
    }
    for (let i = 0; i < length; i++) {
      let sum = 0;
      for (const ch of channels) sum += ch[i];
      result[i] = sum / channels.length;
    }
    return result;
  }

  private async resample(samples: Float32Array, fromRate: number, toRate: number): Promise<Float32Array> {
    if (fromRate === toRate) return samples;
    if (typeof OfflineAudioContext === 'undefined') {
      // No offline context — naive linear interpolation as a fallback.
      return this.linearResample(samples, fromRate, toRate);
    }
    const offline = new OfflineAudioContext(1, Math.ceil((samples.length * toRate) / fromRate), toRate);
    const buffer = offline.createBuffer(1, samples.length, fromRate);
    // Ensure the typed array is backed by a plain ArrayBuffer (not SharedArrayBuffer) for copyToChannel.
    const copy = new Float32Array(new ArrayBuffer(samples.byteLength));
    copy.set(samples);
    buffer.copyToChannel(copy, 0);
    const source = offline.createBufferSource();
    source.buffer = buffer;
    source.connect(offline.destination);
    source.start(0);
    const rendered = await offline.startRendering();
    return new Float32Array(rendered.getChannelData(0));
  }

  private linearResample(samples: Float32Array, fromRate: number, toRate: number): Float32Array {
    const ratio = fromRate / toRate;
    const newLength = Math.round(samples.length / ratio);
    const result = new Float32Array(newLength);
    for (let i = 0; i < newLength; i++) {
      const src = i * ratio;
      const lo = Math.floor(src);
      const hi = Math.min(lo + 1, samples.length - 1);
      const frac = src - lo;
      result[i] = samples[lo] * (1 - frac) + samples[hi] * frac;
    }
    return result;
  }

  private encodeWav(samples: Float32Array, sampleRate: number): ArrayBuffer {
    const numChannels = 1;
    const bitsPerSample = 16;
    const bytesPerSample = bitsPerSample / 8;
    const blockAlign = numChannels * bytesPerSample;
    const byteRate = sampleRate * blockAlign;
    const dataLength = samples.length * bytesPerSample;
    const buffer = new ArrayBuffer(44 + dataLength);
    const view = new DataView(buffer);

    // RIFF header
    this.writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + dataLength, true);
    this.writeString(view, 8, 'WAVE');

    // fmt chunk
    this.writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true); // chunk size
    view.setUint16(20, 1, true); // PCM
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitsPerSample, true);

    // data chunk
    this.writeString(view, 36, 'data');
    view.setUint32(40, dataLength, true);

    // Samples
    let offset = 44;
    for (let i = 0; i < samples.length; i++, offset += 2) {
      const clamped = Math.max(-1, Math.min(1, samples[i]));
      view.setInt16(offset, clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff, true);
    }
    return buffer;
  }

  private writeString(view: DataView, offset: number, str: string): void {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  }
}
