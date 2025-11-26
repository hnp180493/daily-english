/**
 * Helper functions to compress review data
 * Converts full format to short keys to reduce database size
 */

import { ReviewData } from '../../models/review.model';

export class ReviewCompressor {
  /**
   * Compress ReviewData object
   */
  static compress(review: ReviewData): any {
    return {
      ef: review.easinessFactor,
      iv: review.interval,
      nr: review.nextReviewDate instanceof Date 
        ? review.nextReviewDate.toISOString() 
        : review.nextReviewDate,
      rc: review.repetitionCount,
      lr: review.lastReviewDate instanceof Date 
        ? review.lastReviewDate.toISOString() 
        : review.lastReviewDate,
      ls: review.lastScore,
      is: review.incorrectSentenceIndices || []
    };
  }

  /**
   * Check if data is in compressed format
   */
  static isCompressed(data: any): boolean {
    return data && typeof data === 'object' && 'ef' in data && 'iv' in data;
  }
}
