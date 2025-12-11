export enum AchievementType {
  MILESTONE = 'milestone',
  STREAK = 'streak',
  PERFORMANCE = 'performance',
  CATEGORY_MASTER = 'category-master'
}

export enum RarityLevel {
  COMMON = 'common',
  RARE = 'rare',
  EPIC = 'epic',
  LEGENDARY = 'legendary'
}

export enum RewardType {
  CREDITS = 'credits',
  THEME = 'theme',
  HINTS = 'hints',
  AVATAR_FRAME = 'avatar-frame'
}

export interface Reward {
  type: RewardType;
  value: number | string;
  description: string;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  type: AchievementType;
  rarity: RarityLevel;
  iconUrl: string;
  criteria: string[];
  tips?: string[];
  rewards: Reward[];
  unlocked: boolean;
  unlockedAt?: Date;
  progress?: AchievementProgress;
  rewardsClaimed?: boolean;
}

export interface AchievementProgress {
  achievementId: string;
  current: number;
  required: number;
  percentage: number;
  description: string;
  lastUpdated: Date;
}

export interface AchievementNotification {
  achievement: Achievement;
  name: string;
  rarity: RarityLevel;
  iconUrl: string;
  timestamp: Date;
}

export interface UserAchievementData {
  userId: string;
  unlockedAchievements: {
    achievementId: string;
    unlockedAt: Date;
    rewardsClaimed?: boolean;
  }[];
  progress: {
    [achievementId: string]: AchievementProgress;
  };
  lastEvaluated: Date;
}

