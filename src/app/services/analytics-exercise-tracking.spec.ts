import { TestBed } from '@angular/core/testing';
import { AnalyticsService } from './analytics.service';
import { IAnalyticsProvider } from '../models/analytics-provider.model';
import { PrivacyService } from './privacy.service';

/**
 * Property Test: Exercise events contain complete metadata
 * Validates Requirements: 2.1, 2.2, 2.3, 2.4, 2.5
 */
describe('AnalyticsService - Exercise Tracking (Property Test)', () => {
  let service: AnalyticsService;
  let mockProvider: jasmine.SpyObj<IAnalyticsProvider>;

  beforeEach(() => {
    mockProvider = jasmine.createSpyObj<IAnalyticsProvider>('MockProvider', [
      'initialize',
      'trackPageView',
      'trackEvent',
      'setUserProperty',
      'setUserProperties',
      'setUserId',
      'isInitialized',
      'isEnabled',
      'setEnabled',
      'setDebugMode'
    ]);
    mockProvider.isEnabled.and.returnValue(true);
    mockProvider.isInitialized.and.returnValue(true);

    TestBed.configureTestingModule({
      providers: [AnalyticsService, PrivacyService]
    });

    service = TestBed.inject(AnalyticsService);
    service.registerProvider(mockProvider);
  });

  it('Property 3: Exercise start events contain required metadata', () => {
    service.trackExerciseStart('ex123', 'grammar', 'intermediate', 'fill-blank');

    expect(mockProvider.trackEvent).toHaveBeenCalledWith('exercise_start', {
      exercise_id: 'ex123',
      exercise_category: 'grammar',
      exercise_level: 'intermediate',
      exercise_type: 'fill-blank'
    });
  });

  it('Property 3: Exercise completion events contain complete data', () => {
    const completionData = {
      completionTime: 45,
      score: 85,
      accuracy: 85,
      hintsUsed: 2
    };

    service.trackExerciseComplete('ex123', completionData);

    expect(mockProvider.trackEvent).toHaveBeenCalledWith('exercise_complete', {
      exercise_id: 'ex123',
      completion_time: 45,
      score: 85,
      accuracy: 85,
      hints_used: 2
    });
  });

  it('Property 3: Exercise submission events track correctness', () => {
    service.trackExerciseSubmit('ex123', true);
    expect(mockProvider.trackEvent).toHaveBeenCalledWith('exercise_submit', {
      exercise_id: 'ex123',
      is_correct: true
    });

    mockProvider.trackEvent.calls.reset();

    service.trackExerciseSubmit('ex456', false);
    expect(mockProvider.trackEvent).toHaveBeenCalledWith('exercise_submit', {
      exercise_id: 'ex456',
      is_correct: false
    });
  });

  it('Property 3: Hint usage events contain hint type', () => {
    service.trackHintUsed('ex123', 'translation');

    expect(mockProvider.trackEvent).toHaveBeenCalledWith('hint_used', {
      exercise_id: 'ex123',
      hint_type: 'translation'
    });
  });

  it('Property 3: Exercise abandonment events contain time and progress', () => {
    service.trackExerciseAbandoned('ex123', 30, 60);

    expect(mockProvider.trackEvent).toHaveBeenCalledWith('exercise_abandoned', {
      exercise_id: 'ex123',
      time_spent: 30,
      completion_percentage: 60
    });
  });
});
