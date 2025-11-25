import { TestBed } from '@angular/core/testing';
import { AnalyticsService } from './analytics.service';
import { IAnalyticsProvider } from '../models/analytics-provider.model';
import { PrivacyService } from './privacy.service';

/**
 * Property Test: Analytics service handles errors gracefully
 * Validates Requirements: 8.1, 8.4, 8.5
 */
describe('AnalyticsService - Error Handling (Property Test)', () => {
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

  it('Property 8: Service handles provider errors without crashing', () => {
    mockProvider.trackEvent.and.throwError('Network error');

    expect(() => {
      service.trackExerciseStart('ex1', 'grammar', 'beginner', 'multiple-choice');
    }).not.toThrow();
  });

  it('Property 8: Service continues working after provider error', () => {
    mockProvider.trackEvent.and.throwError('Network error');
    
    // First call throws error
    service.trackExerciseStart('ex1', 'grammar', 'beginner', 'multiple-choice');

    // Reset mock to not throw
    mockProvider.trackEvent.and.stub();
    
    // Second call should work
    service.trackExerciseStart('ex2', 'vocabulary', 'intermediate', 'fill-blank');
    
    expect(mockProvider.trackEvent).toHaveBeenCalled();
  });

  it('Property 8: Service handles null/undefined parameters gracefully', () => {
    expect(() => {
      service.trackExerciseComplete('ex1', null as any);
    }).not.toThrow();

    expect(() => {
      service.trackExerciseComplete('ex1', undefined as any);
    }).not.toThrow();
  });

  it('Property 8: Service handles multiple provider failures', () => {
    const mockProvider2 = jasmine.createSpyObj<IAnalyticsProvider>('MockProvider2', [
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
    mockProvider2.isEnabled.and.returnValue(true);
    mockProvider2.isInitialized.and.returnValue(true);

    service.registerProvider(mockProvider2);

    mockProvider.trackEvent.and.throwError('Provider 1 error');
    mockProvider2.trackEvent.and.throwError('Provider 2 error');

    expect(() => {
      service.trackExerciseStart('ex1', 'grammar', 'beginner', 'multiple-choice');
    }).not.toThrow();
  });
});