// Milestone Achievements
export const MILESTONE_ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first-step',
    name: 'First Step',
    description: 'Complete your first exercise',
    type: AchievementType.MILESTONE,
    rarity: RarityLevel.COMMON,
    iconUrl: '/achievements/first-step.svg',
    criteria: ['Complete 1 exercise'],
    rewards: [
      { type: RewardType.CREDITS, value: 50, description: '50 Bonus Points' }
    ],
    unlocked: false
  },
  {
    id: 'getting-started',
    name: 'Getting Started',
    description: 'Complete 10 exercises',
    type: AchievementType.MILESTONE,
    rarity: RarityLevel.COMMON,
    iconUrl: '/achievements/getting-started.svg',
    criteria: ['Complete 10 exercises'],
    tips: ['Practice regularly to reach this milestone faster'],
    rewards: [
      { type: RewardType.CREDITS, value: 100, description: '100 Bonus Points' }
    ],
    unlocked: false
  },
  {
    id: 'dedicated-learner',
    name: 'Dedicated Learner',
    description: 'Complete 50 exercises',
    type: AchievementType.MILESTONE,
    rarity: RarityLevel.RARE,
    iconUrl: '/achievements/dedicated-learner.svg',
    criteria: ['Complete 50 exercises'],
    tips: ['Try exercises from different categories to diversify your learning'],
    rewards: [
      { type: RewardType.CREDITS, value: 100, description: '100 Bonus Points' },
      { type: RewardType.THEME, value: 'ocean-blue', description: 'Ocean Blue Theme' }
    ],
    unlocked: false
  },
  {
    id: 'master-student',
    name: 'Master Student',
    description: 'Complete 100 exercises',
    type: AchievementType.MILESTONE,
    rarity: RarityLevel.EPIC,
    iconUrl: '/achievements/master-student.svg',
    criteria: ['Complete 100 exercises'],
    rewards: [
      { type: RewardType.CREDITS, value: 300, description: '300 Bonus Points' },

    ],
    unlocked: false
  },
  {
    id: 'legend',
    name: 'Legend',
    description: 'Complete 500 exercises',
    type: AchievementType.MILESTONE,
    rarity: RarityLevel.LEGENDARY,
    iconUrl: '/achievements/legend.svg',
    criteria: ['Complete 500 exercises'],
    rewards: [
      { type: RewardType.CREDITS, value: 800, description: '800 Bonus Points' },
      { type: RewardType.AVATAR_FRAME, value: 'golden-frame', description: 'Golden Avatar Frame' }
    ],
    unlocked: false
  },
  {
    id: 'grand-master',
    name: 'Grand Master',
    description: 'Complete 1000 exercises',
    type: AchievementType.MILESTONE,
    rarity: RarityLevel.LEGENDARY,
    iconUrl: '/achievements/default.svg',
    criteria: ['Complete 1000 exercises'],
    tips: ['You are among the elite learners!'],
    rewards: [
      { type: RewardType.CREDITS, value: 1000, description: '1000 Bonus Points' },
      { type: RewardType.AVATAR_FRAME, value: 'crown-frame', description: 'Crown Avatar Frame' }
    ],
    unlocked: false
  },
  {
    id: 'centurion',
    name: 'Centurion',
    description: 'Complete 200 exercises',
    type: AchievementType.MILESTONE,
    rarity: RarityLevel.EPIC,
    iconUrl: '/achievements/default.svg',
    criteria: ['Complete 200 exercises'],
    rewards: [
      { type: RewardType.CREDITS, value: 300, description: '300 Bonus Points' }
    ],
    unlocked: false
  },
  {
    id: 'triple-threat',
    name: 'Triple Threat',
    description: 'Complete 300 exercises',
    type: AchievementType.MILESTONE,
    rarity: RarityLevel.EPIC,
    iconUrl: '/achievements/default.svg',
    criteria: ['Complete 300 exercises'],
    rewards: [
      { type: RewardType.CREDITS, value: 300, description: '300 Bonus Points' }
    ],
    unlocked: false
  },
  {
    id: 'eternal-learner',
    name: 'Eternal Learner',
    description: 'Complete 2000 exercises',
    type: AchievementType.MILESTONE,
    rarity: RarityLevel.LEGENDARY,
    iconUrl: '/achievements/default.svg',
    criteria: ['Complete 2000 exercises'],
    tips: ['An extraordinary milestone achieved by only the most dedicated'],
    rewards: [
      { type: RewardType.CREDITS, value: 1500, description: '1500 Bonus Points' },
      { type: RewardType.AVATAR_FRAME, value: 'eternal-frame', description: 'Eternal Avatar Frame' }
    ],
    unlocked: false
  },
  {
    id: 'half-century',
    name: 'Half Century',
    description: 'Complete 50 exercises in a single category',
    type: AchievementType.MILESTONE,
    rarity: RarityLevel.RARE,
    iconUrl: '/achievements/default.svg',
    criteria: ['Complete 50 exercises in any single category'],
    tips: ['Deep dive into your favorite topic'],
    rewards: [
      { type: RewardType.CREDITS, value: 100, description: '100 Bonus Points' }
    ],
    unlocked: false
  },
  {
    id: 'diversity-champion',
    name: 'Diversity Champion',
    description: 'Complete at least 10 exercises in each category',
    type: AchievementType.MILESTONE,
    rarity: RarityLevel.EPIC,
    iconUrl: '/achievements/default.svg',
    criteria: ['Complete 10+ exercises in all 8 categories'],
    tips: ['Broaden your knowledge across all topics'],
    rewards: [
      { type: RewardType.CREDITS, value: 300, description: '300 Bonus Points' },
      { type: RewardType.THEME, value: 'rainbow-theme', description: 'Rainbow Theme' }
    ],
    unlocked: false
  }
];

