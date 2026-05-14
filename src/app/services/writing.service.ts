import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, firstValueFrom, of } from 'rxjs';
import { catchError, map, shareReplay } from 'rxjs/operators';
import {
  WRITING_CONSTANTS,
  WritingAttempt,
  WritingFeedback,
  WritingPrompt,
} from '../models/writing.model';

interface PromptsFile {
  version: number;
  updated: string;
  prompts: WritingPrompt[];
}

@Injectable({ providedIn: 'root' })
export class WritingService {
  private http = inject(HttpClient);
  private cache$: Observable<WritingPrompt[]> | null = null;

  readonly prompts = signal<WritingPrompt[]>([]);
  readonly drafts = signal<Record<string, string>>({}); // promptId -> draft
  readonly attempts = signal<WritingAttempt[]>([]);

  constructor() {
    this.loadDrafts();
    this.loadAttempts();
  }

  getAllPrompts(): Observable<WritingPrompt[]> {
    if (!this.cache$) {
      this.cache$ = this.http.get<PromptsFile>('data/writing/prompts.json').pipe(
        map((file) => file.prompts || []),
        catchError((err) => {
          console.error('[WritingService] Failed to load prompts:', err);
          return of([] as WritingPrompt[]);
        }),
        shareReplay(1)
      );
    }
    return this.cache$;
  }

  async loadAll(): Promise<WritingPrompt[]> {
    const prompts = await firstValueFrom(this.getAllPrompts());
    this.prompts.set(prompts);
    return prompts;
  }

  getPromptBySlug(slug: string): Observable<WritingPrompt | null> {
    return this.getAllPrompts().pipe(
      map((items) => items.find((p) => p.slug === slug || p.id === slug) || null)
    );
  }

  saveDraft(promptId: string, text: string): void {
    const current = this.drafts();
    const next = { ...current, [promptId]: text };
    this.drafts.set(next);
    try {
      localStorage.setItem(WRITING_CONSTANTS.AUTO_SAVE_KEY, JSON.stringify(next));
    } catch (err) {
      console.warn('[WritingService] Could not persist draft', err);
    }
  }

  loadDraft(promptId: string): string {
    return this.drafts()[promptId] || '';
  }

  clearDraft(promptId: string): void {
    const current = this.drafts();
    const next = { ...current };
    delete next[promptId];
    this.drafts.set(next);
    try {
      localStorage.setItem(WRITING_CONSTANTS.AUTO_SAVE_KEY, JSON.stringify(next));
    } catch (err) {
      console.warn('[WritingService] Could not clear draft', err);
    }
  }

  recordAttempt(attempt: WritingAttempt): void {
    const current = this.attempts();
    const next = [attempt, ...current].slice(0, WRITING_CONSTANTS.MAX_ATTEMPTS_STORED);
    this.attempts.set(next);
    try {
      localStorage.setItem(WRITING_CONSTANTS.ATTEMPTS_KEY, JSON.stringify(next));
    } catch (err) {
      console.warn('[WritingService] Could not persist attempt', err);
    }
  }

  getBestScoreForPrompt(promptId: string): number | null {
    const attempts = this.attempts().filter((a) => a.promptId === promptId && a.feedback);
    if (attempts.length === 0) return null;
    return Math.max(...attempts.map((a) => a.feedback!.overallBand));
  }

  countWords(text: string): number {
    return text.trim().split(/\s+/).filter(Boolean).length;
  }

  private loadDrafts(): void {
    try {
      const raw = localStorage.getItem(WRITING_CONSTANTS.AUTO_SAVE_KEY);
      if (raw) this.drafts.set(JSON.parse(raw));
    } catch (err) {
      console.warn('[WritingService] Could not load drafts', err);
    }
  }

  private loadAttempts(): void {
    try {
      const raw = localStorage.getItem(WRITING_CONSTANTS.ATTEMPTS_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as WritingAttempt[];
      for (const a of parsed) {
        if (a.startedAt) a.startedAt = new Date(a.startedAt);
        if (a.submittedAt) a.submittedAt = new Date(a.submittedAt);
      }
      this.attempts.set(parsed);
    } catch (err) {
      console.warn('[WritingService] Could not load attempts', err);
    }
  }
}
