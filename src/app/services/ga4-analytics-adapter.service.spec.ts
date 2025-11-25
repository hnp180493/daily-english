import { TestBed } from '@angular/core/testing';
import { Ga4AnalyticsAdapter } from './ga4-analytics-adapter.service';
import { EventQueueManager } from './event-queue-manager.service';
import { Ga4Config } from '../models/analytics-provider.model';

describe('Ga4AnalyticsAdapter', () => {
  let adapter: Ga4AnalyticsAdapter;
  let eventQueue: EventQueueManager;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [Ga4AnalyticsAdapter, EventQueueManager]
    });
    adapter = TestBed.inject(Ga4AnalyticsAdapter);
    eventQueue = TestBed.inject(EventQueueManager);
  });

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
      spyOn(console, 'warn');
      adapter.trackPageView('/test', 'Test Page');
      // Should warn about not being initialized
      expect(console.warn).toHaveBeenCalled();
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
      spyOn(console, 'warn');
      adapter.trackEvent('test_event', { param: 'value' });
      // Should warn about not being initialized
      expect(console.warn).toHaveBeenCalled();
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
      spyOn(console, 'warn');
      adapter.setUserProperty('test_property', 'value');
      // Should warn about not being initialized
      expect(console.warn).toHaveBeenCalled();
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
      spyOn(console, 'warn');
      adapter.setUserProperties({ prop1: 'value1', prop2: 'value2' });
      // Should warn about not being initialized
      expect(console.warn).toHaveBeenCalled();
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
      spyOn(console, 'warn');
      adapter.setUserId('user123');
      // Should warn about not being initialized
      expect(console.warn).toHaveBeenCalled();
    });
  });
});
