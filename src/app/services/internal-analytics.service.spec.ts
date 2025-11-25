import { TestBed } from '@angular/core/testing';
import { InternalAnalyticsService } from './internal-analytics.service';
import {
  UserProgress,
  ExerciseAttempt,
  DifficultyLevel,
  ExerciseCategory,
  FeedbackItem
} from '../models/exercise.model';

describe('InternalAnalyticsService', () => {
  let service: InternalAnalyticsService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(InternalAnalyticsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('computeAnalytics', () => {
    it('should return empty analytics for undefined progress', () => {
      const result = service.computeAnalytics(undefined);
      expect(result.totalExercises).toBe(0);
      expect(result.scoreTrends.dates.length).toBe(0);
    });

    it('should return empty analytics for progress with no attempts', () => {
      const emptyProgress: UserProgress = {
        attempts: [],
        totalCredits: 0,
        totalPoints: 0,
        lastActivityDate: new Date(),
        currentStreak: 0,
        lastStreakDate: '',
        achievements: []
      };
      const result = service.computeAnalytics(emptyProgress);
      expect(result.totalExercises).toBe(0);
    });

    it('should compute analytics for valid progress data', () => {
      const progress = createMockProgress();
      const result = service.computeAnalytics(progress);
      expect(result.totalExercises).toBe(3);
      expect(result.scoreTrends.dates.length).toBeGreaterThan(0);
    });
  });

  describe('computeScoreTrends', () => {
    it('should compute score trends for 30d time range', () => {
      const progress = createMockProgress();
      const result = service.computeScoreTrends(progress, '30d');
      expect(result.dates.length).toBe(3);
      expect(result.scores.length).toBe(3);
      expect(result.averageScore).toBeGreaterThan(0);
    });

    it('should filter by 7d time range', () => {
      const progress = createMockProgressWithOldAttempts();
      const result = service.computeScoreTrends(progress, '7d');
      expect(result.dates.length).toBeLessThan(progress.attempts.length);
    });

    it('should return all attempts for "all" time range', () => {
      const progress = createMockProgressWithOldAttempts();
      const result = service.computeScoreTrends(progress, 'all');
      expect(result.dates.length).toBe(progress.attempts.length);
    });

    it('should calculate correct average score', () => {
      const progress = createMockProgress();
      const result = service.computeScoreTrends(progress, '30d');
      const expectedAvg = (85 + 90 + 78) / 3;
      expect(result.averageScore).toBeCloseTo(expectedAvg, 1);
    });
  });

  describe('aggregateCategoryStats', () => {
    it('should count exercises by category', () => {
      const progress = createMockProgress();
      const result = service.aggregateCategoryStats(progress);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty('category');
      expect(result[0]).toHaveProperty('count');
    });

    it('should calculate percentages correctly', () => {
      const progress = createMockProgress();
      const result = service.aggregateCategoryStats(progress);
      const totalPercentage = result.reduce((sum, stat) => sum + stat.percentage, 0);
      expect(totalPercentage).toBeCloseTo(100, 0);
    });

    it('should sort by count descending', () => {
      const progress = createMockProgressWithMultipleCategories();
      const result = service.aggregateCategoryStats(progress);
      for (let i = 1; i < result.length; i++) {
        expect(result[i - 1].count).toBeGreaterThanOrEqual(result[i].count);
      }
    });
  });

  describe('analyzeDifficultyDistribution', () => {
    it('should count exercises by difficulty', () => {
      const progress = createMockProgress();
      const result = service.analyzeDifficultyDistribution(progress);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty('level');
      expect(result[0]).toHaveProperty('count');
    });

    it('should calculate percentages correctly', () => {
      const progress = createMockProgress();
      const result = service.analyzeDifficultyDistribution(progress);
      const totalPercentage = result.reduce((sum, stat) => sum + stat.percentage, 0);
      expect(totalPercentage).toBeCloseTo(100, 0);
    });
  });

  describe('extractTopErrors', () => {
    it('should extract and rank errors', () => {
      const progress = createMockProgressWithErrors();
      const result = service.extractTopErrors(progress);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty('type');
      expect(result[0]).toHaveProperty('count');
    });

    it('should return empty array when no errors', () => {
      const progress = createMockProgress();
      const result = service.extractTopErrors(progress);
      expect(result).toEqual([]);
    });

    it('should limit to top 5 errors', () => {
      const progress = createMockProgressWithManyErrors();
      const result = service.extractTopErrors(progress);
      expect(result.length).toBeLessThanOrEqual(5);
    });

    it('should sort errors by count descending', () => {
      const progress = createMockProgressWithErrors();
      const result = service.extractTopErrors(progress);
      for (let i = 1; i < result.length; i++) {
        expect(result[i - 1].count).toBeGreaterThanOrEqual(result[i].count);
      }
    });
  });

  describe('calculateCategoryAccuracy', () => {
    it('should calculate average score per category', () => {
      const progress = createMockProgress();
      const result = service.calculateCategoryAccuracy(progress);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty('avgScore');
      expect(result[0].avgScore).toBeGreaterThan(0);
    });

    it('should sort by avgScore descending', () => {
      const progress = createMockProgressWithMultipleCategories();
      const result = service.calculateCategoryAccuracy(progress);
      for (let i = 1; i < result.length; i++) {
        expect(result[i - 1].avgScore).toBeGreaterThanOrEqual(result[i].avgScore);
      }
    });
  });

  describe('computeDifficultyComparison', () => {
    it('should compute comparison for each difficulty level', () => {
      const progress = createMockProgress();
      const result = service.computeDifficultyComparison(progress);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty('avgScore');
      expect(result[0]).toHaveProperty('readyToAdvance');
    });

    it('should mark ready to advance when criteria met', () => {
      const progress = createMockProgressReadyToAdvance();
      const result = service.computeDifficultyComparison(progress);
      const beginnerLevel = result.find(r => r.level === DifficultyLevel.BEGINNER);
      expect(beginnerLevel?.readyToAdvance).toBe(true);
    });
  });

  describe('generateActivityHeatmap', () => {
    it('should generate 90 days of heatmap data', () => {
      const progress = createMockProgress();
      const result = service.generateActivityHeatmap(progress);
      const totalDays = result.heatmapData.reduce((sum, week) => sum + week.days.length, 0);
      expect(totalDays).toBeGreaterThan(0);
    });

    it('should calculate intensity levels correctly', () => {
      const progress = createMockProgress();
      const result = service.generateActivityHeatmap(progress);
      result.heatmapData.forEach(week => {
        week.days.forEach(day => {
          expect(day.intensity).toBeGreaterThanOrEqual(0);
          expect(day.intensity).toBeLessThanOrEqual(4);
        });
      });
    });

    it('should calculate current streak', () => {
      const progress = createMockProgressWithStreak();
      const result = service.generateActivityHeatmap(progress);
      expect(result.currentStreak).toBeGreaterThan(0);
    });

    it('should calculate longest streak', () => {
      const progress = createMockProgressWithStreak();
      const result = service.generateActivityHeatmap(progress);
      expect(result.longestStreak).toBeGreaterThanOrEqual(result.currentStreak);
    });
  });

  describe('extractVocabularyStats', () => {
    it('should extract vocabulary from attempts', () => {
      const progress = createMockProgressWithVocabulary();
      const result = service.extractVocabularyStats(progress);
      expect(result.totalWords).toBeGreaterThan(0);
    });

    it('should identify words needing review', () => {
      const progress = createMockProgressWithVocabulary();
      const result = service.extractVocabularyStats(progress);
      expect(result.wordsToReview).toBeGreaterThanOrEqual(0);
    });

    it('should generate word cloud data', () => {
      const progress = createMockProgressWithVocabulary();
      const result = service.extractVocabularyStats(progress);
      expect(result.wordCloud.length).toBeGreaterThan(0);
      result.wordCloud.forEach(word => {
        expect(word.size).toBeGreaterThan(0);
      });
    });
  });

  describe('exportProgressData', () => {
    it('should create export data structure', () => {
      const progress = createMockProgress();
      const analytics = service.computeAnalytics(progress);
      const result = service.exportProgressData(progress, analytics);
      
      expect(result.metadata).toBeDefined();
      expect(result.metadata.totalExercises).toBe(3);
      expect(result.analytics).toBeDefined();
      expect(result.rawProgress).toBeDefined();
    });

    it('should include metadata with timestamp', () => {
      const progress = createMockProgress();
      const analytics = service.computeAnalytics(progress);
      const result = service.exportProgressData(progress, analytics);
      
      expect(result.metadata.exportDate).toBeDefined();
      expect(result.metadata.appVersion).toBeDefined();
    });
  });
});

// Helper functions to create mock data
function createMockProgress(): UserProgress {
  return {
    attempts: [
      createMockAttempt('daily-life-beginner-1', 85, new Date()),
      createMockAttempt('travel-transportation-intermediate-1', 90, new Date()),
      createMockAttempt('education-work-advanced-1', 78, new Date())
    ],
    totalCredits: 10,
    totalPoints: 253,
    lastActivityDate: new Date(),
    currentStreak: 1,
    lastStreakDate: new Date().toISOString().split('T')[0],
    achievements: []
  };
}

function createMockProgressWithOldAttempts(): UserProgress {
  const now = new Date();
  const tenDaysAgo = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000);
  const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
  
  return {
    attempts: [
      createMockAttempt('daily-life-beginner-1', 85, tenDaysAgo),
      createMockAttempt('daily-life-beginner-2', 90, twoDaysAgo),
      createMockAttempt('daily-life-beginner-3', 78, now)
    ],
    totalCredits: 10,
    totalPoints: 253,
    lastActivityDate: now,
    currentStreak: 1,
    lastStreakDate: now.toISOString().split('T')[0],
    achievements: []
  };
}

