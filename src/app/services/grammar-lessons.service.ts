import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, firstValueFrom, of } from 'rxjs';
import { catchError, map, shareReplay } from 'rxjs/operators';
import { ErrorPattern, GrammarLesson, WeakPoint } from '../models/review.model';

interface LessonsFile {
  version: number;
  updated: string;
  lessons: GrammarLesson[];
}

const LEARNED_STORAGE_KEY = 'grammar-lessons-learned-v1';

@Injectable({ providedIn: 'root' })
export class GrammarLessonsService {
  private http = inject(HttpClient);
  private cache$: Observable<GrammarLesson[]> | null = null;

  readonly lessons = signal<GrammarLesson[]>([]);

  /** Set of lesson IDs the user has marked as learned. Persisted to localStorage. */
  readonly learnedIds = signal<Set<string>>(new Set());

  readonly learnedCount = computed(() => this.learnedIds().size);

  constructor() {
    this.loadLearned();
  }

  getAllLessons(): Observable<GrammarLesson[]> {
    if (!this.cache$) {
      this.cache$ = this.http.get<LessonsFile>('data/grammar-lessons/lessons.json').pipe(
        map((file) => file.lessons || []),
        catchError((err) => {
          console.error('[GrammarLessonsService] Failed to load lessons:', err);
          return of([] as GrammarLesson[]);
        }),
        shareReplay(1)
      );
    }
    return this.cache$;
  }

  async loadAll(): Promise<GrammarLesson[]> {
    const lessons = await firstValueFrom(this.getAllLessons());
    this.lessons.set(lessons);
    return lessons;
  }

  getLessonBySlug(slug: string): Observable<GrammarLesson | null> {
    return this.getAllLessons().pipe(
      map((lessons) => lessons.find((l) => l.slug === slug || l.id === slug) || null)
    );
  }

  /**
   * Suggest lessons relevant to an ErrorPattern.
   * Matches against `errorPatternKeys` (preferred) or falls back to type/category fuzzy match.
   */
  suggestForPattern(pattern: ErrorPattern): Observable<GrammarLesson[]> {
    return this.getAllLessons().pipe(
      map((lessons) => this.matchPattern(lessons, pattern.type, pattern.description))
    );
  }

  /**
   * Suggest lessons relevant to a WeakPoint.category.
   */
  suggestForWeakPoint(weakPoint: WeakPoint): Observable<GrammarLesson[]> {
    return this.getAllLessons().pipe(
      map((lessons) => this.matchPattern(lessons, weakPoint.category, weakPoint.description))
    );
  }

  // -----------------------------
  // Learned tracking (local-only)
  // -----------------------------

  isLearned(lessonId: string): boolean {
    return this.learnedIds().has(lessonId);
  }

  markAsLearned(lessonId: string): void {
    this.learnedIds.update((set) => {
      const next = new Set(set);
      next.add(lessonId);
      return next;
    });
    this.saveLearned();
  }

  unmarkAsLearned(lessonId: string): void {
    this.learnedIds.update((set) => {
      const next = new Set(set);
      next.delete(lessonId);
      return next;
    });
    this.saveLearned();
  }

  toggleLearned(lessonId: string): boolean {
    const learned = this.isLearned(lessonId);
    if (learned) this.unmarkAsLearned(lessonId);
    else this.markAsLearned(lessonId);
    return !learned;
  }

  private loadLearned(): void {
    if (typeof localStorage === 'undefined') return;
    try {
      const raw = localStorage.getItem(LEARNED_STORAGE_KEY);
      if (!raw) return;
      const ids = JSON.parse(raw);
      if (Array.isArray(ids)) {
        this.learnedIds.set(new Set(ids.filter((x) => typeof x === 'string')));
      }
    } catch (err) {
      console.warn('[GrammarLessonsService] Failed to load learned set', err);
    }
  }

  private saveLearned(): void {
    if (typeof localStorage === 'undefined') return;
    try {
      const ids = Array.from(this.learnedIds());
      localStorage.setItem(LEARNED_STORAGE_KEY, JSON.stringify(ids));
    } catch (err) {
      console.warn('[GrammarLessonsService] Failed to persist learned set', err);
    }
  }

  private matchPattern(lessons: GrammarLesson[], ...searchTerms: string[]): GrammarLesson[] {
    const haystack = searchTerms
      .filter(Boolean)
      .map((s) => s.toLowerCase())
      .join(' ');
    if (!haystack) return [];

    const matches: { lesson: GrammarLesson; score: number }[] = [];
    for (const lesson of lessons) {
      let score = 0;
      const keys = lesson.errorPatternKeys || [];
      for (const key of keys) {
        if (haystack.includes(key.toLowerCase())) {
          score += 3;
        }
      }
      if (lesson.relatedErrorPattern && haystack.includes(lesson.relatedErrorPattern.toLowerCase())) {
        score += 2;
      }
      if (lesson.category && haystack.includes(lesson.category.toLowerCase())) {
        score += 1;
      }
      if (score > 0) {
        matches.push({ lesson, score });
      }
    }
    matches.sort((a, b) => b.score - a.score);
    return matches.map((m) => m.lesson);
  }
}
