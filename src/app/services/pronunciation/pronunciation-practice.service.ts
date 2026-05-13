import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { Exercise } from '../../models/exercise.model';
import {
  PronunciationAttempt,
  PronunciationContext,
  PronunciationFeedback
} from '../../models/pronunciation.model';
import { AIUnifiedService } from '../ai/ai-unified.service';
import { ProgressService } from '../progress.service';

@Injectable({ providedIn: 'root' })
export class PronunciationPracticeService {
  private aiService = inject(AIUnifiedService);
  private progressService = inject(ProgressService);

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