// Streak Achievements
export const STREAK_ACHIEVEMENTS: Achievement[] = [
  {
    id: 'week-warrior',
    name: 'Week Warrior',
    description: 'Practice for 7 consecutive days',
    type: AchievementType.STREAK,
    rarity: RarityLevel.RARE,
    iconUrl: '/achievements/week-warrior.svg',
    criteria: ['Complete at least 1 exercise per day for 7 consecutive days'],
    tips: ['Set a daily reminder to maintain your streak'],
    rewards: [
      { type: RewardType.CREDITS, value: 100, description: '100 Bonus Points' },
      { type: RewardType.THEME, value: 'fire-red', description: 'Fire Red Theme' }
    ],
    unlocked: false
  },
  {
    id: 'month-master',
    name: 'Month Master',
    description: 'Practice for 30 consecutive days',
    type: AchievementType.STREAK,
    rarity: RarityLevel.EPIC,
    iconUrl: '/achievements/month-master.svg',
    criteria: ['Complete at least 1 exercise per day for 30 consecutive days'],
    tips: ['Consistency is key - even one exercise per day counts!'],
    rewards: [
      { type: RewardType.CREDITS, value: 300, description: '300 Bonus Points' },

    ],
    unlocked: false
  },
  {
    id: 'unstoppable',
    name: 'Unstoppable',
    description: 'Practice for 100 consecutive days',
    type: AchievementType.STREAK,
    rarity: RarityLevel.LEGENDARY,
    iconUrl: '/achievements/unstoppable.svg',
    criteria: ['Complete at least 1 exercise per day for 100 consecutive days'],
    rewards: [
      { type: RewardType.CREDITS, value: 800, description: '800 Bonus Points' },
      { type: RewardType.AVATAR_FRAME, value: 'diamond-frame', description: 'Diamond Avatar Frame' }
    ],
    unlocked: false
  },
  {
    id: 'year-champion',
    name: 'Year Champion',
    description: 'Practice for 365 consecutive days',
    type: AchievementType.STREAK,
    rarity: RarityLevel.LEGENDARY,
    iconUrl: '/achievements/default.svg',
    criteria: ['Complete at least 1 exercise per day for 365 consecutive days'],
    tips: ['A full year of dedication - you are truly committed!'],
    rewards: [
      { type: RewardType.CREDITS, value: 1500, description: '1500 Bonus Points' },
      { type: RewardType.AVATAR_FRAME, value: 'platinum-frame', description: 'Platinum Avatar Frame' }
    ],
    unlocked: false
  },
  {
    id: 'weekend-warrior',
    name: 'Weekend Warrior',
    description: 'Complete exercises on 10 consecutive weekends',
    type: AchievementType.STREAK,
    rarity: RarityLevel.RARE,
    iconUrl: '/achievements/default.svg',
    criteria: ['Complete at least 1 exercise on Saturday or Sunday for 10 consecutive weekends'],
    tips: ['Make learning part of your weekend routine'],
    rewards: [
      { type: RewardType.CREDITS, value: 100, description: '100 Bonus Points' }
    ],
    unlocked: false
  },
  {
    id: 'biweekly-champion',
    name: 'Biweekly Champion',
    description: 'Practice for 14 consecutive days',
    type: AchievementType.STREAK,
    rarity: RarityLevel.RARE,
    iconUrl: '/achievements/default.svg',
    criteria: ['Complete at least 1 exercise per day for 14 consecutive days'],
    tips: ['Two weeks of consistency builds strong habits'],
    rewards: [
      { type: RewardType.CREDITS, value: 100, description: '100 Bonus Points' }
    ],
    unlocked: false
  },
  {
    id: 'quarter-year-master',
    name: 'Quarter Year Master',
    description: 'Practice for 90 consecutive days',
    type: AchievementType.STREAK,
    rarity: RarityLevel.EPIC,
    iconUrl: '/achievements/default.svg',
    criteria: ['Complete at least 1 exercise per day for 90 consecutive days'],
    tips: ['Three months of dedication - you are unstoppable!'],
    rewards: [
      { type: RewardType.CREDITS, value: 300, description: '300 Bonus Points' },
      { type: RewardType.AVATAR_FRAME, value: 'quarter-frame', description: 'Quarter Year Frame' }
    ],
    unlocked: false
  },
  {
    id: 'comeback-streak',
    name: 'Comeback Streak',
    description: 'Rebuild a 7-day streak after breaking one',
    type: AchievementType.STREAK,
    rarity: RarityLevel.RARE,
    iconUrl: '/achievements/default.svg',
    criteria: ['Achieve a 7-day streak after previously having a streak of 7+ days'],
    tips: ['Never give up - every day is a new opportunity'],
    rewards: [
      { type: RewardType.CREDITS, value: 100, description: '100 Bonus Points' }
    ],
    unlocked: false
  }
];

