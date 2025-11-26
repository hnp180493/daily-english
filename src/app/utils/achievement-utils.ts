/**
 * Achievement Utilities
 * Pure utility functions for achievement evaluation and progress tracking
 */

import { ExerciseAttempt } from '../models/exercise.model';
import { DIFFICULTY_LEVELS } from '../models/achievement-config';

/**
 * Extract category from exercise ID
 * Format: category-level-number (e.g., 'daily-life-beginner-1')
 */
export function extractCategoryFromExerciseId(exerciseId: string): string | null {
  if (!exerciseId || typeof exerciseId !== 'string') return null;

  const parts = exerciseId.split('-');
  if (parts.length < 3) return null;

  // Find the index of difficulty level
  let difficultyIndex = -1;
  for (let i = 0; i < parts.length; i++) {
    if (DIFFICULTY_LEVELS.includes(parts[i].toLowerCase() as any)) {
      difficultyIndex = i;
      break;
    }
  }

  if (difficultyIndex > 0) {
    // Category is everything before the difficulty level
    return parts.slice(0, difficultyIndex).join('-');
  }

  // Fallback: assume last 2 parts are level and number
  return parts.slice(0, -2).join('-');
}

/**
 * Get date string in YYYY-MM-DD format (local timezone)
 */
export function getDateString(date: Date): string {
  if (!date || isNaN(date.getTime())) {
    date = new Date();
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

/**
 * Check if two dates are the same day
 */
export function isSameDay(date1: Date, date2: Date): boolean {
  return getDateString(date1) === getDateString(date2);
}

/**
 * Check if date2 is the day after date1
 */
export function isConsecutiveDay(date1: Date, date2: Date): boolean {
  const nextDay = new Date(date1);
  nextDay.setDate(nextDay.getDate() + 1);
  return isSameDay(nextDay, date2);
}

/**
 * Calculate average score from attempts
 */
export function calculateAverageScore(attempts: ExerciseAttempt[]): number {
  if (!attempts || attempts.length === 0) return 0;

  const validAttempts = attempts.filter(
    (a) => a && typeof a.accuracyScore === 'number'
  );
  if (validAttempts.length === 0) return 0;

  const sum = validAttempts.reduce((acc, a) => acc + a.accuracyScore, 0);
  return sum / validAttempts.length;
}

/**
 * Get scores for a specific category
 */
export function getScoresForCategory(
  attempts: ExerciseAttempt[],
  category: string
): number[] {
  if (!attempts || !category) return [];

  return attempts
    .filter((a) => {
      if (!a) return false;
      const attemptCategory =
        a.category || extractCategoryFromExerciseId(a.exerciseId);
      return attemptCategory === category;
    })
    .map((a) => a.accuracyScore)
    .filter((score) => typeof score === 'number');
}

/**
 * Group attempts by category
 */
export function groupAttemptsByCategory(
  attempts: ExerciseAttempt[]
): Map<string, ExerciseAttempt[]> {
  const groups = new Map<string, ExerciseAttempt[]>();

  if (!attempts) return groups;

  attempts.forEach((attempt) => {
    if (!attempt) return;

    const category =
      attempt.category || extractCategoryFromExerciseId(attempt.exerciseId);
    if (!category) return;

    if (!groups.has(category)) {
      groups.set(category, []);
    }
    groups.get(category)!.push(attempt);
  });

  return groups;
}

/**
 * Group attempts by date (YYYY-MM-DD)
 */
export function groupAttemptsByDate(
  attempts: ExerciseAttempt[]
): Map<string, ExerciseAttempt[]> {
  const groups = new Map<string, ExerciseAttempt[]>();

  if (!attempts) return groups;

  attempts.forEach((attempt) => {
    if (!attempt || !attempt.timestamp) return;

    const attemptDate = new Date(attempt.timestamp);
    if (isNaN(attemptDate.getTime())) return;

    const dateKey = getDateString(attemptDate);

    if (!groups.has(dateKey)) {
      groups.set(dateKey, []);
    }
    groups.get(dateKey)!.push(attempt);
  });

  return groups;
}

/**
 * Group attempts by exercise ID
 */
export function groupAttemptsByExercise(
  attempts: ExerciseAttempt[]
): Map<string, ExerciseAttempt[]> {
  const groups = new Map<string, ExerciseAttempt[]>();

  if (!attempts) return groups;

  attempts.forEach((attempt) => {
    if (!attempt || !attempt.exerciseId) return;

    if (!groups.has(attempt.exerciseId)) {
      groups.set(attempt.exerciseId, []);
    }
    groups.get(attempt.exerciseId)!.push(attempt);
  });

  return groups;
}

/**
 * Check if attempt is valid
 */
export function isValidAttempt(attempt: ExerciseAttempt): boolean {
  return (
    attempt !== null &&
    attempt !== undefined &&
    typeof attempt === 'object' &&
    typeof attempt.exerciseId === 'string' &&
    typeof attempt.accuracyScore === 'number'
  );
}

/**
 * Check if attempt has valid score
 */
export function hasValidScore(attempt: ExerciseAttempt): boolean {
  return (
    isValidAttempt(attempt) &&
    typeof attempt.accuracyScore === 'number' &&
    attempt.accuracyScore >= 0 &&
    attempt.accuracyScore <= 100
  );
}

/**
 * Count attempts with perfect score (100%)
 */
export function countPerfectScores(attempts: ExerciseAttempt[]): number {
  if (!attempts) return 0;
  return attempts.filter(
    (a) => a && typeof a.accuracyScore === 'number' && a.accuracyScore === 100
  ).length;
}

/**
 * Count grammar errors in attempt
 */
export function countGrammarErrors(attempt: ExerciseAttempt): number {
  if (!attempt || !attempt.sentenceAttempts || !Array.isArray(attempt.sentenceAttempts)) {
    return 0;
  }
  let count = 0;
  attempt.sentenceAttempts.forEach((sa) => {
    if (sa.feedback && Array.isArray(sa.feedback)) {
      count += sa.feedback.filter((f) => f && f.type === 'grammar').length;
    }
  });
  return count;
}

/**
 * Check if attempt has advanced vocabulary
 */
export function hasAdvancedVocabulary(attempt: ExerciseAttempt): boolean {
  if (!attempt || !attempt.sentenceAttempts || !Array.isArray(attempt.sentenceAttempts)) {
    return false;
  }
  return attempt.sentenceAttempts.some((sa) =>
    sa.feedback && Array.isArray(sa.feedback) && sa.feedback.some(
      (f) =>
        f &&
        f.type === 'vocabulary' &&
        f.explanation &&
        f.explanation.toLowerCase().includes('advanced')
    )
  );
}

/**
 * Get unique dates from attempts (sorted descending)
 */
export function getUniqueDates(attempts: ExerciseAttempt[]): string[] {
  if (!attempts) return [];

  const dates = new Set<string>();
  attempts.forEach((a) => {
    if (!a || !a.timestamp) return;
    const attemptDate = new Date(a.timestamp);
    if (!isNaN(attemptDate.getTime())) {
      dates.add(getDateString(attemptDate));
    }
  });

  return Array.from(dates).sort((a, b) => b.localeCompare(a));
}

/**
 * Count daily exercises for a specific date
 */
export function countDailyExercises(
  attempts: ExerciseAttempt[],
  dateString: string
): number {
  if (!attempts) return 0;

  return attempts.filter((a) => {
    if (!a || !a.timestamp) return false;
    const attemptDate = new Date(a.timestamp);
    return !isNaN(attemptDate.getTime()) && getDateString(attemptDate) === dateString;
  }).length;
}
