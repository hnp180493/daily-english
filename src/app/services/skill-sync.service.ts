import { Injectable, effect, inject } from '@angular/core';
import { AuthService } from './auth.service';
import { supabaseClient } from './supabase.client';

/**
 * A client-side feature whose state lives in localStorage and should follow
 * the signed-in user across devices.
 */
export interface SkillSyncHandler<T = unknown> {
  /** Row key in `user_skill_data` (stable, versioned, e.g. 'reading-progress-v1'). */
  key: string;
  /** Current local value for the signed-in user. */
  read(uid: string): T;
  /** Replace the local value (signal + localStorage). Must not call markChanged. */
  write(uid: string, value: T): void;
  /**
   * Combine both sides when they diverged (first sync on a device, or offline
   * edits while the cloud also changed). Default: the newer side wins.
   */
  merge?(local: T, remote: T): T;
}

interface SyncMeta {
  /** updated_at of the remote row we last saw / wrote (ms). */
  syncedAt?: number;
  /** When the local value last changed (ms). */
  changedAt?: number;
  dirty?: boolean;
}

const META_PREFIX = 'skill-sync-meta-v1';
const FLUSH_DELAY_MS = 2000;
const TABLE = 'user_skill_data';

/**
 * Syncs localStorage-backed skill data (flashcards, reading, listening,
 * writing, grammar) to Supabase `user_skill_data` for signed-in users.
 * Guests keep working purely from localStorage.
 *
 * If the table is missing (migration 17 not applied) sync disables itself
 * for the session and the app keeps working offline-only.
 */
@Injectable({ providedIn: 'root' })
export class SkillSyncService {
  private auth = inject(AuthService);
  private handlers = new Map<string, SkillSyncHandler<any>>();
  private uid: string | null = null;
  private pulled = new Set<string>();
  private flushTimer: ReturnType<typeof setTimeout> | null = null;
  private disabled = false;

  constructor() {
    effect(() => {
      const user = this.auth.currentUser();
      const uid = user && !user.isAnonymous ? user.uid : null;
      if (uid === this.uid) return;
      this.uid = uid;
      this.pulled.clear();
      if (uid) {
        for (const handler of this.handlers.values()) void this.pull(uid, handler);
      }
    });

    if (typeof window !== 'undefined') {
      window.addEventListener('pagehide', () => void this.flush());
    }
  }

  register<T>(handler: SkillSyncHandler<T>): void {
    this.handlers.set(handler.key, handler);
    if (this.uid && !this.pulled.has(handler.key)) void this.pull(this.uid, handler);
  }

  /** Call after every local write of a registered key. */
  markChanged(key: string): void {
    const uid = this.uid;
    if (!uid || !this.handlers.has(key)) return;
    this.updateMeta(uid, key, { dirty: true, changedAt: Date.now() });
    this.scheduleFlush();
  }

  private async pull(uid: string, handler: SkillSyncHandler<any>): Promise<void> {
    if (this.disabled) return;
    this.pulled.add(handler.key);

    const { data, error } = await supabaseClient
      .from(TABLE)
      .select('data, updated_at')
      .eq('user_id', uid)
      .eq('data_key', handler.key)
      .maybeSingle();

    if (error) return this.handleError('pull', error);
    if (this.uid !== uid) return;

    const meta = this.getMeta(uid, handler.key);
    const local = handler.read(uid);
    const localDirty = meta.dirty ?? (meta.syncedAt === undefined && !isEmpty(local));

    if (!data) {
      if (!isEmpty(local)) this.markDirtyAndFlush(uid, handler.key, meta.changedAt);
      return;
    }

    const remoteAt = new Date(data.updated_at).getTime();
    const remoteNewer = remoteAt > (meta.syncedAt ?? 0);

    if (!localDirty) {
      if (remoteNewer) {
        handler.write(uid, data.data);
        this.updateMeta(uid, handler.key, { syncedAt: remoteAt, dirty: false });
      }
      return;
    }

    if (!remoteNewer) {
      this.markDirtyAndFlush(uid, handler.key, meta.changedAt);
      return;
    }

    // Both sides changed since the last sync.
    const merged = handler.merge
      ? handler.merge(local, data.data)
      : (meta.changedAt ?? 0) >= remoteAt
        ? local
        : data.data;
    handler.write(uid, merged);
    this.updateMeta(uid, handler.key, { syncedAt: remoteAt });
    this.markDirtyAndFlush(uid, handler.key);
  }

