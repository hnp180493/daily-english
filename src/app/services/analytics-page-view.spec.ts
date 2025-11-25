import { TestBed } from '@angular/core/testing';
import { AnalyticsService } from './analytics.service';
import { IAnalyticsProvider } from '../models/analytics-provider.model';
import { PrivacyService } from './privacy.service';

/**
 * Property Test: Page view events include required data
 * Validates Requirements: 1.1, 1.2
 */
describe('AnalyticsService - Page View Tracking (Property Test)', () => {
  let service: AnalyticsService;
  let mockProvider: jasmine.SpyObj<IAnalyticsProvider>;
  let privacyService: PrivacyService;

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
    privacyService = TestBed.inject(PrivacyService);
    service.registerProvider(mockProvider);
  });

  it('Property 1: Page view events include required data (path and title)', () => {
    const testCases = [
      { path: '/', title: 'Home' },
      { path: '/exercises', title: 'Exercises' },
      { path: '/exercises/123', title: 'Exercise Detail' },
      { path: '/achievements', title: 'Achievements' },
      { path: '/profile', title: 'Profile' }
    ];

    testCases.forEach(({ path, title }) => {
      mockProvider.trackPageView.calls.reset();
      
      service.trackPageView(path, title);

      expect(mockProvider.trackPageView).toHaveBeenCalledWith(path, title);
      expect(mockProvider.trackPageView).toHaveBeenCalledTimes(1);
    });
  });

  it('Property 1: Page view tracking respects privacy opt-out', () => {
    privacyService.disableAnalytics();
    mockProvider.trackPageView.calls.reset();

    service.trackPageView('/test', 'Test Page');

    // Should not track when opted out
    expect(mockProvider.trackPageView).not.toHaveBeenCalled();
  });

  it('Property 1: Page view tracking works when privacy is enabled', () => {
    privacyService.enableAnalytics();
    mockProvider.trackPageView.calls.reset();

    service.trackPageView('/test', 'Test Page');

    expect(mockProvider.trackPageView).toHaveBeenCalledWith('/test', 'Test Page');
  });
});