// Performance Achievements
export const PERFORMANCE_ACHIEVEMENTS: Achievement[] = [
  {
    id: 'perfect-score',
    name: 'Perfect Score',
    description: 'Achieve 100% accuracy on any exercise',
    type: AchievementType.PERFORMANCE,
    rarity: RarityLevel.RARE,
    iconUrl: '/achievements/perfect-score.svg',
    criteria: ['Complete an exercise with 100% accuracy'],
    tips: ['Take your time and review your translation before submitting'],
    rewards: [
      { type: RewardType.CREDITS, value: 100, description: '100 Bonus Points' },
      { type: RewardType.THEME, value: 'gold-star', description: 'Gold Star Theme' }
    ],
    unlocked: false
  },
  {
    id: 'grammar-guru',
    name: 'Grammar Guru',
    description: 'Complete an exercise with zero grammar errors',
    type: AchievementType.PERFORMANCE,
    rarity: RarityLevel.RARE,
    iconUrl: '/achievements/grammar-guru.svg',
    criteria: ['Complete an exercise with 0 grammar errors'],
    tips: ['Focus on sentence structure and verb tenses'],
    rewards: [
      { type: RewardType.CREDITS, value: 100, description: '100 Bonus Points' },
      { type: RewardType.THEME, value: 'emerald-green', description: 'Emerald Green Theme' }
    ],
    unlocked: false
  },
  {
    id: 'vocabulary-virtuoso',
    name: 'Vocabulary Virtuoso',
    description: 'Use advanced vocabulary in an Advanced exercise',
    type: AchievementType.PERFORMANCE,
    rarity: RarityLevel.EPIC,
    iconUrl: '/achievements/vocabulary-virtuoso.svg',
    criteria: [
      'Complete an Advanced level exercise',
      'Use at least 5 advanced vocabulary words as identified by AI feedback'
    ],
    tips: ['Read widely and incorporate sophisticated vocabulary in your translations'],
    rewards: [
      { type: RewardType.CREDITS, value: 250, description: '250 Bonus Points' },

    ],
    unlocked: false
  },
  {
    id: 'speed-demon',
    name: 'Speed Demon',
    description: 'Complete an exercise quickly with high accuracy',
    type: AchievementType.PERFORMANCE,
    rarity: RarityLevel.EPIC,
    iconUrl: '/achievements/speed-demon.svg',
    criteria: [
      'Complete an exercise in under 60 seconds',
      'Achieve a score above 90%'
    ],
    tips: ['Practice regularly to improve both speed and accuracy'],
    rewards: [
      { type: RewardType.CREDITS, value: 250, description: '250 Bonus Points' },

    ],
    unlocked: false
  },
  {
    id: 'perfectionist',
    name: 'Perfectionist',
    description: 'Achieve 100% accuracy on 10 exercises',
    type: AchievementType.PERFORMANCE,
    rarity: RarityLevel.EPIC,
    iconUrl: '/achievements/default.svg',
    criteria: ['Complete 10 exercises with 100% accuracy'],
    tips: ['Quality over quantity - take your time to perfect each translation'],
    rewards: [
      { type: RewardType.CREDITS, value: 300, description: '300 Bonus Points' },
      { type: RewardType.THEME, value: 'crystal-clear', description: 'Crystal Clear Theme' }
    ],
    unlocked: false
  },
  {
    id: 'flawless-master',
    name: 'Flawless Master',
    description: 'Achieve 100% accuracy on 50 exercises',
    type: AchievementType.PERFORMANCE,
    rarity: RarityLevel.LEGENDARY,
    iconUrl: '/achievements/default.svg',
    criteria: ['Complete 50 exercises with 100% accuracy'],
    tips: ['Absolute mastery requires dedication and attention to detail'],
    rewards: [
      { type: RewardType.CREDITS, value: 800, description: '800 Bonus Points' },
      { type: RewardType.AVATAR_FRAME, value: 'crystal-frame', description: 'Crystal Avatar Frame' }
    ],
    unlocked: false
  },
  {
    id: 'high-achiever',
    name: 'High Achiever',
    description: 'Maintain 90%+ average score across 50 exercises',
    type: AchievementType.PERFORMANCE,
    rarity: RarityLevel.EPIC,
    iconUrl: '/achievements/default.svg',
    criteria: ['Complete 50 exercises with an average score of 90% or higher'],
    tips: ['Consistency is key to maintaining high performance'],
    rewards: [
      { type: RewardType.CREDITS, value: 300, description: '300 Bonus Points' }
    ],
    unlocked: false
  },
  {
    id: 'elite-scholar',
    name: 'Elite Scholar',
    description: 'Maintain 95%+ average score across 200 exercises',
    type: AchievementType.PERFORMANCE,
    rarity: RarityLevel.LEGENDARY,
    iconUrl: '/achievements/default.svg',
    criteria: ['Complete 200 exercises with an average score of 95% or higher'],
    tips: ['Only the most dedicated learners achieve this level of excellence'],
    rewards: [
      { type: RewardType.CREDITS, value: 1000, description: '1000 Bonus Points' },
      { type: RewardType.AVATAR_FRAME, value: 'scholar-frame', description: 'Scholar Avatar Frame' }
    ],
    unlocked: false
  },
  {
    id: 'no-hints-hero',
    name: 'No Hints Hero',
    description: 'Complete 20 exercises without using any hints',
    type: AchievementType.PERFORMANCE,
    rarity: RarityLevel.RARE,
    iconUrl: '/achievements/default.svg',
    criteria: ['Complete 20 exercises without using hints', 'Achieve at least 80% accuracy on each'],
    tips: ['Challenge yourself to rely on your own knowledge'],
    rewards: [
      { type: RewardType.CREDITS, value: 200, description: '200 Bonus Points' }
    ],
    unlocked: false
  },
  {
    id: 'advanced-master',
    name: 'Advanced Master',
    description: 'Complete 50 Advanced level exercises',
    type: AchievementType.PERFORMANCE,
    rarity: RarityLevel.EPIC,
    iconUrl: '/achievements/default.svg',
    criteria: ['Complete 50 Advanced difficulty exercises', 'Maintain average score above 75%'],
    tips: ['Advanced exercises challenge your language mastery'],
    rewards: [
      { type: RewardType.CREDITS, value: 300, description: '300 Bonus Points' },
      { type: RewardType.THEME, value: 'advanced-gold', description: 'Advanced Gold Theme' }
    ],
    unlocked: false
  },
  {
    id: 'comeback-king',
    name: 'Comeback King',
    description: 'Improve a previous score by 30% or more',
    type: AchievementType.PERFORMANCE,
    rarity: RarityLevel.RARE,
    iconUrl: '/achievements/default.svg',
    criteria: ['Retry an exercise and improve your score by at least 30 points'],
    tips: ['Learning from mistakes is the path to mastery'],
    rewards: [
      { type: RewardType.CREDITS, value: 100, description: '100 Bonus Points' }
    ],
    unlocked: false
  },
  {
    id: 'marathon-runner',
    name: 'Marathon Runner',
    description: 'Complete 10 exercises in a single day',
    type: AchievementType.PERFORMANCE,
    rarity: RarityLevel.RARE,
    iconUrl: '/achievements/default.svg',
    criteria: ['Complete 10 or more exercises in one day'],
    tips: ['Intensive practice sessions can accelerate your learning'],
    rewards: [
      { type: RewardType.CREDITS, value: 100, description: '100 Bonus Points' }
    ],
    unlocked: false
  },
  {
    id: 'ultra-marathon',
    name: 'Ultra Marathon',
    description: 'Complete 25 exercises in a single day',
    type: AchievementType.PERFORMANCE,
    rarity: RarityLevel.EPIC,
    iconUrl: '/achievements/default.svg',
    criteria: ['Complete 25 or more exercises in one day'],
    tips: ['An incredible feat of dedication and endurance!'],
    rewards: [
      { type: RewardType.CREDITS, value: 300, description: '300 Bonus Points' },
      { type: RewardType.AVATAR_FRAME, value: 'marathon-frame', description: 'Marathon Avatar Frame' }
    ],
    unlocked: false
  },
  {
    id: 'early-bird',
    name: 'Early Bird',
    description: 'Complete exercises before 8 AM on 10 different days',
    type: AchievementType.PERFORMANCE,
    rarity: RarityLevel.RARE,
    iconUrl: '/achievements/default.svg',
    criteria: ['Complete at least 1 exercise before 8:00 AM on 10 different days'],
    tips: ['Start your day with learning for maximum retention'],
    rewards: [
      { type: RewardType.CREDITS, value: 100, description: '100 Bonus Points' }
    ],
    unlocked: false
  },
  {
    id: 'night-owl',
    name: 'Night Owl',
    description: 'Complete exercises after 10 PM on 10 different days',
    type: AchievementType.PERFORMANCE,
    rarity: RarityLevel.RARE,
    iconUrl: '/achievements/default.svg',
    criteria: ['Complete at least 1 exercise after 10:00 PM on 10 different days'],
    tips: ['Late night study sessions can be productive too'],
    rewards: [
      { type: RewardType.CREDITS, value: 100, description: '100 Bonus Points' }
    ],
    unlocked: false
  },
  {
    id: 'consistency-king',
    name: 'Consistency King',
    description: 'Score 85%+ on 20 consecutive exercises',
    type: AchievementType.PERFORMANCE,
    rarity: RarityLevel.EPIC,
    iconUrl: '/achievements/default.svg',
    criteria: ['Achieve 85% or higher accuracy on 20 exercises in a row'],
    tips: ['Maintain your focus and quality across multiple exercises'],
    rewards: [
      { type: RewardType.CREDITS, value: 300, description: '300 Bonus Points' },
      { type: RewardType.THEME, value: 'consistency-blue', description: 'Consistency Blue Theme' }
    ],
    unlocked: false
  },
  {
    id: 'rapid-learner',
    name: 'Rapid Learner',
    description: 'Complete 5 exercises in under 30 minutes',
    type: AchievementType.PERFORMANCE,
    rarity: RarityLevel.RARE,
    iconUrl: '/achievements/default.svg',
    criteria: ['Complete 5 exercises within 30 minutes', 'Maintain 80%+ average accuracy'],
    tips: ['Speed and accuracy combined show true mastery'],
    rewards: [
      { type: RewardType.CREDITS, value: 100, description: '100 Bonus Points' }
    ],
    unlocked: false
  },
  {
    id: 'error-free-streak',
    name: 'Error-Free Streak',
    description: 'Complete 5 exercises in a row with no grammar errors',
    type: AchievementType.PERFORMANCE,
    rarity: RarityLevel.EPIC,
    iconUrl: '/achievements/default.svg',
    criteria: ['Complete 5 consecutive exercises with 0 grammar errors', 'Score 85%+ on each'],
    tips: ['Perfect grammar requires careful attention to detail'],
    rewards: [
      { type: RewardType.CREDITS, value: 300, description: '300 Bonus Points' }
    ],
    unlocked: false
  },
  {
    id: 'improvement-master',
    name: 'Improvement Master',
    description: 'Improve scores on 10 different retried exercises',
    type: AchievementType.PERFORMANCE,
    rarity: RarityLevel.RARE,
    iconUrl: '/achievements/default.svg',
    criteria: ['Retry and improve your score on 10 different exercises'],
    tips: ['Learning from mistakes is the key to growth'],
    rewards: [
      { type: RewardType.CREDITS, value: 100, description: '100 Bonus Points' }
    ],
    unlocked: false
  }
];

