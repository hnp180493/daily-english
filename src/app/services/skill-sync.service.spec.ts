import { TestBed, fakeAsync, flushMicrotasks, tick } from '@angular/core/testing';
import { signal } from '@angular/core';
import { AuthService } from './auth.service';
import { SkillSyncService, SkillSyncHandler, mergeRecords } from './skill-sync.service';
import { supabaseClient } from './supabase.client';

interface RemoteRow {
  data: unknown;
  updated_at: string;
}

/** Minimal stand-in for the PostgREST query builder used by SkillSyncService. */
function fakeTable(opts: { row?: RemoteRow | null; selectError?: { code: string; message: string } }) {
  const upserts: any[][] = [];
  const builder: any = {
    select: () => builder,
    eq: () => builder,
    maybeSingle: () => Promise.resolve({ data: opts.row ?? null, error: opts.selectError ?? null }),
    upsert: (rows: any[]) => {
      upserts.push(rows);
      return Promise.resolve({ error: null });
    },
  };
  spyOn(supabaseClient, 'from').and.returnValue(builder);
  return upserts;
}

function memoryHandler<T>(key: string, initial: T, merge?: (l: T, r: T) => T) {
  const state = { value: initial, writes: [] as T[] };
  const handler: SkillSyncHandler<T> = {
    key,
    read: () => state.value,
    write: (_uid, v) => {
      state.value = v;
      state.writes.push(v);
    },
    merge,
  };
  return { handler, state };
}

describe('SkillSyncService', () => {
  const uid = 'user-1';
  let currentUser: ReturnType<typeof signal<any>>;

  function setup(): SkillSyncService {
    currentUser = signal<any>(null);
    TestBed.configureTestingModule({
      providers: [{ provide: AuthService, useValue: { currentUser } }],
    });
    return TestBed.inject(SkillSyncService);
  }

  function signIn() {
    currentUser.set({ uid, isAnonymous: false });
    TestBed.tick();
  }

  beforeEach(() => localStorage.clear());
  afterEach(() => localStorage.clear());

  it('applies a newer remote value when nothing changed locally', fakeAsync(() => {
    const sync = setup();
    fakeTable({ row: { data: { a: 1 }, updated_at: new Date().toISOString() } });
    const { handler, state } = memoryHandler<Record<string, number>>('k', {});
    sync.register(handler);
    signIn();
    flushMicrotasks();
    expect(state.value).toEqual({ a: 1 });
  }));

  it('uploads existing local data when the cloud has no row yet', fakeAsync(() => {
    const sync = setup();
    const upserts = fakeTable({ row: null });
    const { handler } = memoryHandler('k', { local: true });
    sync.register(handler);
    signIn();
    flushMicrotasks();
    tick(2000);
    flushMicrotasks();
    expect(upserts.length).toBe(1);
    expect(upserts[0][0]).toEqual(jasmine.objectContaining({ user_id: uid, data_key: 'k', data: { local: true } }));
  }));

  it('merges when both sides have data on first sync and pushes the result', fakeAsync(() => {
    const sync = setup();
    const upserts = fakeTable({ row: { data: { r: 1 }, updated_at: new Date().toISOString() } });
    const { handler, state } = memoryHandler<Record<string, number>>('k', { l: 2 }, (l, r) => ({ ...r, ...l }));
    sync.register(handler);
    signIn();
    flushMicrotasks();
    expect(state.value).toEqual({ r: 1, l: 2 });
    tick(2000);
    flushMicrotasks();
    expect(upserts[0][0].data).toEqual({ r: 1, l: 2 });
  }));

  it('does not sync for guests', fakeAsync(() => {
    const sync = setup();
    const upserts = fakeTable({ row: null });
    const { handler } = memoryHandler('k', { x: 1 });
    sync.register(handler);
    sync.markChanged('k');
    tick(2000);
    flushMicrotasks();
    expect(supabaseClient.from).not.toHaveBeenCalled();
    expect(upserts.length).toBe(0);
  }));

  it('disables itself quietly when the table is missing', fakeAsync(() => {
    const sync = setup();
    const upserts = fakeTable({ selectError: { code: 'PGRST205', message: 'not found' } });
    spyOn(console, 'warn');
    const { handler, state } = memoryHandler('k', { x: 1 });
    sync.register(handler);
    signIn();
    flushMicrotasks();
    sync.markChanged('k');
    tick(2000);
    flushMicrotasks();
    expect(upserts.length).toBe(0);
    expect(state.value).toEqual({ x: 1 });
    expect(console.warn).toHaveBeenCalled();
  }));
});

describe('mergeRecords', () => {
  it('keeps entries from both sides and resolves conflicts with prefer()', () => {
    const merged = mergeRecords({ a: 1, b: 5 }, { b: 3, c: 7 }, (x, y) => Math.max(x, y));
    expect(merged).toEqual({ a: 1, b: 5, c: 7 });
  });
});
