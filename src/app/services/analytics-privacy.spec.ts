import { TestBed } from '@angular/core/testing';
import { AnalyticsService } from './analytics.service';
import { PrivacyService } from './privacy.service';
import { IAnalyticsProvider } from '../models/analytics-provider.model';

/**
 * Property Tests: Privacy and PII Protection
 * Validates Requirements: 9.1, 9.2, 9.3, 9.4
 */
describe('AnalyticsService - Privacy (Property Tests)', () => {
  let service: AnalyticsService;
  let privacyService: PrivacyService;
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
    privacyService = TestBed.inject(PrivacyService);
    service.registerProvider(mockProvider);
  });

  describe('Property 10: Opt-out stops all tracking', () => {
    it('should not track page views when opted out', () => {
      privacyService.disableAnalytics();
      mockProvider.trackPageView.calls.reset();

      service.trackPageView('/test', 'Test');

      expect(mockProvider.trackPageView).not.toHaveBeenCalled();
    });

    it('should not track events when opted out', () => {
      privacyService.disableAnalytics();
      mockProvider.trackEvent.calls.reset();

      service.trackExerciseStart('ex1', 'grammar', 'beginner', 'multiple-choice');

      expect(mockProvider.trackEvent).not.toHaveBeenCalled();
    });

    it('should not set user properties when opted out', () => {
      privacyService.disableAnalytics();
      mockProvider.setUserProperty.calls.reset();

      service.setUserProperty('test', 'value');

      expect(mockProvider.setUserProperty).not.toHaveBeenCalled();
    });

    it('should resume tracking when opted back in', () => {
      privacyService.disableAnalytics();
      service.trackPageView('/test1', 'Test 1');
      expect(mockProvider.trackPageView).not.toHaveBeenCalled();

      privacyService.enableAnalytics();
      mockProvider.trackPageView.calls.reset();
      service.trackPageView('/test2', 'Test 2');

      expect(mockProvider.trackPageView).toHaveBeenCalledWith('/test2', 'Test 2');
    });

    it('should persist opt-out preference', () => {
      privacyService.disableAnalytics();
      expect(privacyService.isAnalyticsEnabled()).toBe(false);

      // Simulate page reload by creating new service instance
      const newPrivacyService = new PrivacyService();
      expect(newPrivacyService.isAnalyticsEnabled()).toBe(false);
    });
  });

  describe('Property 11: No PII in tracking events', () => {
    it('should filter PII from strings', () => {
      const filtered = privacyService.filterPii('Contact me at test@example.com');
      expect(filtered).not.toContain('test@example.com');
      expect(filtered).toContain('[EMAIL_REDACTED]');
    });

    it('should filter phone numbers', () => {
      const filtered = privacyService.filterPii('Call me at 555-123-4567');
      expect(filtered).not.toContain('555-123-4567');
      expect(filtered).toContain('[PHONE_REDACTED]');
    });

    it('should not expose API keys in AI tracking', () => {
      service.trackApiKeyConfigured('openai');

      expect(mockProvider.trackEvent).toHaveBeenCalledWith('api_key_configured', {
        provider: 'openai'
      });

      // Verify no API key value is in the parameters
      const calls = mockProvider.trackEvent.calls.all();
      calls.forEach(call => {
        const params = call.args[1] as Record<string, any>;
        expect(params['api_key']).toBeUndefined();
        expect(params['key']).toBeUndefined();
        expect(params['secret']).toBeUndefined();
      });
    });

    it('should not expose credentials in auth error tracking', () => {
      service.trackAuthError('invalid_credentials');

      expect(mockProvider.trackEvent).toHaveBeenCalledWith('auth_error', {
        error_type: 'invalid_credentials'
      });

      // Verify no credentials in parameters
      const calls = mockProvider.trackEvent.calls.all();
      calls.forEach(call => {
        const params = call.args[1] as Record<string, any>;
        expect(params['password']).toBeUndefined();
        expect(params['email']).toBeUndefined();
        expect(params['username']).toBeUndefined();
      });
    });
  });
});