// Category Master Achievement Template
const createCategoryMasterAchievement = (
  category: string,
  displayName: string
): Achievement => ({
  id: `master-${category}`,
  name: `${displayName} Master`,
  description: `Master the ${displayName} category`,
  type: AchievementType.CATEGORY_MASTER,
  rarity: RarityLevel.RARE,
  iconUrl: `/achievements/default.svg`,
  criteria: [
    `Complete at least 150 exercises in the ${displayName} category`
  ],
  tips: [`Focus on this category to improve your mastery`],
  rewards: [
    { type: RewardType.CREDITS, value: 100, description: '100 Bonus Points' }
  ],
  unlocked: false
});

// Export template for dynamic category generation
export const CATEGORY_MASTER_TEMPLATE: Omit<Achievement, 'id' | 'name' | 'description' | 'iconUrl' | 'criteria'> = {
  type: AchievementType.CATEGORY_MASTER,
  rarity: RarityLevel.RARE,
  tips: ['Focus on this category to improve your mastery'],
  rewards: [
    { type: RewardType.CREDITS, value: 100, description: '100 Bonus Points' }
  ],
  unlocked: false
};

// Category Master Achievements (8 categories from ExerciseCategory enum)
export const CATEGORY_MASTER_ACHIEVEMENTS: Achievement[] = [
  createCategoryMasterAchievement('daily-life', 'Daily Life'),
  createCategoryMasterAchievement('travel-transportation', 'Travel & Transportation'),
  createCategoryMasterAchievement('education-work', 'Education & Work'),
  createCategoryMasterAchievement('health-wellness', 'Health & Wellness'),
  createCategoryMasterAchievement('society-services', 'Society & Services'),
  createCategoryMasterAchievement('culture-arts', 'Culture & Arts'),
  createCategoryMasterAchievement('science-environment', 'Science & Environment'),
  createCategoryMasterAchievement('philosophy-beliefs', 'Philosophy & Beliefs')
];

