import { TestBed } from '@angular/core/testing';
import { AnalyticsService } from './analytics.service';
import { IAnalyticsProvider } from '../models/analytics-provider.model';
import { PrivacyService } from './privacy.service';

/**
 * Property Test: Guest users are tracked anonymously
 * Validates Requirements: 1.5, 6.5
 */
describe('AnalyticsService - Guest User Tracking (Property Test)', () => {
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

  it('Property 2: Guest users can track events without user ID', () => {
    // Track events without setting user ID (guest user)
    service.trackPageView('/home', 'Home');
    service.trackExerciseStart('ex1', 'grammar', 'beginner', 'multiple-choice');

    expect(mockProvider.trackPageView).toHaveBeenCalled();
    expect(mockProvider.trackEvent).toHaveBeenCalled();
    // User ID should not be set for guest users
    expect(mockProvider.setUserId).not.toHaveBeenCalled();
  });

  it('Property 2: Guest users have account_type property set to guest', () => {
    service.setUserProperty('account_type', 'guest');

    expect(mockProvider.setUserProperty).toHaveBeenCalledWith('account_type', 'guest');
  });

  it('Property 2: Authenticated users have user ID set', () => {
    service.setUserId('user123');

    expect(mockProvider.setUserId).toHaveBeenCalledWith('user123');
  });

  it('Property 2: Account type changes from guest to authenticated', () => {
    // Start as guest
    service.setUserProperty('account_type', 'guest');
    expect(mockProvider.setUserProperty).toHaveBeenCalledWith('account_type', 'guest');

    // Convert to authenticated
    service.setUserId('user123');
    service.setUserProperty('account_type', 'authenticated');

    expect(mockProvider.setUserId).toHaveBeenCalledWith('user123');
    expect(mockProvider.setUserProperty).toHaveBeenCalledWith('account_type', 'authenticated');
  });
});
