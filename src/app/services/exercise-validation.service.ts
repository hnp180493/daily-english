import { Injectable } from '@angular/core';
import { Exercise } from '../models/exercise.model';

@Injectable({
  providedIn: 'root'
})
export class ExerciseValidationService {
  addSmartPunctuation(userInput: string, originalSentence: string): string {
    const endsWithPunctuation = /[.!?,;:]$/.test(userInput);
    if (endsWithPunctuation) {
      return userInput;
    }

    const originalPunctuationMatch = originalSentence.match(/[.!?,;:]$/);
    if (originalPunctuationMatch) {
      const punctuation = originalPunctuationMatch[0];
      return userInput + punctuation;
    }

    return userInput + '.';
  }

  calculateExercisePoints(exercise: Exercise, attemptCount: number): number {
    let basePoints = 0;
    switch (exercise.level) {
      case 'beginner':
        basePoints = 50;
        break;
      case 'intermediate':
        basePoints = 100;
        break;
      case 'advanced':
        basePoints = 150;
        break;
    }

    if (attemptCount === 0) {
      return basePoints;
    }

    const reductionFactor = Math.pow(0.8, attemptCount);
    const minPoints = Math.floor(basePoints * 0.2);
    const calculatedPoints = Math.floor(basePoints * reductionFactor);

    return Math.max(calculatedPoints, minPoints);
  }

  calculateAverageAccuracy(accuracyScores: number[]): number {
    if (accuracyScores.length === 0) return 0;
    const total = accuracyScores.reduce((sum, score) => sum + score, 0);
    return Math.round(total / accuracyScores.length);
  }
}
