import { ReviewSchedule } from '../models/review.model';

/**
 * Spaced Repetition Algorithm Implementation (SM-2)
 *
 * This utility implements the SuperMemo 2 (SM-2) algorithm for optimal review scheduling.
 * The algorithm adjusts review intervals based on user performance to maximize retention.
 *
 * Key Concepts:
 * - Easiness Factor (EF): Multiplier that determines how quickly intervals grow (default: 2.5)
 * - Interval: Number of days until the next review
 * - Performance Grade: Score from 1-5 based on user performance
 *
 * Interval Progression: 1 day → 3 days → 7 days → 14 days → 30 days
 */

/**
 * Performance grade thresholds based on percentage scores
 */
const PERFORMANCE_THRESHOLDS = {
  PERFECT: 95, // Grade 5
  GOOD: 85, // Grade 4
  PASS: 75, // Grade 3
  FAIL: 60, // Grade 2
  // Below 60 is Grade 1 (Poor)
} as const;

/**
 * Default values for the SM-2 algorithm
 */
const DEFAULTS = {
  EASINESS_FACTOR: 2.5,
  MIN_EASINESS_FACTOR: 1.3,
  INITIAL_INTERVAL: 1,
  SECOND_INTERVAL: 3,
} as const;

/**
 * Maps a percentage score to a performance grade (1-5)
 *
 * Grade 5 (Perfect): score ≥ 95%
 * Grade 4 (Good): score ≥ 85%
 * Grade 3 (Pass): score ≥ 75%
 * Grade 2 (Fail): score ≥ 60%
 * Grade 1 (Poor): score < 60%
 *
 * @param score - Performance score as a percentage (0-100)
 * @returns Performance grade (1-5)
 * @throws Error if score is not between 0 and 100
 */
export function getPerformanceGrade(score: number): number {
  if (score < 0 || score > 100) {
    throw new Error(`Invalid score: ${score}. Score must be between 0 and 100.`);
  }

  if (score >= PERFORMANCE_THRESHOLDS.PERFECT) return 5;
  if (score >= PERFORMANCE_THRESHOLDS.GOOD) return 4;
  if (score >= PERFORMANCE_THRESHOLDS.PASS) return 3;
  if (score >= PERFORMANCE_THRESHOLDS.FAIL) return 2;
  return 1;
}

/**
 * Adjusts the easiness factor based on performance grade using the SM-2 formula
 *
 * Formula: EF' = EF + (0.1 - (5 - grade) * (0.08 + (5 - grade) * 0.02))
 *
 * The easiness factor determines how quickly review intervals grow.
 * Better performance increases EF, making intervals grow faster.
 * Poor performance decreases EF, making intervals grow slower.
 *
 * @param currentEF - Current easiness factor
 * @param grade - Performance grade (1-5)
 * @returns Adjusted easiness factor (minimum 1.3)
 * @throws Error if grade is not between 1 and 5
 * @throws Error if currentEF is less than 1.3
 */
export function adjustEasinessFactor(currentEF: number, grade: number): number {
  if (grade < 1 || grade > 5) {
    throw new Error(`Invalid grade: ${grade}. Grade must be between 1 and 5.`);
  }

  if (currentEF < DEFAULTS.MIN_EASINESS_FACTOR) {
    throw new Error(
      `Invalid easiness factor: ${currentEF}. Must be at least ${DEFAULTS.MIN_EASINESS_FACTOR}.`
    );
  }

  // SM-2 formula for adjusting easiness factor
  const adjustment = 0.1 - (5 - grade) * (0.08 + (5 - grade) * 0.02);
  const newEF = currentEF + adjustment;

  // Ensure EF doesn't go below minimum threshold
  return Math.max(newEF, DEFAULTS.MIN_EASINESS_FACTOR);
}

