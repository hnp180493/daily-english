import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, firstValueFrom, of } from 'rxjs';
import { catchError, map, shareReplay } from 'rxjs/operators';
import { LISTENING_CONSTANTS, ListeningProgress, ListeningTrack } from '../models/listening.model';

interface TracksFile {
  version: number;
  updated: string;
  tracks: ListeningTrack[];
}

@Injectable({ providedIn: 'root' })
export class ListeningService {
  private http = inject(HttpClient);
  private cache$: Observable<ListeningTrack[]> | null = null;

  readonly tracks = signal<ListeningTrack[]>([]);
  readonly progress = signal<Record<string, ListeningProgress>>({});

  constructor() {
    this.loadProgress();
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

  private saveProgress(progress: Record<string, ListeningProgress>): void {
    try {
      localStorage.setItem(LISTENING_CONSTANTS.STORAGE_KEY, JSON.stringify(progress));
    } catch (err) {
      console.warn('[ListeningService] Could not persist progress', err);
    }
  }

  private loadProgress(): void {
    try {
      const raw = localStorage.getItem(LISTENING_CONSTANTS.STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Record<string, ListeningProgress>;
      for (const key of Object.keys(parsed)) {
        if (parsed[key].listenedAt) parsed[key].listenedAt = new Date(parsed[key].listenedAt);
      }
      this.progress.set(parsed);
    } catch (err) {
      console.warn('[ListeningService] Could not load progress', err);
    }
  }
}
