import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, firstValueFrom, of } from 'rxjs';
import { catchError, map, shareReplay } from 'rxjs/operators';
import { LISTENING_CONSTANTS, ListeningProgress, ListeningTrack } from '../models/listening.model';
import { SkillSyncService, mergeRecords } from './skill-sync.service';

interface TracksFile {
  version: number;
  updated: string;
  tracks: ListeningTrack[];
}

@Injectable({ providedIn: 'root' })
export class ListeningService {
  private http = inject(HttpClient);
  private sync = inject(SkillSyncService);
  private cache$: Observable<ListeningTrack[]> | null = null;

  readonly tracks = signal<ListeningTrack[]>([]);
  readonly progress = signal<Record<string, ListeningProgress>>({});

  constructor() {
    this.loadProgress();
    this.sync.register<Record<string, ListeningProgress>>({
      key: LISTENING_CONSTANTS.STORAGE_KEY,
      read: () => this.progress(),
      write: (_uid, value) => {
        const revived = reviveProgress(value);
        this.progress.set(revived);
        this.saveProgress(revived, false);
      },
      merge: (local, remote) =>
        mergeRecords(local, remote, (a, b) => {
          const latest = new Date(a.listenedAt ?? 0) >= new Date(b.listenedAt ?? 0) ? a : b;
          return { ...latest, bestScore: Math.max(a.bestScore ?? 0, b.bestScore ?? 0) };
        }),
    });
  }

  getAllTracks(): Observable<ListeningTrack[]> {
    if (!this.cache$) {
      this.cache$ = this.http.get<TracksFile>('data/listening/tracks.json').pipe(
        map((file) => file.tracks || []),
        catchError((err) => {
          console.error('[ListeningService] Failed to load tracks:', err);
          return of([] as ListeningTrack[]);
        }),
        shareReplay(1)
      );
    }
    return this.cache$;
  }

  async loadAll(): Promise<ListeningTrack[]> {
    const tracks = await firstValueFrom(this.getAllTracks());
    this.tracks.set(tracks);
    return tracks;
  }

  getTrackBySlug(slug: string): Observable<ListeningTrack | null> {
    return this.getAllTracks().pipe(
      map((items) => items.find((t) => t.slug === slug || t.id === slug) || null)
    );
  }

  recordQuiz(trackId: string, score: number): void {
    const current = this.progress();
    const existing = current[trackId];
    const next: ListeningProgress = {
      trackId,
      listenedAt: new Date(),
      quizScore: score,
      bestScore: Math.max(existing?.bestScore ?? 0, score),
    };
    const updated = { ...current, [trackId]: next };
    this.progress.set(updated);
    this.saveProgress(updated);
  }

  bestScore(trackId: string): number | null {
    return this.progress()[trackId]?.bestScore ?? null;
  }

  private saveProgress(progress: Record<string, ListeningProgress>, notifySync = true): void {
    try {
      localStorage.setItem(LISTENING_CONSTANTS.STORAGE_KEY, JSON.stringify(progress));
    } catch (err) {
      console.warn('[ListeningService] Could not persist progress', err);
    }
    if (notifySync) this.sync.markChanged(LISTENING_CONSTANTS.STORAGE_KEY);
  }

  private loadProgress(): void {
    try {
      const raw = localStorage.getItem(LISTENING_CONSTANTS.STORAGE_KEY);
      if (!raw) return;
      this.progress.set(reviveProgress(JSON.parse(raw)));
    } catch (err) {
      console.warn('[ListeningService] Could not load progress', err);
    }
  }
}

function reviveProgress(raw: Record<string, ListeningProgress>): Record<string, ListeningProgress> {
  const out: Record<string, ListeningProgress> = {};
  for (const [key, p] of Object.entries(raw ?? {})) {
    out[key] = { ...p, listenedAt: p.listenedAt ? new Date(p.listenedAt) : p.listenedAt };
  }
  return out;
}