// Special Category Master Achievements
export const SPECIAL_CATEGORY_ACHIEVEMENTS: Achievement[] = [
  {
    id: 'triple-category-master',
    name: 'Triple Category Master',
    description: 'Master any 3 categories',
    type: AchievementType.CATEGORY_MASTER,
    rarity: RarityLevel.EPIC,
    iconUrl: '/achievements/default.svg',
    criteria: ['Unlock 3 category master badges'],
    tips: ['Focus on mastering multiple areas of expertise'],
    rewards: [
      { type: RewardType.CREDITS, value: 300, description: '300 Bonus Points' }
    ],
    unlocked: false
  },
  {
    id: 'half-master',
    name: 'Half Master',
    description: 'Master half of all categories',
    type: AchievementType.CATEGORY_MASTER,
    rarity: RarityLevel.EPIC,
    iconUrl: '/achievements/default.svg',
    criteria: ['Unlock 4 category master badges'],
    tips: ['You are halfway to ultimate mastery!'],
    rewards: [
      { type: RewardType.CREDITS, value: 300, description: '300 Bonus Points' },
      { type: RewardType.THEME, value: 'half-master-theme', description: 'Half Master Theme' }
    ],
    unlocked: false
  },
  {
    id: 'category-perfectionist',
    name: 'Category Perfectionist',
    description: 'Achieve 95%+ average in any category',
    type: AchievementType.CATEGORY_MASTER,
    rarity: RarityLevel.EPIC,
    iconUrl: '/achievements/default.svg',
    criteria: ['Complete 100+ exercises in a category with 95%+ average score'],
    tips: ['Perfect mastery of a single domain'],
    rewards: [
      { type: RewardType.CREDITS, value: 300, description: '300 Bonus Points' }
    ],
    unlocked: false
  }
];