  private markDirtyAndFlush(uid: string, key: string, changedAt?: number): void {
    this.updateMeta(uid, key, { dirty: true, changedAt: changedAt ?? Date.now() });
    this.scheduleFlush();
  }

  private scheduleFlush(): void {
    if (this.flushTimer) clearTimeout(this.flushTimer);
    this.flushTimer = setTimeout(() => void this.flush(), FLUSH_DELAY_MS);
  }

  private async flush(): Promise<void> {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }
    const uid = this.uid;
    if (!uid || this.disabled) return;

    const rows: { user_id: string; data_key: string; data: unknown; updated_at: string }[] = [];
    const stamps = new Map<string, number>();
    for (const handler of this.handlers.values()) {
      const meta = this.getMeta(uid, handler.key);
      if (!meta.dirty) continue;
      const at = meta.changedAt ?? Date.now();
      stamps.set(handler.key, at);
      rows.push({
        user_id: uid,
        data_key: handler.key,
        data: handler.read(uid),
        updated_at: new Date(at).toISOString(),
      });
    }
    if (rows.length === 0) return;

    const { error } = await supabaseClient
      .from(TABLE)
      .upsert(rows, { onConflict: 'user_id,data_key' });
    if (error) return this.handleError('push', error);

    for (const [key, at] of stamps) {
      // A newer local edit may have landed while the request was in flight.
      const meta = this.getMeta(uid, key);
      const stillDirty = (meta.changedAt ?? 0) > at;
      this.updateMeta(uid, key, { syncedAt: at, dirty: stillDirty });
    }
  }

  private handleError(op: string, error: { code?: string; message?: string }): void {
    // 42P01 = undefined_table, PGRST205 = table not in schema cache
    if (error.code === '42P01' || error.code === 'PGRST205') {
      console.warn(`[SkillSync] ${TABLE} not found, cloud sync disabled. Apply supabase-migrations/17-create-user-skill-data.sql`);
      this.disabled = true;
      return;
    }
    console.warn(`[SkillSync] ${op} failed:`, error.message ?? error);
  }

  private getMeta(uid: string, key: string): SyncMeta {
    return this.readAllMeta(uid)[key] ?? {};
  }

  private updateMeta(uid: string, key: string, patch: SyncMeta): void {
    const all = this.readAllMeta(uid);
    all[key] = { ...all[key], ...patch };
    try {
      localStorage.setItem(`${META_PREFIX}:${uid}`, JSON.stringify(all));
    } catch {
      // Quota or privacy mode: sync still works for this session via retries.
    }
  }

  private readAllMeta(uid: string): Record<string, SyncMeta> {
    try {
      return JSON.parse(localStorage.getItem(`${META_PREFIX}:${uid}`) || '{}');
    } catch {
      return {};
    }
  }
}

function isEmpty(value: unknown): boolean {
  if (value == null) return true;
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'object') return Object.keys(value as object).length === 0;
  return false;
}

/** Merge two id-keyed records, keeping the entry picked by `prefer` on conflict. */
export function mergeRecords<V>(
  local: Record<string, V>,
  remote: Record<string, V>,
  prefer: (a: V, b: V) => V
): Record<string, V> {
  const out: Record<string, V> = { ...remote };
  for (const [id, value] of Object.entries(local ?? {})) {
    out[id] = id in out ? prefer(value, out[id]) : value;
  }
  return out;
}
