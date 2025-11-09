/**
 * Achievement Configuration
 * Centralized configuration for all achievement thresholds and criteria
 */

export const ACHIEVEMENT_THRESHOLDS = {
  milestone: {
    'first-step': 1,
    'getting-started': 10,
    'dedicated-learner': 50,
    'master-student': 100,
    'centurion': 200,
    'triple-threat': 300,
    'legend': 500,
    'grand-master': 1000,
    'eternal-learner': 2000,
    'half-century': 50,
    'diversity-champion': 80
  },
  streak: {
    'week-warrior': 7,
    'biweekly-champion': 14,
    'weekend-warrior': 14,
    'month-master': 30,
    'quarter-year-master': 90,
    'unstoppable': 100,
    'year-champion': 365,
    'comeback-streak': 7
  },
  performance: {
    'perfectionist': 10,
    'flawless-master': 50,
    'high-achiever': { exercises: 50, average: 90 },
    'elite-scholar': { exercises: 200, average: 95 },
    'no-hints-hero': { exercises: 20, minAccuracy: 80 },
    'advanced-master': { exercises: 50, minAccuracy: 75 },
    'comeback-king': { improvement: 30 },
    'marathon-runner': 10,
    'ultra-marathon': 25,
    'early-bird': 10,
    'night-owl': 10,
    'consistency-king': { exercises: 20, minAccuracy: 85 },
    'rapid-learner': { exercises: 5, minAccuracy: 80 },
    'error-free-streak': { exercises: 5, minAccuracy: 85 },
    'improvement-master': 10
  },
  category: {
    masterRequirement: 150,
    perfectAverageRequirement: 95,
    perfectMinExercises: 100,
    tripleMasterCount: 3,
    halfMasterCount: 4
  }
} as const;

export const ACHIEVEMENT_CATEGORIES = [
  'daily-life',
  'travel-transportation',
  'education-work',
  'health-wellness',
  'society-services',
  'culture-arts',
  'science-environment',
  'philosophy-beliefs'
] as const;

export const DIFFICULTY_LEVELS = ['beginner', 'intermediate', 'advanced'] as const;

export const PERFORMANCE_CRITERIA = {
  perfectScore: 100,
  highAccuracy: 90,
  goodAccuracy: 85,
  decentAccuracy: 80,
  earlyBirdHour: 8,
  nightOwlHour: 22
} as const;
