import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, firstValueFrom, of } from 'rxjs';
import { catchError, map, shareReplay } from 'rxjs/operators';
import { READING_CONSTANTS, ReadingPassage, ReadingProgress, ReadingQuizAnswer } from '../models/reading.model';
import { SkillSyncService, mergeRecords } from './skill-sync.service';

interface PassagesFile {
  version: number;
  updated: string;
  passages: ReadingPassage[];
}

@Injectable({ providedIn: 'root' })
export class ReadingService {
  private http = inject(HttpClient);
  private sync = inject(SkillSyncService);
  private cache$: Observable<ReadingPassage[]> | null = null;

  readonly passages = signal<ReadingPassage[]>([]);
  readonly progressByPassage = signal<Record<string, ReadingProgress>>({});

  constructor() {
    this.loadProgress();
    this.sync.register<Record<string, ReadingProgress>>({
      key: READING_CONSTANTS.STORAGE_KEY,
      read: () => this.progressByPassage(),
      write: (_uid, value) => {
        const revived = reviveProgress(value);
        this.progressByPassage.set(revived);
        this.saveProgress(revived, false);
      },
      merge: (local, remote) =>
        mergeRecords(local, remote, (a, b) =>
          new Date(a.completedAt ?? 0) >= new Date(b.completedAt ?? 0) ? a : b
        ),
    });
  }

  getAllPassages(): Observable<ReadingPassage[]> {
    if (!this.cache$) {
      this.cache$ = this.http.get<PassagesFile>('data/reading/passages.json').pipe(
        map((file) => file.passages || []),
        shareReplay(1)
      );
    }
    // Fallback lives outside the cached stream: a failed load is not cached, so the
    // next call retries instead of serving [] for the rest of the visit.
    const cache$ = this.cache$;
    return cache$.pipe(
      catchError((err) => {
        console.error('[ReadingService] Failed to load passages:', err);
        if (this.cache$ === cache$) this.cache$ = null;
        return of([] as ReadingPassage[]);
      })
    );
  }

  async loadAll(): Promise<ReadingPassage[]> {
    const passages = await firstValueFrom(this.getAllPassages());
    this.passages.set(passages);
    return passages;
  }

  getPassageBySlug(slug: string): Observable<ReadingPassage | null> {
    return this.getAllPassages().pipe(
      map((items) => items.find((p) => p.slug === slug || p.id === slug) || null)
    );
  }

  recordQuizCompletion(
    passageId: string,
    answers: ReadingQuizAnswer[],
    score: number
  ): void {
    const current = this.progressByPassage();
    const existing = current[passageId];
    const updated: ReadingProgress = {
      passageId,
      startedAt: existing?.startedAt ?? new Date(),
      completedAt: new Date(),
      quizScore: score,
      quizAnswers: answers,
    };
    const next = { ...current, [passageId]: updated };
    this.progressByPassage.set(next);
    this.saveProgress(next);
  }

  getProgress(passageId: string): ReadingProgress | undefined {
    return this.progressByPassage()[passageId];
  }

  private saveProgress(progress: Record<string, ReadingProgress>, notifySync = true): void {
    try {
      localStorage.setItem(READING_CONSTANTS.STORAGE_KEY, JSON.stringify(progress));
    } catch (err) {
      console.warn('[ReadingService] Could not persist reading progress', err);
    }
    if (notifySync) this.sync.markChanged(READING_CONSTANTS.STORAGE_KEY);
  }

  private loadProgress(): void {
    try {
      const raw = localStorage.getItem(READING_CONSTANTS.STORAGE_KEY);
      if (!raw) return;
      this.progressByPassage.set(reviveProgress(JSON.parse(raw)));
    } catch (err) {
      console.warn('[ReadingService] Could not load reading progress', err);
    }
  }
}

function reviveProgress(raw: Record<string, ReadingProgress>): Record<string, ReadingProgress> {
  const out: Record<string, ReadingProgress> = {};
  for (const [key, p] of Object.entries(raw ?? {})) {
    out[key] = {
      ...p,
      startedAt: p.startedAt ? new Date(p.startedAt) : p.startedAt,
      completedAt: p.completedAt ? new Date(p.completedAt) : p.completedAt,
    };
  }
  return out;
}