// Ultimate Master Achievement
export const ULTIMATE_MASTER_ACHIEVEMENT: Achievement = {
  id: 'ultimate-master',
  name: 'Ultimate Master',
  description: 'Achieve master status in all categories',
  type: AchievementType.CATEGORY_MASTER,
  rarity: RarityLevel.LEGENDARY,
  iconUrl: '/achievements/ultimate-master.svg',
  criteria: ['Unlock all category master badges'],
  rewards: [
    { type: RewardType.CREDITS, value: 1000, description: '1000 Bonus Points' },
    { type: RewardType.AVATAR_FRAME, value: 'rainbow-frame', description: 'Rainbow Avatar Frame' }
  ],
  unlocked: false
};

// Export as ULTIMATE_MASTER for consistency with service
export const ULTIMATE_MASTER = ULTIMATE_MASTER_ACHIEVEMENT;

// All Achievements Combined
export const ALL_ACHIEVEMENTS: Achievement[] = [
  ...MILESTONE_ACHIEVEMENTS,
  ...STREAK_ACHIEVEMENTS,
  ...PERFORMANCE_ACHIEVEMENTS,
  ...CATEGORY_MASTER_ACHIEVEMENTS,
  ...SPECIAL_CATEGORY_ACHIEVEMENTS,
  ULTIMATE_MASTER_ACHIEVEMENT
];
