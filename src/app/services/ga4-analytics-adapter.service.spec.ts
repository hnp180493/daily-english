import { TestBed } from '@angular/core/testing';
import { Ga4AnalyticsAdapter } from './ga4-analytics-adapter.service';
import { EventQueueManager } from './event-queue-manager.service';
import { Ga4Config } from '../models/analytics-provider.model';

describe('Ga4AnalyticsAdapter', () => {
  let adapter: Ga4AnalyticsAdapter;
  let eventQueue: EventQueueManager;
  let originalGtag: any;
  let gtagSpy: jasmine.Spy;

  beforeEach(() => {
    // Start from a clean privacy state (opt-out persists in localStorage across specs)
    localStorage.removeItem('analytics_opt_out');
    originalGtag = (window as any).gtag;
    gtagSpy = jasmine.createSpy('gtag');
    (window as any).gtag = gtagSpy;

    TestBed.configureTestingModule({
      providers: [Ga4AnalyticsAdapter, EventQueueManager]
    });
    adapter = TestBed.inject(Ga4AnalyticsAdapter);
    eventQueue = TestBed.inject(EventQueueManager);
  });

  afterEach(() => {
    (window as any).gtag = originalGtag;
    localStorage.removeItem('analytics_opt_out');
  });

  /** "Not initialized" is only logged in debug mode; enable it quietly. */
  function enableDebugQuietly(): void {
    const logSpy = spyOn(console, 'log');
    adapter.setDebugMode(true);
    logSpy.and.callThrough();
    logSpy.calls.reset();
  }

  function expectNotInitializedWarning(): void {
    expect(gtagSpy).not.toHaveBeenCalled();
    expect(console.warn).toHaveBeenCalledWith('[GA4] Not initialized - cannot track');
  }

  it('should be created', () => {
    expect(adapter).toBeTruthy();
  });

  describe('initialization', () => {
    it('should not be initialized by default', () => {
      expect(adapter.isInitialized()).toBe(false);
    });

    it('should be enabled by default', () => {
      expect(adapter.isEnabled()).toBe(true);
    });
  });

  describe('setEnabled', () => {
    it('should enable tracking', () => {
      adapter.setEnabled(true);
      expect(adapter.isEnabled()).toBe(true);
    });

    it('should disable tracking', () => {
      adapter.setEnabled(false);
      expect(adapter.isEnabled()).toBe(false);
    });
  });

  describe('setDebugMode', () => {
    it('should enable debug mode', () => {
      spyOn(console, 'log');
      adapter.setDebugMode(true);
      expect(console.log).toHaveBeenCalledWith('[GA4] Debug mode:', true);
    });

    it('should disable debug mode', () => {
      spyOn(console, 'log');
      adapter.setDebugMode(false);
      expect(console.log).toHaveBeenCalledWith('[GA4] Debug mode:', false);
    });
  });

  describe('trackPageView', () => {
    it('should not track when disabled', () => {
      adapter.setEnabled(false);
      spyOn(console, 'log');
      adapter.trackPageView('/test', 'Test Page');
      // Should not log anything since tracking is disabled
      expect(console.log).not.toHaveBeenCalled();
    });

    it('should not track when not initialized', () => {
      adapter.setEnabled(true);
      adapter.trackPageView('/test', 'Test Page');
      expect(gtagSpy).not.toHaveBeenCalled();
    });

    it('should warn in debug mode when trackPageView is called before initialization', () => {
      adapter.setEnabled(true);
      enableDebugQuietly();
      spyOn(console, 'warn');
      adapter.trackPageView('/test', 'Test Page');
      expectNotInitializedWarning();
    });
  });

  describe('trackEvent', () => {
    it('should not track when disabled', () => {
      adapter.setEnabled(false);
      spyOn(console, 'log');
      adapter.trackEvent('test_event', { param: 'value' });
      // Should not log anything since tracking is disabled
      expect(console.log).not.toHaveBeenCalled();
    });

    it('should not track when not initialized', () => {
      adapter.setEnabled(true);
      adapter.trackEvent('test_event', { param: 'value' });
      expect(gtagSpy).not.toHaveBeenCalled();
    });

    it('should warn in debug mode when trackEvent is called before initialization', () => {
      adapter.setEnabled(true);
      enableDebugQuietly();
      spyOn(console, 'warn');
      adapter.trackEvent('test_event', { param: 'value' });
      expectNotInitializedWarning();
    });
  });

  describe('setUserProperty', () => {
    it('should not set property when disabled', () => {
      adapter.setEnabled(false);
      spyOn(console, 'log');
      adapter.setUserProperty('test_property', 'value');
      // Should not log anything since tracking is disabled
      expect(console.log).not.toHaveBeenCalled();
    });

    it('should not set property when not initialized', () => {
      adapter.setEnabled(true);
      adapter.setUserProperty('test_property', 'value');
      expect(gtagSpy).not.toHaveBeenCalled();
    });

    it('should warn in debug mode when setUserProperty is called before initialization', () => {
      adapter.setEnabled(true);
      enableDebugQuietly();
      spyOn(console, 'warn');
      adapter.setUserProperty('test_property', 'value');
      expectNotInitializedWarning();
    });
  });

  describe('setUserProperties', () => {
    it('should not set properties when disabled', () => {
      adapter.setEnabled(false);
      spyOn(console, 'log');
      adapter.setUserProperties({ prop1: 'value1', prop2: 'value2' });
      // Should not log anything since tracking is disabled
      expect(console.log).not.toHaveBeenCalled();
    });

    it('should not set properties when not initialized', () => {
      adapter.setEnabled(true);
      adapter.setUserProperties({ prop1: 'value1', prop2: 'value2' });
      expect(gtagSpy).not.toHaveBeenCalled();
    });

    it('should warn in debug mode when setUserProperties is called before initialization', () => {
      adapter.setEnabled(true);
      enableDebugQuietly();
      spyOn(console, 'warn');
      adapter.setUserProperties({ prop1: 'value1', prop2: 'value2' });
      expectNotInitializedWarning();
    });
  });

  describe('setUserId', () => {
    it('should not set user ID when disabled', () => {
      adapter.setEnabled(false);
      spyOn(console, 'log');
      adapter.setUserId('user123');
      // Should not log anything since tracking is disabled
      expect(console.log).not.toHaveBeenCalled();
    });

    it('should not set user ID when not initialized', () => {
      adapter.setEnabled(true);
      adapter.setUserId('user123');
      expect(gtagSpy).not.toHaveBeenCalled();
    });

    it('should warn in debug mode when setUserId is called before initialization', () => {
      adapter.setEnabled(true);
      enableDebugQuietly();
      spyOn(console, 'warn');
      adapter.setUserId('user123');
      expectNotInitializedWarning();
    });
  });
});