function createMockProgressWithMultipleCategories(): UserProgress {
  return {
    attempts: [
      createMockAttempt('daily-life-beginner-1', 85, new Date()),
      createMockAttempt('daily-life-beginner-2', 90, new Date()),
      createMockAttempt('travel-transportation-intermediate-1', 78, new Date()),
      createMockAttempt('education-work-advanced-1', 92, new Date())
    ],
    totalCredits: 10,
    totalPoints: 345,
    lastActivityDate: new Date(),
    currentStreak: 1,
    lastStreakDate: new Date().toISOString().split('T')[0],
    achievements: []
  };
}

function createMockProgressWithErrors(): UserProgress {
  const feedback: FeedbackItem[] = [
    {
      type: 'grammar',
      originalText: 'test',
      suggestion: 'test',
      explanation: 'test',
      startIndex: 0,
      endIndex: 4
    },
    {
      type: 'vocabulary',
      originalText: 'test',
      suggestion: 'test',
      explanation: 'test',
      startIndex: 0,
      endIndex: 4
    }
  ];

  return {
    attempts: [
      { ...createMockAttempt('daily-life-beginner-1', 85, new Date()), feedback },
      { ...createMockAttempt('daily-life-beginner-2', 90, new Date()), feedback }
    ],
    totalCredits: 10,
    totalPoints: 175,
    lastActivityDate: new Date(),
    currentStreak: 1,
    lastStreakDate: new Date().toISOString().split('T')[0],
    achievements: []
  };
}

