import { Injectable } from '@angular/core';
import { Ga4Event } from '../models/analytics-provider.model';

/**
 * Event Queue Manager
 * 
 * Manages event queueing for offline scenarios and implements retry logic
 * with exponential backoff. This ensures events are not lost when the
 * network is unavailable.
 * 
 * Features:
 * - Queue events when offline
 * - Automatic flush when online
 * - Exponential backoff for retries
 * - Max queue size to prevent memory issues
 */
@Injectable({
  providedIn: 'root'
})
export class EventQueueManager {
  private queue: Ga4Event[] = [];
  private readonly maxQueueSize = 100;
  private readonly maxRetries = 3;
  private readonly backoffMultiplier = 2;
  private retryAttempts = new Map<string, number>();
  private isOnline = true;
  private debugMode = false;

  constructor() {
    // Listen for online/offline events
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.handleOnline());
      window.addEventListener('offline', () => this.handleOffline());
      this.isOnline = navigator.onLine;
    }
  }

  /**
   * Enable or disable debug mode
   */
  setDebugMode(enabled: boolean): void {
    this.debugMode = enabled;
  }

  /**
   * Add an event to the queue
   */
  enqueue(event: Ga4Event): void {
    // Check if queue is full
    if (this.queue.length >= this.maxQueueSize) {
      if (this.debugMode) {
        console.warn('[EventQueue] Queue is full, dropping oldest event');
      }
      // Remove oldest event
      this.queue.shift();
    }

    this.queue.push(event);

    if (this.debugMode) {
      console.log('[EventQueue] Event queued:', event.eventName, 'Queue size:', this.queue.length);
    }
  }

  /**
   * Remove and return the next event from the queue
   */
  dequeue(): Ga4Event | undefined {
    const event = this.queue.shift();
    
    if (this.debugMode && event) {
      console.log('[EventQueue] Event dequeued:', event.eventName, 'Queue size:', this.queue.length);
    }

    return event;
  }

  /**
   * Get the current queue size
   */
  size(): number {
    return this.queue.length;
  }

  /**
   * Clear all events from the queue
   */
  clear(): void {
    this.queue = [];
    this.retryAttempts.clear();

    if (this.debugMode) {
      console.log('[EventQueue] Queue cleared');
    }
  }

  /**
   * Check if the device is online
   */
  isDeviceOnline(): boolean {
    return this.isOnline;
  }

  /**
   * Flush the queue by sending all events
   */
  async flush(sendFunction: (event: Ga4Event) => Promise<void>): Promise<void> {
    if (!this.isOnline) {
      if (this.debugMode) {
        console.log('[EventQueue] Cannot flush - device is offline');
      }
      return;
    }

    if (this.queue.length === 0) {
      if (this.debugMode) {
        console.log('[EventQueue] Queue is empty - nothing to flush');
      }
      return;
    }

    if (this.debugMode) {
      console.log('[EventQueue] Flushing queue with', this.queue.length, 'events');
    }

    // Process events one by one
    const eventsToProcess = [...this.queue];
    this.queue = [];

    for (const event of eventsToProcess) {
      try {
        await this.retryEvent(event, sendFunction);
      } catch (error) {
        // If retry fails, check if we should re-queue
        const eventId = this.generateEventId(event);
        const attempts = this.retryAttempts.get(eventId) || 0;

        if (attempts < this.maxRetries) {
          // Re-queue for later retry
          this.enqueue(event);
        } else {
          // Max retries exceeded, drop the event
          if (this.debugMode) {
            console.warn('[EventQueue] Max retries exceeded for event:', event.eventName);
          }
          this.retryAttempts.delete(eventId);
        }
      }
    }

    if (this.debugMode) {
      console.log('[EventQueue] Flush complete. Remaining queue size:', this.queue.length);
    }
  }

  /**
   * Retry sending an event with exponential backoff
   */
  private async retryEvent(
    event: Ga4Event,
    sendFunction: (event: Ga4Event) => Promise<void>
  ): Promise<void> {
    const eventId = this.generateEventId(event);
    const attempts = this.retryAttempts.get(eventId) || 0;

    if (attempts >= this.maxRetries) {
      throw new Error('Max retries exceeded');
    }

    // Calculate backoff delay
    const delay = Math.pow(this.backoffMultiplier, attempts) * 1000;

    if (attempts > 0) {
      if (this.debugMode) {
        console.log(`[EventQueue] Retrying event ${event.eventName} (attempt ${attempts + 1}) after ${delay}ms`);
      }
      await this.sleep(delay);
    }

    try {
      await sendFunction(event);
      // Success - remove from retry tracking
      this.retryAttempts.delete(eventId);
    } catch (error) {
      // Failure - increment retry count
      this.retryAttempts.set(eventId, attempts + 1);
      throw error;
    }
  }

  /**
   * Generate a unique ID for an event
   */
  private generateEventId(event: Ga4Event): string {
    return `${event.eventName}_${event.timestamp}_${JSON.stringify(event.eventParams)}`;
  }

  /**
   * Sleep for a specified duration
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Handle online event
   */
  private handleOnline(): void {
    this.isOnline = true;

    if (this.debugMode) {
      console.log('[EventQueue] Device is online');
    }

    // Note: Flush will be triggered by the adapter when it detects online status
  }

  /**
   * Handle offline event
   */
  private handleOffline(): void {
    this.isOnline = false;

    if (this.debugMode) {
      console.log('[EventQueue] Device is offline - events will be queued');
    }
  }
}
