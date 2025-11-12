/**
 * Penalty scoring constants
 * These values determine how much score is deducted for incorrect attempts and retries
 */
export const PENALTY_CONSTANTS = {
  /** Points deducted per incorrect attempt (score < 90%) */
  INCORRECT_ATTEMPT_PENALTY: 4,
  
  /** Points deducted per retry */
  RETRY_PENALTY: 5
} as const;