function createMockProgressWithManyErrors(): UserProgress {
  const feedback: FeedbackItem[] = [
    { type: 'grammar', originalText: 'test', suggestion: 'test', explanation: 'test', startIndex: 0, endIndex: 4 },
    { type: 'vocabulary', originalText: 'test', suggestion: 'test', explanation: 'test', startIndex: 0, endIndex: 4 },
    { type: 'structure', originalText: 'test', suggestion: 'test', explanation: 'test', startIndex: 0, endIndex: 4 },
    { type: 'spelling', originalText: 'test', suggestion: 'test', explanation: 'test', startIndex: 0, endIndex: 4 },
    { type: 'suggestion', originalText: 'test', suggestion: 'test', explanation: 'test', startIndex: 0, endIndex: 4 },
    { type: 'grammar', originalText: 'test', suggestion: 'test', explanation: 'test', startIndex: 0, endIndex: 4 }
  ];

  return {
    attempts: [
      { ...createMockAttempt('daily-life-beginner-1', 85, new Date()), feedback }
    ],
    totalCredits: 10,
    totalPoints: 85,
    lastActivityDate: new Date(),
    currentStreak: 1,
    lastStreakDate: new Date().toISOString().split('T')[0],
    achievements: []
  };
}

function createMockProgressReadyToAdvance(): UserProgress {
  const attempts: ExerciseAttempt[] = [];
  for (let i = 0; i < 12; i++) {
    attempts.push(createMockAttempt(`daily-life-beginner-${i}`, 90, new Date()));
  }
  
  return {
    attempts,
    totalCredits: 20,
    totalPoints: 1080,
    lastActivityDate: new Date(),
    currentStreak: 1,
    lastStreakDate: new Date().toISOString().split('T')[0],
    achievements: []
  };
}

function createMockProgressWithStreak(): UserProgress {
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
  
  return {
    attempts: [
      createMockAttempt('daily-life-beginner-1', 85, twoDaysAgo),
      createMockAttempt('daily-life-beginner-2', 90, yesterday),
      createMockAttempt('daily-life-beginner-3', 78, now)
    ],
    totalCredits: 10,
    totalPoints: 253,
    lastActivityDate: now,
    currentStreak: 3,
    lastStreakDate: now.toISOString().split('T')[0],
    achievements: []
  };
}

function createMockProgressWithVocabulary(): UserProgress {
  const feedback: FeedbackItem[] = [
    {
      type: 'vocabulary',
      originalText: 'test',
      suggestion: 'excellent wonderful amazing fantastic',
      explanation: 'test',
      startIndex: 0,
      endIndex: 4
    }
  ];

  return {
    attempts: [
      {
        ...createMockAttempt('daily-life-beginner-1', 85, new Date()),
        feedback,
        userInput: 'This is a wonderful example sentence with excellent vocabulary'
      }
    ],
    totalCredits: 10,
    totalPoints: 85,
    lastActivityDate: new Date(),
    currentStreak: 1,
    lastStreakDate: new Date().toISOString().split('T')[0],
    achievements: []
  };
}

function createMockAttempt(
  exerciseId: string,
  score: number,
  timestamp: Date
): ExerciseAttempt {
  return {
    exerciseId,
    attemptNumber: 1,
    userInput: 'Test input',
    accuracyScore: score,
    feedback: [],
    timestamp,
    hintsUsed: 0
  };
}
