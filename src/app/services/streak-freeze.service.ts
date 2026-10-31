import { Injectable, inject, signal } from '@angular/core';
import { SkillSyncService } from './skill-sync.service';

interface FreezeState {
  count: number;
  /** Streak length at which a freeze was last awarded (avoids double awards). */
  lastAwardedAt: number;
}

const STORAGE_KEY = 'streak-freeze-v1';
export const STREAK_FREEZE = {
  /** Everyone starts with one so a single missed day never resets a fresh streak. */
  INITIAL: 1,
  MAX: 2,
  /** Earn one freeze every N consecutive days. */
  EARN_EVERY: 7,
} as const;

/**
 * Duolingo-style streak freeze: covers exactly one missed day.
 * Stored locally and synced to Supabase for signed-in users.
 */
@Injectable({ providedIn: 'root' })
export class StreakFreezeService {
  private sync = inject(SkillSyncService);
  readonly count = signal<number>(STREAK_FREEZE.INITIAL);
  private lastAwardedAt = 0;

  constructor() {
    this.load();
    this.sync.register<FreezeState>({
      key: STORAGE_KEY,
      read: () => ({ count: this.count(), lastAwardedAt: this.lastAwardedAt }),
      write: (_uid, value) => {
        this.apply(value);
        this.save(false);
      },
    });
  }

  /** Spend a freeze to bridge a missed day. Returns false if none left. */
  consume(): boolean {
    if (this.count() <= 0) return false;
    this.count.update((c) => c - 1);
    this.save();
    return true;
  }

  /** Call whenever the streak grows; awards a freeze on every EARN_EVERY-day milestone. */
  onStreakReached(streak: number): boolean {
    if (streak <= 0 || streak % STREAK_FREEZE.EARN_EVERY !== 0) return false;
    if (streak === this.lastAwardedAt || this.count() >= STREAK_FREEZE.MAX) return false;
    this.lastAwardedAt = streak;
    this.count.update((c) => Math.min(STREAK_FREEZE.MAX, c + 1));
    this.save();
    return true;
  }

  private apply(value: Partial<FreezeState> | null | undefined): void {
    const count = Number(value?.count);
    this.count.set(Number.isFinite(count) ? Math.max(0, Math.min(STREAK_FREEZE.MAX, count)) : STREAK_FREEZE.INITIAL);
    this.lastAwardedAt = Number(value?.lastAwardedAt) || 0;
  }

  private load(): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) this.apply(JSON.parse(raw));
    } catch {
      // Keep defaults.
    }
  }

  private save(notifySync = true): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ count: this.count(), lastAwardedAt: this.lastAwardedAt }));
    } catch {
      // Quota / privacy mode: in-memory value still applies this session.
    }
    if (notifySync) this.sync.markChanged(STORAGE_KEY);
  }
}
