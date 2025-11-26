/**
 * Helper functions to decompress review data
 * Converts short keys back to full format
 */

import { ReviewData } from '../../models/review.model';

export class ReviewDecompressor {
  /**
   * Decompress ReviewData object
   */
  static decompress(compressed: any): ReviewData {
    return {
      easinessFactor: compressed.ef || 2.5,
      interval: compressed.iv || 0,
      nextReviewDate: new Date(compressed.nr),
      repetitionCount: compressed.rc || 0,
      lastReviewDate: new Date(compressed.lr),
      lastScore: compressed.ls || 0,
      incorrectSentenceIndices: compressed.is || []
    };
  }
}
