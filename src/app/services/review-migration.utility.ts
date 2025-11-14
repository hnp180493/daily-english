import { Observable, from, of, forkJoin } from 'rxjs';
import { map, switchMap, catchError, tap } from 'rxjs/operators';
import { ReviewData, ReviewDataWithMetadata } from '../models/review.model';
import { ExerciseAttempt, UserProgress } from '../models/exercise.model';
import * as SpacedRepetition from './spaced-repetition.algorithm';

/**
 * Utility for migrating existing exercise attempts to review data
 * This creates ReviewData entries from historical ExerciseAttempt data
 */
export class ReviewMigrationUtility {
  /**
   * Create ReviewData from an ExerciseAttempt
   * @param attempt The exercise attempt to convert
   * @param userId The user ID
   * @returns ReviewDataWithMetadata object initialized with attempt data
   */
  static createReviewDataFromAttempt(attempt: ExerciseAttempt, userId: string): ReviewDataWithMetadata {
    const now = new Date();
    const score = attempt.accuracyScore;

    // Calculate initial schedule based on last attempt score
    const schedule = SpacedRepetition.calculateNextInterval(
      0, // First review
      2.5, // Default easiness factor
      score
    );

    // Identify incorrect sentence indices
    const incorrectSentenceIndices: number[] = [];
    if (attempt.sentenceAttempts) {
      attempt.sentenceAttempts.forEach((sa, index) => {
        if (sa.accuracyScore < 75) {
          incorrectSentenceIndices.push(index);
        }
      });
    }

    return {
      exerciseId: attempt.exerciseId,
      userId,
      easinessFactor: schedule.easinessFactor,
      interval: schedule.interval,
      nextReviewDate: schedule.nextReviewDate,
      repetitionCount: attempt.attemptNumber || 1,
      lastReviewDate: new Date(attempt.timestamp),
      lastScore: score,
      incorrectSentenceIndices,
      createdAt: now,
      updatedAt: now
    };
  }

  /**
   * Migrate all exercise attempts from UserProgress to ReviewData
   * @param progress The user's progress data
   * @param userId The user ID
   * @returns Array of ReviewDataWithMetadata objects
   */
  static migrateProgressToReviewData(progress: UserProgress, userId: string): ReviewDataWithMetadata[] {
    const reviewDataList: ReviewDataWithMetadata[] = [];

    // Convert exerciseHistory to ReviewData
    Object.values(progress.exerciseHistory).forEach(attempt => {
      const reviewData = this.createReviewDataFromAttempt(attempt, userId);
      reviewDataList.push(reviewData);
    });

    console.log(`[ReviewMigration] Created ${reviewDataList.length} review data entries from exercise history`);
    return reviewDataList;
  }

  /**
   * Check if migration is needed
   * @param existingReviewData Existing review data from database
   * @param progress User progress data
   * @returns True if migration is needed
   */
  static isMigrationNeeded(existingReviewData: ReviewDataWithMetadata[], progress: UserProgress): boolean {
    // Migration no longer needed as exerciseHistory has been removed
    console.log('[ReviewMigration] No migration needed - exerciseHistory removed');
    return false;
  }

  /**
   * Log migration results
   * @param reviewDataList The migrated review data
   */
  static logMigrationResults(reviewDataList: ReviewDataWithMetadata[]): void {
    console.log('=== REVIEW DATA MIGRATION RESULTS ===');
    console.log(`Total exercises migrated: ${reviewDataList.length}`);
    
    // Group by urgency based on score
    const highUrgency = reviewDataList.filter(rd => rd.lastScore < 60).length;
    const mediumUrgency = reviewDataList.filter(rd => rd.lastScore >= 60 && rd.lastScore < 75).length;
    const lowUrgency = reviewDataList.filter(rd => rd.lastScore >= 75).length;
    
    console.log(`High urgency (score < 60%): ${highUrgency}`);
    console.log(`Medium urgency (score 60-75%): ${mediumUrgency}`);
    console.log(`Low urgency (score >= 75%): ${lowUrgency}`);
    
    // Show next review dates distribution
    const now = new Date();
    const dueNow = reviewDataList.filter(rd => rd.nextReviewDate <= now).length;
    const dueSoon = reviewDataList.filter(rd => {
      const daysDiff = (rd.nextReviewDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
      return daysDiff > 0 && daysDiff <= 7;
    }).length;
    
    console.log(`Due for review now: ${dueNow}`);
    console.log(`Due within 7 days: ${dueSoon}`);
    console.log('=== END MIGRATION RESULTS ===');
  }
}
