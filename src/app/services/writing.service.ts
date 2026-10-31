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
import { SkillSyncService } from './skill-sync.service';

interface PromptsFile {
  version: number;
  updated: string;
  prompts: WritingPrompt[];
}

@Injectable({ providedIn: 'root' })
export class WritingService {
  private http = inject(HttpClient);
  private sync = inject(SkillSyncService);
  private cache$: Observable<WritingPrompt[]> | null = null;

  readonly prompts = signal<WritingPrompt[]>([]);
  readonly drafts = signal<Record<string, string>>({}); // promptId -> draft
  readonly attempts = signal<WritingAttempt[]>([]);

  constructor() {
    this.loadDrafts();
    this.loadAttempts();
    // Drafts can be cleared, so they sync newest-wins (no merge).
    this.sync.register<Record<string, string>>({
      key: WRITING_CONSTANTS.AUTO_SAVE_KEY,
      read: () => this.drafts(),
      write: (_uid, value) => {
        this.drafts.set(value ?? {});
        this.persistDrafts(value ?? {}, false);
      },
    });
    this.sync.register<WritingAttempt[]>({
      key: WRITING_CONSTANTS.ATTEMPTS_KEY,
      read: () => this.attempts(),
      write: (_uid, value) => {
        const revived = reviveAttempts(value);
        this.attempts.set(revived);
        this.persistAttempts(revived, false);
      },
      merge: (local, remote) => {
        const byId = new Map<string, WritingAttempt>();
        for (const a of [...(remote ?? []), ...(local ?? [])]) byId.set(a.id, a);
        return Array.from(byId.values())
          .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())
          .slice(0, WRITING_CONSTANTS.MAX_ATTEMPTS_STORED);
      },
    });
  }

  getAllPrompts(): Observable<WritingPrompt[]> {
    if (!this.cache$) {
      this.cache$ = this.http.get<PromptsFile>('data/writing/prompts.json').pipe(
        map((file) => file.prompts || []),
        shareReplay(1)
      );
    }
    // Fallback lives outside the cached stream: a failed load is not cached, so the
    // next call retries instead of serving [] for the rest of the visit.
    const cache$ = this.cache$;
    return cache$.pipe(
      catchError((err) => {
        console.error('[WritingService] Failed to load prompts:', err);
        if (this.cache$ === cache$) this.cache$ = null;
        return of([] as WritingPrompt[]);
      })
    );
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
    this.persistDrafts(next);
  }

  loadDraft(promptId: string): string {
    return this.drafts()[promptId] || '';
  }

  clearDraft(promptId: string): void {
    const current = this.drafts();
    const next = { ...current };
    delete next[promptId];
    this.drafts.set(next);
    this.persistDrafts(next);
  }

  recordAttempt(attempt: WritingAttempt): void {
    const current = this.attempts();
    const next = [attempt, ...current].slice(0, WRITING_CONSTANTS.MAX_ATTEMPTS_STORED);
    this.attempts.set(next);
    this.persistAttempts(next);
  }

  private persistDrafts(drafts: Record<string, string>, notifySync = true): void {
    try {
      localStorage.setItem(WRITING_CONSTANTS.AUTO_SAVE_KEY, JSON.stringify(drafts));
    } catch (err) {
      console.warn('[WritingService] Could not persist drafts', err);
    }
    if (notifySync) this.sync.markChanged(WRITING_CONSTANTS.AUTO_SAVE_KEY);
  }

  private persistAttempts(attempts: WritingAttempt[], notifySync = true): void {
    try {
      localStorage.setItem(WRITING_CONSTANTS.ATTEMPTS_KEY, JSON.stringify(attempts));
    } catch (err) {
      console.warn('[WritingService] Could not persist attempt', err);
    }
    if (notifySync) this.sync.markChanged(WRITING_CONSTANTS.ATTEMPTS_KEY);
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
      this.attempts.set(reviveAttempts(JSON.parse(raw)));
    } catch (err) {
      console.warn('[WritingService] Could not load attempts', err);
    }
  }
}

function reviveAttempts(raw: WritingAttempt[]): WritingAttempt[] {
  return (raw ?? []).map((a) => ({
    ...a,
    startedAt: a.startedAt ? new Date(a.startedAt) : a.startedAt,
    submittedAt: a.submittedAt ? new Date(a.submittedAt) : a.submittedAt,
  }));
}
