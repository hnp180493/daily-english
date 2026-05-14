import { Injectable, inject } from '@angular/core';
import { Observable, of } from 'rxjs';
import { Exercise } from '../../models/exercise.model';
import {
  PronunciationAttempt,
  PronunciationContext,
  PronunciationFeedback
} from '../../models/pronunciation.model';
import { AIUnifiedService } from '../ai/ai-unified.service';
import { ProgressService } from '../progress.service';
import { SpeechRecognitionService } from './speech-recognition.service';
import { WebSpeechAnalyzerService } from './web-speech-analyzer.service';

@Injectable({ providedIn: 'root' })
export class PronunciationPracticeService {
  private aiService = inject(AIUnifiedService);
  private progressService = inject(ProgressService);
  private webSpeechAnalyzer = inject(WebSpeechAnalyzerService);
  private speechRecognition = inject(SpeechRecognitionService);

  /**
   * Tách `englishText` thành mảng câu để luyện từng câu một.
   * Cách tách đơn giản theo dấu câu cuối câu, đủ dùng cho beta.
   */
  splitIntoSentences(englishText: string): string[] {
    if (!englishText) return [];
    return englishText
      .split(/(?<=[.!?])\s+/)
      .map(s => s.trim())
      .filter(s => s.length > 0);
  }

  buildContext(exercise: Exercise, expectedText: string): PronunciationContext {
    return {
      level: exercise.level,
      expectedText,
      translatedFromVietnamese: exercise.sourceText
    };
  }

  analyze(audioBlob: Blob, context: PronunciationContext): Observable<PronunciationFeedback> {
    return this.aiService.analyzePronunciation(audioBlob, context);
  }

  supportsAudio(): boolean {
    return this.aiService.supportsAudioInput();
  }

  /**
   * Web Speech (Tier 1) is available when the browser supports SpeechRecognition.
   * Used as a fallback when the active AI provider does not handle audio input.
   */
  supportsWebSpeechFallback(): boolean {
    return this.speechRecognition.isSupported();
  }

  analyzeTranscript(transcript: string, context: PronunciationContext, confidence = 0): Observable<PronunciationFeedback> {
    const feedback = this.webSpeechAnalyzer.analyze(transcript, context, confidence);
    return of(feedback);
  }

  saveAttempt(attempt: PronunciationAttempt): void {
    this.progressService.recordPronunciationAttempt(attempt);
  }

  getAttemptsForExercise(exerciseId: string): PronunciationAttempt[] {
    return this.progressService.getPronunciationAttemptsByExercise(exerciseId);
  }

  getAllAttempts(): PronunciationAttempt[] {
    return this.progressService.getPronunciationAttempts();
  }
}
