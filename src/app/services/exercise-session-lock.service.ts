import { Injectable, OnDestroy, signal } from '@angular/core';

/**
 * ExerciseSessionLockService
 * 
 * Prevents cheating by detecting and blocking duplicate tabs working on the same exercise.
 * Uses BroadcastChannel API to communicate between tabs.
 * 
 * How it works:
 * 1. When user starts an exercise, this tab broadcasts a "lock" message
 * 2. Other tabs listening will receive this and show a warning
 * 3. When exercise completes or tab closes, broadcasts "unlock"
 * 4. Progress is synced between tabs to prevent state duplication
 */
@Injectable({
  providedIn: 'root'
})
export class ExerciseSessionLockService implements OnDestroy {
  private channel: BroadcastChannel | null = null;
  private currentExerciseId: string | null = null;
  private sessionId = this.generateSessionId();
  
  // Signal to notify components when this tab is blocked
  isBlocked = signal(false);
  blockedMessage = signal('');

  constructor() {
    this.initChannel();
  }

  private generateSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  private initChannel(): void {
    if (typeof BroadcastChannel === 'undefined') {
      console.warn('[SessionLock] BroadcastChannel not supported');
      return;
    }

    this.channel = new BroadcastChannel('exercise_session_lock');
    this.channel.onmessage = (event) => this.handleMessage(event.data);

    // Handle tab close/refresh
    window.addEventListener('beforeunload', () => this.releaseCurrentLock());
  }

  private handleMessage(data: SessionLockMessage): void {
    if (data.sessionId === this.sessionId) return; // Ignore own messages

    switch (data.type) {
      case 'lock_request':
        // Another tab wants to lock this exercise
        if (this.currentExerciseId === data.exerciseId) {
          // We have it locked, tell them
          this.broadcast({
            type: 'lock_denied',
            exerciseId: data.exerciseId,
            sessionId: this.sessionId,
            timestamp: Date.now()
          });
        }
        break;

      case 'lock_denied':
        // Our lock request was denied
        if (this.currentExerciseId === data.exerciseId) {
          this.isBlocked.set(true);
          this.blockedMessage.set('This exercise is already open in another tab. Please close this tab to avoid losing points.');
        }
        break;

      case 'lock_acquired':
        // Another tab acquired the lock
        if (this.currentExerciseId === data.exerciseId) {
          this.isBlocked.set(true);
          this.blockedMessage.set('This exercise is already open in another tab. Please close this tab to avoid losing points.');
        }
        break;

      case 'unlock':
        // Another tab released the lock
        if (data.exerciseId === this.currentExerciseId) {
          // Could potentially unblock, but safer to keep blocked
          // User should close this tab anyway
        }
        break;

      case 'progress_sync':
        // Another tab synced progress - invalidate our local state
        if (data.exerciseId === this.currentExerciseId && !this.isBlocked()) {
          // We're the active tab but another tab synced - this shouldn't happen
          // Block this tab as a safety measure
          this.isBlocked.set(true);
          this.blockedMessage.set('Progress has been updated from another tab. Please reload the page.');
        }
        break;
    }
  }

  /**
   * Attempt to acquire lock for an exercise
   * Returns true if lock acquired, false if blocked
   */
  acquireLock(exerciseId: string): boolean {
    if (!this.channel) return true; // No channel = no lock needed

    // Release any existing lock first
    this.releaseCurrentLock();

    this.currentExerciseId = exerciseId;
    this.isBlocked.set(false);
    this.blockedMessage.set('');

    // Request lock
    this.broadcast({
      type: 'lock_request',
      exerciseId,
      sessionId: this.sessionId,
      timestamp: Date.now()
    });

    // Small delay to allow other tabs to respond
    // In practice, the lock_denied message will set isBlocked
    setTimeout(() => {
      if (!this.isBlocked()) {
        // No denial received, we have the lock
        this.broadcast({
          type: 'lock_acquired',
          exerciseId,
          sessionId: this.sessionId,
          timestamp: Date.now()
        });
      }
    }, 100);

    return true;
  }

  /**
   * Release the current lock
   */
  releaseCurrentLock(): void {
    if (this.currentExerciseId && this.channel) {
      this.broadcast({
        type: 'unlock',
        exerciseId: this.currentExerciseId,
        sessionId: this.sessionId,
        timestamp: Date.now()
      });
    }
    this.currentExerciseId = null;
    this.isBlocked.set(false);
    this.blockedMessage.set('');
  }

  /**
   * Notify other tabs that progress was saved
   * This helps detect if someone tries to cheat by duplicating tabs
   */
  notifyProgressSync(exerciseId: string): void {
    if (!this.channel) return;

    this.broadcast({
      type: 'progress_sync',
      exerciseId,
      sessionId: this.sessionId,
      timestamp: Date.now()
    });
  }

  private broadcast(message: SessionLockMessage): void {
    if (this.channel) {
      this.channel.postMessage(message);
    }
  }

  ngOnDestroy(): void {
    this.releaseCurrentLock();
    if (this.channel) {
      this.channel.close();
      this.channel = null;
    }
  }
}

interface SessionLockMessage {
  type: 'lock_request' | 'lock_denied' | 'lock_acquired' | 'unlock' | 'progress_sync';
  exerciseId: string;
  sessionId: string;
  timestamp: number;
}
