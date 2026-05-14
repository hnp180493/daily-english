import { Injectable, inject, signal } from '@angular/core';
import { Observable } from 'rxjs';
import {
  PhonemeAssessment,
  PronunciationContext,
  PronunciationFeedback,
  WordPhonemeAssessment,
} from '../../models/pronunciation.model';
import { AudioConverterService } from './audio-converter.service';

interface AzureSpeechCredentials {
  apiKey: string;
  region: string;
}

const STORAGE_KEY = 'azure-speech-credentials-v1';

/**
 * Tier 3 pronunciation scoring via Azure Speech Pronunciation Assessment.
 * User-supplied key + region — browser calls Azure directly with no proxy.
 *
 * Docs: https://learn.microsoft.com/en-us/azure/ai-services/speech-service/how-to-pronunciation-assessment
 */
@Injectable({ providedIn: 'root' })
export class AzureSpeechPronunciationService {
  private audioConverter = inject(AudioConverterService);
  readonly credentials = signal<AzureSpeechCredentials | null>(null);

  constructor() {
    this.loadCredentials();
  }

  isConfigured(): boolean {
    const creds = this.credentials();
    return !!(creds && creds.apiKey && creds.region);
  }

  setCredentials(apiKey: string, region: string): void {
    const creds: AzureSpeechCredentials = { apiKey: apiKey.trim(), region: region.trim() };
    this.credentials.set(creds);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(creds));
    } catch (err) {
      console.warn('[AzureSpeech] Could not persist credentials', err);
    }
  }

  clearCredentials(): void {
    this.credentials.set(null);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* noop */
    }
  }

  /**
   * Send the audio to Azure Speech, get phoneme assessment, and merge it into
   * the existing `feedback` object. Returns a NEW feedback with `phoneme` set.
   */
  enrichWithPhonemes(
    audioBlob: Blob,
    context: PronunciationContext,
    baseFeedback: PronunciationFeedback
  ): Observable<PronunciationFeedback> {
    return new Observable((observer) => {
      const creds = this.credentials();
      if (!creds) {
        observer.error(new Error('Chưa cấu hình Azure Speech.'));
        return;
      }

      this.audioConverter
        .toWav(audioBlob)
        .then(({ blob }) => this.callAzureSpeech(blob, context.expectedText, creds))
        .then((assessment) => {
          const enriched: PronunciationFeedback = {
            ...baseFeedback,
            phoneme: assessment,
          };
          observer.next(enriched);
          observer.complete();
        })
        .catch((error) => {
          console.error('[AzureSpeech] Phoneme assessment error:', error);
          observer.error(error);
        });
    });
  }

  /**
   * Get JUST the phoneme assessment without merging into an existing feedback.
   * Useful when the user wants phoneme-only scoring without AI commentary.
   */
  assessPhonemes(audioBlob: Blob, expectedText: string): Observable<PronunciationFeedback> {
    return new Observable((observer) => {
      const creds = this.credentials();
      if (!creds) {
        observer.error(new Error('Chưa cấu hình Azure Speech.'));
        return;
      }

      this.audioConverter
        .toWav(audioBlob)
        .then(({ blob }) => this.callAzureSpeech(blob, expectedText, creds))
        .then((assessment) => {
          const feedback: PronunciationFeedback = {
            overallScore: assessment.pronScore,
            rawFeedback: this.buildRawFeedback(assessment),
            pronunciationIssues: this.buildIssues(assessment),
            strengths: this.buildStrengths(assessment),
            perWordFeedback: assessment.words.map((w) => ({
              word: w.word,
              ok: w.accuracyScore >= 70 && w.errorType === 'None',
              issue: w.errorType !== 'None' ? this.errorTypeLabel(w.errorType) : undefined,
            })),
            phoneme: assessment,
          };
          observer.next(feedback);
          observer.complete();
        })
        .catch((error) => {
          console.error('[AzureSpeech] Phoneme assessment error:', error);
          observer.error(error);
        });
    });
  }

  private async callAzureSpeech(
    wavBlob: Blob,
    expectedText: string,
    creds: AzureSpeechCredentials
  ): Promise<PhonemeAssessment> {
    const url = `https://${creds.region}.stt.speech.microsoft.com/speech/recognition/conversation/cognitiveservices/v1?language=en-US&format=detailed`;
    const assessmentParams = {
      ReferenceText: expectedText,
      GradingSystem: 'HundredMark',
      Granularity: 'Phoneme',
      Dimension: 'Comprehensive',
      EnableMiscue: 'True',
    };
    const assessmentB64 = btoa(unescape(encodeURIComponent(JSON.stringify(assessmentParams))));

    const arrayBuffer = await wavBlob.arrayBuffer();
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': creds.apiKey,
        'Content-Type': 'audio/wav; codecs=audio/pcm; samplerate=16000',
        'Pronunciation-Assessment': assessmentB64,
        Accept: 'application/json',
      },
      body: arrayBuffer,
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      throw new Error(`Azure Speech HTTP ${response.status}: ${errorText || response.statusText}`);
    }

    const data = await response.json();
    if (data.RecognitionStatus && data.RecognitionStatus !== 'Success') {
      throw new Error(`Azure Speech recognition status: ${data.RecognitionStatus}`);
    }

    const nbest = data.NBest?.[0];
    if (!nbest) {
      throw new Error('Azure Speech không trả về kết quả nhận diện.');
    }
    const pa = nbest.PronunciationAssessment;
    if (!pa) {
      throw new Error('Azure Speech không trả về dữ liệu pronunciation assessment.');
    }

    const words: WordPhonemeAssessment[] = (nbest.Words || []).map((w: any) => ({
      word: w.Word,
      accuracyScore: w.PronunciationAssessment?.AccuracyScore ?? 0,
      errorType: w.PronunciationAssessment?.ErrorType ?? 'None',
      phonemes: (w.Phonemes || []).map((p: any) => ({
        phoneme: p.Phoneme,
        accuracyScore: p.PronunciationAssessment?.AccuracyScore ?? 0,
      })),
    }));

    return {
      pronScore: pa.PronScore ?? 0,
      accuracyScore: pa.AccuracyScore ?? 0,
      fluencyScore: pa.FluencyScore ?? 0,
      completenessScore: pa.CompletenessScore ?? 0,
      words,
    };
  }

  private buildRawFeedback(a: PhonemeAssessment): string {
    return `Điểm phát âm: ${Math.round(a.pronScore)}/100 (chính xác ${Math.round(a.accuracyScore)}, lưu loát ${Math.round(a.fluencyScore)}, đầy đủ ${Math.round(a.completenessScore)}).`;
  }

  private buildIssues(a: PhonemeAssessment): string[] {
    const issues: string[] = [];
    const mispronounced = a.words.filter((w) => w.errorType === 'Mispronunciation' || w.accuracyScore < 60);
    if (mispronounced.length > 0) {
      issues.push(
        `Phát âm sai/yếu ${mispronounced.length} từ: ${mispronounced
          .slice(0, 5)
          .map((w) => `"${w.word}" (${Math.round(w.accuracyScore)})`)
          .join(', ')}`
      );
    }
    const omitted = a.words.filter((w) => w.errorType === 'Omission');
    if (omitted.length > 0) {
      issues.push(`Bỏ sót ${omitted.length} từ: ${omitted.map((w) => `"${w.word}"`).join(', ')}`);
    }
    const inserted = a.words.filter((w) => w.errorType === 'Insertion');
    if (inserted.length > 0) {
      issues.push(`Thêm từ thừa: ${inserted.map((w) => `"${w.word}"`).join(', ')}`);
    }
    return issues;
  }

  private buildStrengths(a: PhonemeAssessment): string[] {
    const strengths: string[] = [];
    const goodWords = a.words.filter((w) => w.accuracyScore >= 85 && w.errorType === 'None');
    if (goodWords.length > 0) {
      strengths.push(`Phát âm chuẩn ${goodWords.length}/${a.words.length} từ.`);
    }
    if (a.fluencyScore >= 80) strengths.push('Tốc độ và sự lưu loát rất tự nhiên.');
    if (a.completenessScore >= 90) strengths.push('Đọc đầy đủ gần như toàn bộ câu.');
    return strengths;
  }

  private errorTypeLabel(errorType: string): string {
    switch (errorType) {
      case 'Mispronunciation':
        return 'Phát âm sai';
      case 'Omission':
        return 'Bỏ sót từ';
      case 'Insertion':
        return 'Thêm từ thừa';
      case 'UnexpectedBreak':
        return 'Ngắt câu bất thường';
      case 'MissingBreak':
        return 'Thiếu ngắt câu';
      case 'Monotone':
        return 'Giọng đều đều';
      default:
        return errorType;
    }
  }

  private loadCredentials(): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as AzureSpeechCredentials;
      if (parsed.apiKey && parsed.region) {
        this.credentials.set(parsed);
      }
    } catch (err) {
      console.warn('[AzureSpeech] Could not load credentials', err);
    }
  }
}
