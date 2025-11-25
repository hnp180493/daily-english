import { TestBed } from '@angular/core/testing';
import { EventQueueManager } from './event-queue-manager.service';
import { Ga4Event } from '../models/analytics-provider.model';

describe('EventQueueManager', () => {
  let service: EventQueueManager;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(EventQueueManager);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('enqueue and dequeue', () => {
    it('should enqueue an event', () => {
      const event: Ga4Event = {
        eventName: 'test_event',
        eventParams: { param: 'value' },
        timestamp: Date.now()
      };

      service.enqueue(event);
      expect(service.size()).toBe(1);
    });

    it('should dequeue an event', () => {
      const event: Ga4Event = {
        eventName: 'test_event',
        eventParams: { param: 'value' },
        timestamp: Date.now()
      };

      service.enqueue(event);
      const dequeuedEvent = service.dequeue();
      
      expect(dequeuedEvent).toEqual(event);
      expect(service.size()).toBe(0);
    });

    it('should return undefined when dequeuing from empty queue', () => {
      const dequeuedEvent = service.dequeue();
      expect(dequeuedEvent).toBeUndefined();
    });

    it('should maintain FIFO order', () => {
      const event1: Ga4Event = {
        eventName: 'event1',
        eventParams: {},
        timestamp: Date.now()
      };
      const event2: Ga4Event = {
        eventName: 'event2',
        eventParams: {},
        timestamp: Date.now()
      };

      service.enqueue(event1);
      service.enqueue(event2);

      expect(service.dequeue()).toEqual(event1);
      expect(service.dequeue()).toEqual(event2);
    });
  });

  describe('size', () => {
    it('should return 0 for empty queue', () => {
      expect(service.size()).toBe(0);
    });

    it('should return correct size after enqueuing', () => {
      const event: Ga4Event = {
        eventName: 'test_event',
        eventParams: {},
        timestamp: Date.now()
      };

      service.enqueue(event);
      service.enqueue(event);
      service.enqueue(event);

      expect(service.size()).toBe(3);
    });
  });

  describe('clear', () => {
    it('should clear all events from queue', () => {
      const event: Ga4Event = {
        eventName: 'test_event',
        eventParams: {},
        timestamp: Date.now()
      };

      service.enqueue(event);
      service.enqueue(event);
      service.clear();

      expect(service.size()).toBe(0);
    });
  });

  describe('max queue size', () => {
    it('should drop oldest event when queue is full', () => {
      service.setDebugMode(true);
      spyOn(console, 'warn');

      // Enqueue 101 events (max is 100)
      for (let i = 0; i < 101; i++) {
        const event: Ga4Event = {
          eventName: `event_${i}`,
          eventParams: {},
          timestamp: Date.now()
        };
        service.enqueue(event);
      }

      expect(service.size()).toBe(100);
      expect(console.warn).toHaveBeenCalled();
    });
  });

  describe('setDebugMode', () => {
    it('should enable debug mode', () => {
      service.setDebugMode(true);
      spyOn(console, 'log');

      const event: Ga4Event = {
        eventName: 'test_event',
        eventParams: {},
        timestamp: Date.now()
      };

      service.enqueue(event);
      expect(console.log).toHaveBeenCalled();
    });
  });

  describe('isDeviceOnline', () => {
    it('should return online status', () => {
      // This will depend on the actual navigator.onLine value
      const isOnline = service.isDeviceOnline();
      expect(typeof isOnline).toBe('boolean');
    });
  });
});