/**
 * Calculates the next review interval based on current interval, easiness factor, and performance
 *
 * Algorithm:
 * - If grade < 3 (failed): Reset to 1 day
 * - First review (interval = 0): Set to 1 day
 * - Second review (interval = 1): Set to 3 days
 * - Subsequent reviews: interval = previous_interval * easiness_factor
 *
 * @param currentInterval - Current interval in days (0 for first review)
 * @param easinessFactor - Current easiness factor
 * @param performanceScore - Performance score as a percentage (0-100)
 * @returns Next interval in days
 * @throws Error if currentInterval is negative
 * @throws Error if easinessFactor is less than 1.3
 * @throws Error if performanceScore is not between 0 and 100
 */
function calculateInterval(
  currentInterval: number,
  easinessFactor: number,
  performanceScore: number
): number {
  if (currentInterval < 0) {
    throw new Error(`Invalid interval: ${currentInterval}. Interval cannot be negative.`);
  }

  if (easinessFactor < DEFAULTS.MIN_EASINESS_FACTOR) {
    throw new Error(
      `Invalid easiness factor: ${easinessFactor}. Must be at least ${DEFAULTS.MIN_EASINESS_FACTOR}.`
    );
  }

  const grade = getPerformanceGrade(performanceScore);

  // If performance is poor (grade < 3), reset to initial interval
  if (grade < 3) {
    return DEFAULTS.INITIAL_INTERVAL;
  }

  // First review
  if (currentInterval === 0) {
    return DEFAULTS.INITIAL_INTERVAL;
  }

  // Second review
  if (currentInterval === DEFAULTS.INITIAL_INTERVAL) {
    return DEFAULTS.SECOND_INTERVAL;
  }

  // Subsequent reviews: multiply by easiness factor
  const nextInterval = Math.round(currentInterval * easinessFactor);

  // Cap at 30 days maximum
  return Math.min(nextInterval, 30);
}

/**
 * Calculates the next review schedule based on current state and performance
 *
 * This is the main entry point for the spaced repetition algorithm.
 * It combines interval calculation and easiness factor adjustment to determine
 * when the next review should occur.
 *
 * @param currentInterval - Current interval in days (0 for first review)
 * @param easinessFactor - Current easiness factor (default: 2.5)
 * @param performanceScore - Performance score as a percentage (0-100)
 * @returns ReviewSchedule with next review date, interval, and adjusted easiness factor
 * @throws Error if any input parameters are invalid
 */
export function calculateNextInterval(
  currentInterval: number,
  easinessFactor: number,
  performanceScore: number
): ReviewSchedule {
  // Validate inputs
  if (currentInterval < 0) {
    throw new Error(`Invalid interval: ${currentInterval}. Interval cannot be negative.`);
  }

  if (easinessFactor < DEFAULTS.MIN_EASINESS_FACTOR) {
    throw new Error(
      `Invalid easiness factor: ${easinessFactor}. Must be at least ${DEFAULTS.MIN_EASINESS_FACTOR}.`
    );
  }

  if (performanceScore < 0 || performanceScore > 100) {
    throw new Error(
      `Invalid score: ${performanceScore}. Score must be between 0 and 100.`
    );
  }

  // Calculate performance grade
  const grade = getPerformanceGrade(performanceScore);

  // Adjust easiness factor based on performance
  const newEasinessFactor = adjustEasinessFactor(easinessFactor, grade);

  // Calculate next interval
  const nextInterval = calculateInterval(currentInterval, newEasinessFactor, performanceScore);

  // Calculate next review date
  const nextReviewDate = new Date();
  nextReviewDate.setDate(nextReviewDate.getDate() + nextInterval);

  return {
    nextReviewDate,
    interval: nextInterval,
    easinessFactor: newEasinessFactor,
  };
}

/**
 * Creates an initial review schedule for a new exercise
 *
 * @param performanceScore - Initial performance score as a percentage (0-100)
 * @returns ReviewSchedule with default values and calculated first interval
 */
export function createInitialSchedule(performanceScore: number): ReviewSchedule {
  return calculateNextInterval(0, DEFAULTS.EASINESS_FACTOR, performanceScore);
}
