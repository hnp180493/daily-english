/**
 * Centralized localStorage keys for the application
 * Use these constants instead of hardcoded strings to ensure consistency
 * 
 * NAMING CONVENTION: All guest-specific keys use 'guest_' prefix
 * Example: guest_progress, guest_analytics, guest_favorites
 */

// Guest mode keys (prefix: guest_)
export const GUEST_PROGRESS_KEY = 'guest_progress';
export const GUEST_ANALYTICS_KEY = 'guest_analytics';
export const GUEST_LEARNING_PATH_KEY = 'guest_learning_path';
export const GUEST_FAVORITES_KEY = 'guest_favorites';
export const GUEST_ACHIEVEMENTS_KEY = 'guest_achievements';
export const GUEST_CUSTOM_EXERCISES_KEY = 'guest_custom_exercises';
export const GUEST_WEEKLY_GOALS_KEY = 'guest_weekly_goals'; // Array of all weekly goals
export const GUEST_DAILY_CHALLENGES_KEY = 'guest_daily_challenges'; // Array of all daily challenges

// App settings keys (shared between guest and authenticated users)
export const APP_SETTINGS_KEY = 'app_settings';
export const TTS_SETTINGS_KEY = 'tts_settings';
export const DICTATION_SETTINGS_KEY = 'dictation_settings';
export const NOTIFICATION_PREFERENCES_KEY = 'notification_preferences';
export const AI_CONFIG_KEY = 'ai_config';

// Vietnamese SEO tracking keys
export const VIETNAMESE_SEARCH_QUERIES_KEY = 'vietnamese_search_queries';
export const VIETNAMESE_SOCIAL_REFERRALS_KEY = 'vietnamese_social_referrals';

// Authenticated user key prefixes (used with userId)
export const USER_REWARDS_KEY_PREFIX = 'user_rewards_';
export const USER_PROGRESS_KEY_PREFIX = 'user_progress_';

/**
 * All guest storage keys that should be exported/imported
 */
export const GUEST_STORAGE_KEYS: readonly string[] = [
  // Guest-specific keys (guest_* prefix)
  GUEST_PROGRESS_KEY,
  GUEST_ANALYTICS_KEY,
  GUEST_LEARNING_PATH_KEY,
  GUEST_FAVORITES_KEY,
  GUEST_ACHIEVEMENTS_KEY,
  GUEST_CUSTOM_EXERCISES_KEY,
  GUEST_WEEKLY_GOALS_KEY,
  GUEST_DAILY_CHALLENGES_KEY,
  
  // Shared settings (not guest-specific)
  APP_SETTINGS_KEY,
  TTS_SETTINGS_KEY,
  DICTATION_SETTINGS_KEY,
  NOTIFICATION_PREFERENCES_KEY,
  AI_CONFIG_KEY
];

/**
 * Prefixes for app-specific localStorage keys
 */
export const APP_KEY_PREFIXES: readonly string[] = [
  'guest_',
  'user_',
  'exercise_',
  'custom_',
  'app_',
  'tts_',
  'dictation_',
  'notification_',
  'ai_',
  'vietnamese_'
];

/**
 * Prefixes to skip during export (browser/framework internal)
 */
export const SKIP_KEY_PREFIXES: readonly string[] = [
  'devtools',
  'debug',
  '__',
  'loglevel',
  'ng-',
  'angular-'
];

/**
 * Clear all guest-related data from localStorage
 * Dynamically removes all keys starting with 'guest_'
 */
export function clearAllGuestData(): void {
  try {
    const keysToRemove: string[] = [];
    
    // Find all keys starting with 'guest_'
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('guest_')) {
        keysToRemove.push(key);
      }
    }
    
    // Remove all guest keys
    keysToRemove.forEach(key => localStorage.removeItem(key));
    
    console.log(`[StorageKeys] Cleared ${keysToRemove.length} guest keys:`, keysToRemove);
  } catch (error) {
    console.error('[StorageKeys] Error clearing guest data:', error);
  }
}
