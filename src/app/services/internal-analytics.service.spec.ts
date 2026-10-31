import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { InternalAnalyticsService } from './internal-analytics.service';
import { ExerciseService } from './exercise.service';
import {
  UserProgress,
  ExerciseAttempt,
  DifficultyLevel,
  ExerciseCategory,
  FeedbackItem,
  SentenceAttempt
} from '../models/exercise.model';

describe('InternalAnalyticsService', () => {
  let service: InternalAnalyticsService;
  let exerciseService: jasmine.SpyObj<ExerciseService>;

  beforeEach(() => {
    exerciseService = jasmine.createSpyObj('ExerciseService', ['getExercisesByIds']);
    exerciseService.getExercisesByIds.and.returnValue(of([]));

    TestBed.configureTestingModule({
      providers: [{ provide: ExerciseService, useValue: exerciseService }]
    });
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
      const result = service.computeAnalytics(createProgress([]));
      expect(result.totalExercises).toBe(0);
    });

    it('should compute analytics for valid progress data', () => {
      const progress = createMockProgress();
      const result = service.computeAnalytics(progress);
      expect(result.totalExercises).toBe(3);
      expect(result.scoreTrends.dates.length).toBeGreaterThan(0);
      expect(result.categoryDistribution.length).toBe(3);
      expect(result.difficultyBreakdown.length).toBe(3);
    });

    it('should return cached result for identical progress and time range', () => {
      const progress = createMockProgress();
      const first = service.computeAnalytics(progress);
      const second = service.computeAnalytics(progress);
      expect(second).toBe(first);
    });
  });

  describe('computeAnalyticsAsync', () => {
    it('should enrich attempts with exercise metadata from ExerciseService', async () => {
      // Attempt has no category/level of its own; metadata must come from ExerciseService
      const attempt: ExerciseAttempt = {
        ...createMockAttempt('ex-1', 88, new Date()),
        category: undefined,
        level: undefined
      };
      exerciseService.getExercisesByIds.and.returnValue(of([
        { id: 'ex-1', category: ExerciseCategory.CULTURE_ARTS, level: DifficultyLevel.ADVANCED } as any
      ]));

      const result = await service.computeAnalyticsAsync(createProgress([attempt]));

      expect(exerciseService.getExercisesByIds).toHaveBeenCalledWith(['ex-1']);
      expect(result.categoryDistribution[0].category).toBe(ExerciseCategory.CULTURE_ARTS);
      expect(result.difficultyBreakdown[0].level).toBe(DifficultyLevel.ADVANCED);
    });

    it('should still compute analytics when metadata loading fails', async () => {
      spyOn(console, 'error');
      exerciseService.getExercisesByIds.and.returnValue(throwError(() => new Error('network')));

      const result = await service.computeAnalyticsAsync(createMockProgress());

      expect(console.error).toHaveBeenCalled();
      expect(result.totalExercises).toBe(3);
    });

    it('should return empty analytics for undefined progress', async () => {
      const result = await service.computeAnalyticsAsync(undefined);
      expect(result.totalExercises).toBe(0);
      expect(exerciseService.getExercisesByIds).not.toHaveBeenCalled();
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
      expect(result.dates.length).toBe(2);
    });

    it('should return all attempts for "all" time range', () => {
      const progress = createMockProgressWithOldAttempts();
      const result = service.computeScoreTrends(progress, 'all');
      expect(result.dates.length).toBe(Object.keys(progress.exerciseHistory).length);
    });

    it('should calculate correct average score', () => {
      const progress = createMockProgress();
      const result = service.computeScoreTrends(progress, '30d');
      const expectedAvg = (85 + 90 + 78) / 3;
      expect(result.averageScore).toBeCloseTo(expectedAvg, 1);
    });

    it('should sort scores chronologically', () => {
      const progress = createMockProgressWithOldAttempts();
      const result = service.computeScoreTrends(progress, 'all');
      expect(result.scores).toEqual([85, 90, 78]);
    });
  });

  describe('aggregateCategoryStats', () => {
    it('should count exercises by category', () => {
      const progress = createMockProgress();
      const result = service.aggregateCategoryStats(progress);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0].category).toBeDefined();
      expect(result[0].count).toBeDefined();
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
      expect(result[0].category).toBe(ExerciseCategory.DAILY_LIFE);
      for (let i = 1; i < result.length; i++) {
        expect(result[i - 1].count).toBeGreaterThanOrEqual(result[i].count);
      }
    });

    it('should ignore attempts without category information', () => {
      const attempt = { ...createMockAttempt('x', 80, new Date()), category: undefined };
      const result = service.aggregateCategoryStats(createProgress([attempt]));
      expect(result).toEqual([]);
    });
  });

  describe('analyzeDifficultyDistribution', () => {
    it('should count exercises by difficulty', () => {
      const progress = createMockProgress();
      const result = service.analyzeDifficultyDistribution(progress);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0].level).toBeDefined();
      expect(result[0].count).toBeDefined();
    });

    it('should calculate percentages correctly', () => {
      const progress = createMockProgress();
      const result = service.analyzeDifficultyDistribution(progress);
      const totalPercentage = result.reduce((sum, stat) => sum + stat.percentage, 0);
      expect(totalPercentage).toBeCloseTo(100, 0);
    });

    it('should sort by difficulty level order', () => {
      const progress = createMockProgress();
      const result = service.analyzeDifficultyDistribution(progress);
      expect(result.map(r => r.level)).toEqual([
        DifficultyLevel.BEGINNER,
        DifficultyLevel.INTERMEDIATE,
        DifficultyLevel.ADVANCED
      ]);
    });
  });

  describe('getExercisesNeedingReview', () => {
    it('should return exercises scoring below 80, lowest first', () => {
      const progress = createProgress([
        createMockAttempt('a', 70, new Date()),
        createMockAttempt('b', 95, new Date()),
        createMockAttempt('c', 50, new Date())
      ]);
      const result = service.getExercisesNeedingReview(progress);
      expect(result.map(r => r.exerciseId)).toEqual(['c', 'a']);
    });
  });

  describe('extractTopErrors', () => {
    it('should extract and rank errors', () => {
      const progress = createMockProgressWithErrors();
      const result = service.extractTopErrors(progress);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0].type).toBeDefined();
      expect(result[0].count).toBeDefined();
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
      const progress = createMockProgressWithManyErrors();
      const result = service.extractTopErrors(progress);
      expect(result[0].type).toBe('grammar');
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
      expect(result[0].avgScore).toBeDefined();
      expect(result[0].readyToAdvance).toBeDefined();
    });

    it('should mark ready to advance when criteria met', () => {
      const progress = createMockProgressReadyToAdvance();
      const result = service.computeDifficultyComparison(progress);
      const beginnerLevel = result.find(r => r.level === DifficultyLevel.BEGINNER);
      expect(beginnerLevel?.readyToAdvance).toBe(true);
      expect(beginnerLevel?.advancementProgress).toBe(100);
    });

    it('should not mark ready to advance with too few exercises', () => {
      const progress = createMockProgress();
      const result = service.computeDifficultyComparison(progress);
      result.forEach(r => expect(r.readyToAdvance).toBe(false));
    });
  });

  describe('generateActivityHeatmap', () => {
    it('should generate 90 days of heatmap data', () => {
      const progress = createMockProgress();
      const result = service.generateActivityHeatmap(progress);
      const totalDays = result.heatmapData.reduce((sum, week) => sum + week.days.length, 0);
      expect(totalDays).toBe(90);
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

    it('should use current streak from progress', () => {
      const progress = createMockProgressWithStreak();
      const result = service.generateActivityHeatmap(progress);
      expect(result.currentStreak).toBe(3);
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

    it('should identify words needing review from vocabulary feedback', () => {
      const progress = createMockProgressWithVocabulary();
      const result = service.extractVocabularyStats(progress);
      expect(result.wordsToReview).toBeGreaterThan(0);
      expect(result.reviewWords.map(w => w.text)).toContain('fantastic');
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
      expect(result.analytics).toBe(analytics);
      expect(result.rawProgress).toBe(progress);
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

const DAY_MS = 24 * 60 * 60 * 1000;

function createProgress(
  attempts: ExerciseAttempt[],
  overrides: Partial<UserProgress> = {}
): UserProgress {
  const exerciseHistory: { [id: string]: ExerciseAttempt } = {};
  attempts.forEach(a => (exerciseHistory[a.exerciseId] = a));
  const now = new Date();
  return {
    exerciseHistory,
    dictationHistory: {},
    totalPoints: 0,
    lastActivityDate: now,
    currentStreak: 1,
    longestStreak: 1,
    lastStreakDate: now.toISOString().split('T')[0],
    achievements: [],
    ...overrides
  };
}

function createMockAttempt(
  exerciseId: string,
  score: number,
  timestamp: Date,
  category: ExerciseCategory = ExerciseCategory.DAILY_LIFE,
  level: DifficultyLevel = DifficultyLevel.BEGINNER
): ExerciseAttempt {
  return {
    exerciseId,
    category,
    level,
    attemptNumber: 1,
    userInput: 'Test input',
    accuracyScore: score,
    timestamp,
    hintsUsed: 0,
    pointsEarned: 0
  };
}

function feedbackItem(type: FeedbackItem['type'], suggestion = 'test'): FeedbackItem {
  return { type, originalText: 'test', suggestion, explanation: 'test', startIndex: 0, endIndex: 4 };
}

function sentenceWithFeedback(feedback: FeedbackItem[], userInput = 'Test input', accuracyScore = 85): SentenceAttempt {
  return { sentenceIndex: 0, userInput, accuracyScore, feedback };
}

function createMockProgress(): UserProgress {
  return createProgress([
    createMockAttempt('daily-life-beginner-1', 85, new Date(), ExerciseCategory.DAILY_LIFE, DifficultyLevel.BEGINNER),
    createMockAttempt('travel-intermediate-1', 90, new Date(), ExerciseCategory.TRAVEL_TRANSPORTATION, DifficultyLevel.INTERMEDIATE),
    createMockAttempt('education-advanced-1', 78, new Date(), ExerciseCategory.EDUCATION_WORK, DifficultyLevel.ADVANCED)
  ]);
}

function createMockProgressWithOldAttempts(): UserProgress {
  const now = new Date();
  return createProgress([
    createMockAttempt('daily-life-beginner-1', 85, new Date(now.getTime() - 10 * DAY_MS)),
    createMockAttempt('daily-life-beginner-2', 90, new Date(now.getTime() - 2 * DAY_MS)),
    createMockAttempt('daily-life-beginner-3', 78, now)
  ]);
}

function createMockProgressWithMultipleCategories(): UserProgress {
  return createProgress([
    createMockAttempt('daily-life-beginner-1', 85, new Date(), ExerciseCategory.DAILY_LIFE),
    createMockAttempt('daily-life-beginner-2', 90, new Date(), ExerciseCategory.DAILY_LIFE),
    createMockAttempt('travel-intermediate-1', 78, new Date(), ExerciseCategory.TRAVEL_TRANSPORTATION, DifficultyLevel.INTERMEDIATE),
    createMockAttempt('education-advanced-1', 92, new Date(), ExerciseCategory.EDUCATION_WORK, DifficultyLevel.ADVANCED)
  ]);
}

function createMockProgressWithErrors(): UserProgress {
  const sentenceAttempts = [sentenceWithFeedback([feedbackItem('grammar'), feedbackItem('vocabulary')])];
  return createProgress([
    { ...createMockAttempt('daily-life-beginner-1', 85, new Date()), sentenceAttempts },
    { ...createMockAttempt('daily-life-beginner-2', 90, new Date()), sentenceAttempts }
  ]);
}

function createMockProgressWithManyErrors(): UserProgress {
  const sentenceAttempts = [
    sentenceWithFeedback([
      feedbackItem('grammar'),
      feedbackItem('vocabulary'),
      feedbackItem('structure'),
      feedbackItem('spelling'),
      feedbackItem('suggestion'),
      feedbackItem('grammar')
    ])
  ];
  return createProgress([
    { ...createMockAttempt('daily-life-beginner-1', 85, new Date()), sentenceAttempts }
  ]);
}

function createMockProgressReadyToAdvance(): UserProgress {
  const attempts: ExerciseAttempt[] = [];
  for (let i = 0; i < 12; i++) {
    attempts.push(createMockAttempt(`daily-life-beginner-${i}`, 90, new Date()));
  }
  return createProgress(attempts);
}

function createMockProgressWithStreak(): UserProgress {
  const now = new Date();
  return createProgress(
    [
      createMockAttempt('daily-life-beginner-1', 85, new Date(now.getTime() - 2 * DAY_MS)),
      createMockAttempt('daily-life-beginner-2', 90, new Date(now.getTime() - DAY_MS)),
      createMockAttempt('daily-life-beginner-3', 78, now)
    ],
    { currentStreak: 3, longestStreak: 3 }
  );
}

function createMockProgressWithVocabulary(): UserProgress {
  const sentenceAttempts = [
    sentenceWithFeedback(
      [feedbackItem('vocabulary', 'excellent wonderful amazing fantastic')],
      'This is a wonderful example sentence with excellent vocabulary'
    )
  ];
  return createProgress([
    {
      ...createMockAttempt('daily-life-beginner-1', 85, new Date()),
      sentenceAttempts,
      userInput: 'This is a wonderful example sentence with excellent vocabulary'
    }
  ]);
}
