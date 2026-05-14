import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, firstValueFrom, of } from 'rxjs';
import { catchError, map, shareReplay } from 'rxjs/operators';
import { READING_CONSTANTS, ReadingPassage, ReadingProgress, ReadingQuizAnswer } from '../models/reading.model';

interface PassagesFile {
  version: number;
  updated: string;
  passages: ReadingPassage[];
}

@Injectable({ providedIn: 'root' })
export class ReadingService {
  private http = inject(HttpClient);
  private cache$: Observable<ReadingPassage[]> | null = null;

  readonly passages = signal<ReadingPassage[]>([]);
  readonly progressByPassage = signal<Record<string, ReadingProgress>>({});

  constructor() {
    this.loadProgress();
  }

  getAllPassages(): Observable<ReadingPassage[]> {
    if (!this.cache$) {
      this.cache$ = this.http.get<PassagesFile>('data/reading/passages.json').pipe(
        map((file) => file.passages || []),
        catchError((err) => {
          console.error('[ReadingService] Failed to load passages:', err);
          return of([] as ReadingPassage[]);
        }),
        shareReplay(1)
      );
    }
    return this.cache$;
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

  private saveProgress(progress: Record<string, ReadingProgress>): void {
    try {
      localStorage.setItem(READING_CONSTANTS.STORAGE_KEY, JSON.stringify(progress));
    } catch (err) {
      console.warn('[ReadingService] Could not persist reading progress', err);
    }
  }

  private loadProgress(): void {
    try {
      const raw = localStorage.getItem(READING_CONSTANTS.STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Record<string, ReadingProgress>;
      // Revive Date fields
      for (const key of Object.keys(parsed)) {
        const p = parsed[key];
        if (p.startedAt) p.startedAt = new Date(p.startedAt);
        if (p.completedAt) p.completedAt = new Date(p.completedAt);
      }
      this.progressByPassage.set(parsed);
    } catch (err) {
      console.warn('[ReadingService] Could not load reading progress', err);
    }
  }
}
