import { Injectable, inject, signal, computed, effect } from '@angular/core';
import { Observable, of, from } from 'rxjs';
import { map, tap, catchError, switchMap } from 'rxjs/operators';
import {
  Flashcard,
  FlashcardFilter,
  FlashcardStats,
  FlashcardMasteryLevel,
  FLASHCARD_DEFAULTS,
  FSRS_CONSTANTS,
  ReviewRating,
  SPACED_REPETITION_CONSTANTS,
} from '../models/memory-retention.model';
import { AuthService } from './auth.service';
import { FsrsService } from './fsrs.service';

/**
 * FlashcardService manages flashcard operations with spaced repetition algorithm.
 * Uses signal-based state management for reactive updates.
 *
 * Requirements: 3.1, 3.4, 3.5, 3.6, 3.7, 5.2, 5.6, 5.7, 7.1, 7.2, 7.3, 7.5
 */
@Injectable({
  providedIn: 'root'
})
export class FlashcardService {
  private authService = inject(AuthService);
  private fsrs = inject(FsrsService);

  // Private signal for flashcard state
  private flashcardsSignal = signal<Flashcard[]>([]);
  private isInitialized = signal(false);

  // Storage key for localStorage - includes user ID for separation
  private readonly STORAGE_KEY_PREFIX = 'flashcards';

  // Expose as readonly signal
  readonly allFlashcards = this.flashcardsSignal.asReadonly();

  /**
   * Computed signal for cards due for review.
   * Requirements: 7.5 - Include all cards where nextReviewDate <= currentDate
   * Requirements: 5.2 - Sort by urgency (nextReviewDate ascending)
   */
  readonly dueFlashcards = computed(() => {
    const now = new Date();
    return this.flashcardsSignal()
      .filter(card => !card.suspended)
      .filter(card => new Date(card.nextReviewDate) <= now)
      .sort(
        (a, b) =>
          new Date(a.nextReviewDate).getTime() - new Date(b.nextReviewDate).getTime()
      );
  });

  /**
   * Cards marked as leeches — repeatedly failed in review state, candidate for
   * re-learning or suspension.
   */
  readonly leechFlashcards = computed(() =>
    this.flashcardsSignal().filter((card) => (card.lapses ?? 0) >= FSRS_CONSTANTS.LEECH_THRESHOLD)
  );

  /**
   * Computed signal for flashcard statistics.
   * Requirements: 3.8 - Show total cards, cards due for review, and mastery percentage
   */
  readonly stats = computed<FlashcardStats>(() => ({
    total: this.flashcardsSignal().length,
    due: this.dueFlashcards().length,
    mastery: this.calculateMastery()
  }));

  constructor() {
    // Initialize and watch for auth changes
    this.initializeService();
  }

  /**
   * Initialize service and set up auth change listener.
   */
  private async initializeService(): Promise<void> {
    // Wait for auth to be ready
    await this.authService.waitForAuth();
    
    // Load flashcards for current user
    this.loadFlashcards();
    this.isInitialized.set(true);
    
    // Watch for auth changes to reload flashcards
    effect(() => {
      const user = this.authService.currentUser();
      if (this.isInitialized()) {
        console.log('[FlashcardService] Auth changed, reloading flashcards for user:', user?.email || 'guest');
        this.loadFlashcards();
      }
    });
  }

  /**
   * Get storage key based on current user.
   */
  private getStorageKey(): string {
    const user = this.authService.currentUser();
    if (user?.uid) {
      return `${this.STORAGE_KEY_PREFIX}_${user.uid}`;
    }
    return `${this.STORAGE_KEY_PREFIX}_guest`;
  }

  /**
   * Add new flashcards to the collection.
   * Requirements: 3.1 - Automatically generate flashcards from content
   * Requirements: 3.7 - Persist to storage
   */
  addFlashcards(cards: Partial<Flashcard>[]): Observable<void> {
    const now = new Date();
    const newCards: Flashcard[] = cards.map(card => ({
      id: card.id || this.generateId(),
      front: card.front || '',
      back: card.back || '',
      example: card.example, // English example sentence
      exerciseId: card.exerciseId || '',
      category: card.category,
      createdAt: card.createdAt || now,
      easeFactor: card.easeFactor ?? FLASHCARD_DEFAULTS.easeFactor,
      interval: card.interval ?? FLASHCARD_DEFAULTS.interval,
      nextReviewDate: card.nextReviewDate || now,
      reviewCount: card.reviewCount ?? FLASHCARD_DEFAULTS.reviewCount,
      lastReviewDate: card.lastReviewDate
    }));

    // Filter out duplicates based on front text and exerciseId
    const existingCards = this.flashcardsSignal();
    const uniqueNewCards = newCards.filter(
      newCard =>
        !existingCards.some(
          existing =>
            existing.front === newCard.front && existing.exerciseId === newCard.exerciseId
        )
    );

    if (uniqueNewCards.length === 0) {
      return of(undefined);
    }

    this.flashcardsSignal.update(existing => [...existing, ...uniqueNewCards]);
    return this.persist();
  }

  /**
   * Apply a 4-button FSRS rating (1=Again, 2=Hard, 3=Good, 4=Easy) and persist.
   * Preferred over the legacy `markCard` boolean — supports the modern study UI.
   */
  rateCard(cardId: string, rating: ReviewRating): Observable<void> {
    this.flashcardsSignal.update((cards) =>
      cards.map((card) => {
        if (card.id !== cardId) return card;
        const migrated = this.fsrs.migrateFromLegacy(card);
        return this.fsrs.schedule(migrated, rating);
      })
    );
    return this.persist();
  }

  /**
   * Toggle suspended state — suspended cards drop out of `dueFlashcards`.
   * Used for leech management and user-initiated pausing.
   */
  setSuspended(cardId: string, suspended: boolean): Observable<void> {
    this.flashcardsSignal.update((cards) =>
      cards.map((c) => (c.id === cardId ? { ...c, suspended } : c))
    );
    return this.persist();
  }

  /**
   * Reset a card to "new" state — useful for cards that became leeches.
   */
  resetCard(cardId: string): Observable<void> {
    this.flashcardsSignal.update((cards) =>
      cards.map((c) =>
        c.id === cardId
          ? {
              ...c,
              state: 'new',
              stability: 0,
              difficulty: 5,
              lapses: 0,
              learningStep: 0,
              reviewCount: 0,
              interval: 0,
              easeFactor: FLASHCARD_DEFAULTS.easeFactor,
              nextReviewDate: new Date(),
              suspended: false,
            }
          : c
      )
    );
    return this.persist();
  }

  /**
   * Update arbitrary fields of a flashcard (used for custom card edit + tag changes).
   */
  updateCard(cardId: string, patch: Partial<Flashcard>): Observable<void> {
    this.flashcardsSignal.update((cards) => cards.map((c) => (c.id === cardId ? { ...c, ...patch } : c)));
    return this.persist();
  }

  /**
   * Create a manually-added flashcard (vs the auto-generated ones from exercises).
   */
  createCustomCard(input: {
    front: string;
    back: string;
    example?: string;
    category?: string;
    tags?: string[];
  }): Observable<Flashcard> {
    const now = new Date();
    const card: Flashcard = {
      id: this.generateId(),
      front: input.front.trim(),
      back: input.back.trim(),
      example: input.example?.trim(),
      exerciseId: '',
      category: input.category,
      tags: input.tags,
      customCreated: true,
      createdAt: now,
      easeFactor: FLASHCARD_DEFAULTS.easeFactor,
      interval: FLASHCARD_DEFAULTS.interval,
      nextReviewDate: now,
      reviewCount: FLASHCARD_DEFAULTS.reviewCount,
      state: 'new',
      stability: 0,
      difficulty: 5,
      lapses: 0,
    };
    this.flashcardsSignal.update((existing) => [...existing, card]);
    return this.persist().pipe(map(() => card));
  }

  /**
   * Batch-add vocabulary items as custom flashcards. Used by Reading / Listening
   * pages where each passage/track has a vocabulary list the user can save.
   *
   * Deduplicates by lowercase `front` against the current deck — repeats are
   * skipped silently. Returns counts so the caller can toast the result.
   */
  addFromVocabList(
    items: { word: string; meaning: string; example?: string }[],
    options: { tag?: string; category?: string } = {}
  ): { added: number; skipped: number } {
    const existing = new Set(this.flashcardsSignal().map((c) => c.front.toLowerCase()));
    const now = new Date();
    const newCards: Flashcard[] = [];

    for (const item of items) {
      const front = (item.word || '').trim();
      const back = (item.meaning || '').trim();
      if (!front || !back) continue;
      if (existing.has(front.toLowerCase())) continue;
      existing.add(front.toLowerCase()); // avoid duplicates within the same batch too

      newCards.push({
        id: this.generateId(),
        front,
        back,
        example: item.example?.trim(),
        exerciseId: '',
        category: options.category,
        tags: options.tag ? [options.tag] : undefined,
        customCreated: true,
        createdAt: now,
        easeFactor: FLASHCARD_DEFAULTS.easeFactor,
        interval: FLASHCARD_DEFAULTS.interval,
        nextReviewDate: now,
        reviewCount: FLASHCARD_DEFAULTS.reviewCount,
        state: 'new',
        stability: 0,
        difficulty: 5,
        lapses: 0,
      });
    }

    if (newCards.length > 0) {
      this.flashcardsSignal.update((existingCards) => [...existingCards, ...newCards]);
      this.persist().subscribe();
    }

    return { added: newCards.length, skipped: items.length - newCards.length };
  }

  /**
   * Check whether the user already has a card with this front (lowercase match).
   * Used to swap "Add" → "Added" in UIs that surface vocabulary lists.
   */
  hasCardForWord(word: string): boolean {
    if (!word) return false;
    const target = word.trim().toLowerCase();
    return this.flashcardsSignal().some((c) => c.front.toLowerCase() === target);
  }

  /**
   * Legacy Know/Don't Know toggle — preserved so older callers keep working.
   * Internally maps Know → Good (3), Don't Know → Again (1) and uses FSRS.
   */
  markCard(cardId: string, known: boolean): Observable<void> {
    return this.rateCard(cardId, known ? 3 : 1);
  }

  /**
   * Delete a flashcard from the collection.
   * Requirements: 5.7 - Allow users to manually delete individual flashcards
   */
  deleteCard(cardId: string): Observable<void> {
    this.flashcardsSignal.update(cards => cards.filter(c => c.id !== cardId));
    return this.persist();
  }

  /**
   * Get flashcards for a specific exercise.
   */
  getCardsByExercise(exerciseId: string): Flashcard[] {
    return this.flashcardsSignal().filter(c => c.exerciseId === exerciseId);
  }

  /**
   * Filter flashcards based on criteria.
   * Requirements: 5.6 - Allow filtering by exercise, category, or mastery level
   */
  filterCards(filter: FlashcardFilter): Flashcard[] {
    return this.flashcardsSignal().filter(card => {
      if (filter.exercise && card.exerciseId !== filter.exercise) return false;
      if (filter.category && card.category !== filter.category) return false;
      if (filter.mastery) {
        const mastery = this.getCardMastery(card);
        if (mastery !== filter.mastery) return false;
      }
      return true;
    });
  }

  /**
   * Get unique categories from all flashcards.
   */
  getCategories(): string[] {
    const categories = new Set<string>();
    this.flashcardsSignal().forEach(card => {
      if (card.category) {
        categories.add(card.category);
      }
    });
    return Array.from(categories);
  }

  /**
   * Get unique exercise IDs from all flashcards.
   */
  getExerciseIds(): string[] {
    const exerciseIds = new Set<string>();
    this.flashcardsSignal().forEach(card => {
      if (card.exerciseId) {
        exerciseIds.add(card.exerciseId);
      }
    });
    return Array.from(exerciseIds);
  }

  /**
   * Load flashcards from storage.
   */
  loadFlashcards(): void {
    this.loadFromStorage().subscribe({
      next: cards => {
        this.flashcardsSignal.set(cards);
        console.log(`[FlashcardService] Loaded ${cards.length} flashcards`);
      },
      error: error => {
        console.error('[FlashcardService] Error loading flashcards:', error);
        this.flashcardsSignal.set([]);
      }
    });
  }

  /**
   * Merge local flashcards with cloud flashcards on login.
   * Requirements: 6.4 - Merge local flashcards with cloud data on login
   */
  mergeFlashcardsOnLogin(cloudCards: Flashcard[]): Observable<void> {
    const localCards = this.flashcardsSignal();

    // Create a map of cloud cards by front text + exerciseId for deduplication
    const cloudCardMap = new Map<string, Flashcard>();
    cloudCards.forEach(card => {
      const key = `${card.front}|${card.exerciseId}`;
      cloudCardMap.set(key, card);
    });

    // Add local cards that don't exist in cloud
    const mergedCards = [...cloudCards];
    localCards.forEach(localCard => {
      const key = `${localCard.front}|${localCard.exerciseId}`;
      if (!cloudCardMap.has(key)) {
        mergedCards.push(localCard);
      }
    });

    this.flashcardsSignal.set(mergedCards);
    return this.persist();
  }

  /**
   * Clear all local flashcards (used after merge on login).
   */
  clearLocalFlashcards(): void {
    if (typeof localStorage !== 'undefined') {
      const key = this.getStorageKey();
      localStorage.removeItem(key);
      console.log(`[FlashcardService] Cleared flashcards from ${key}`);
    }
  }

  /**
   * Export all flashcards to JSON file.
   * Downloads a JSON file containing all flashcard data.
   */
  exportFlashcards(): void {
    const cards = this.flashcardsSignal();
    const exportData = {
      version: 1,
      exportedAt: new Date().toISOString(),
      totalCards: cards.length,
      flashcards: cards
    };

    const jsonString = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `flashcards-export-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    console.log(`[FlashcardService] Exported ${cards.length} flashcards`);
  }

  /**
   * Import flashcards from JSON file.
   * Merges imported cards with existing cards, avoiding duplicates.
   * @param file The JSON file to import
   * @returns Observable with import result
   */
  importFlashcards(file: File): Observable<{ imported: number; skipped: number }> {
    return new Observable(observer => {
      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const content = e.target?.result as string;
          const data = JSON.parse(content);

          // Validate import data structure
          if (!data.flashcards || !Array.isArray(data.flashcards)) {
            throw new Error('Invalid flashcard export file format');
          }

          const importedCards: Flashcard[] = data.flashcards.map((card: Flashcard) => ({
            ...card,
            id: card.id || this.generateId(),
            createdAt: new Date(card.createdAt),
            nextReviewDate: new Date(card.nextReviewDate),
            lastReviewDate: card.lastReviewDate ? new Date(card.lastReviewDate) : undefined,
            easeFactor: card.easeFactor ?? FLASHCARD_DEFAULTS.easeFactor,
            interval: card.interval ?? FLASHCARD_DEFAULTS.interval,
            reviewCount: card.reviewCount ?? FLASHCARD_DEFAULTS.reviewCount
          }));

          // Filter out duplicates
          const existingCards = this.flashcardsSignal();
          const newCards = importedCards.filter(
            importCard =>
              !existingCards.some(
                existing =>
                  existing.front === importCard.front && 
                  existing.exerciseId === importCard.exerciseId
              )
          );

          const skipped = importedCards.length - newCards.length;

          if (newCards.length > 0) {
            this.flashcardsSignal.update(existing => [...existing, ...newCards]);
            this.persist().subscribe({
              next: () => {
                console.log(`[FlashcardService] Imported ${newCards.length} flashcards, skipped ${skipped} duplicates`);
                observer.next({ imported: newCards.length, skipped });
                observer.complete();
              },
              error: (err) => observer.error(err)
            });
          } else {
            observer.next({ imported: 0, skipped });
            observer.complete();
          }
        } catch (error) {
          console.error('[FlashcardService] Import error:', error);
          observer.error(error);
        }
      };

      reader.onerror = () => {
        observer.error(new Error('Failed to read file'));
      };

      reader.readAsText(file);
    });
  }

  // Private helper methods

  /**
   * Determine the mastery level of a card (uses FSRS stability if available,
   * falls back to legacy interval for unmigrated cards).
   */
  private getCardMastery(card: Flashcard): FlashcardMasteryLevel {
    return this.fsrs.computeMastery(card);
  }

  /**
   * Calculate overall mastery percentage.
   */
  private calculateMastery(): number {
    const cards = this.flashcardsSignal();
    if (cards.length === 0) return 0;
    const mastered = cards.filter(c => this.getCardMastery(c) === 'mastered').length;
    return Math.round((mastered / cards.length) * 100);
  }

  /**
   * Generate a unique ID for a flashcard.
   */
  private generateId(): string {
    return `fc_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Persist flashcards to storage.
   * Requirements: 3.7 - Persist to localStorage for guest, Supabase for authenticated
   * Note: Always saves to localStorage. Supabase sync handled separately.
   */
  private persist(): Observable<void> {
    const cards = this.flashcardsSignal();
    // Always save to localStorage for now
    // Supabase sync will be handled by StorageAdapterFactory when needed
    return this.saveToLocalStorage(cards);
  }

  /**
   * Load flashcards from appropriate storage.
   * Note: Always loads from localStorage. Supabase sync handled separately.
   */
  private loadFromStorage(): Observable<Flashcard[]> {
    // Check if there's a pending merge flag
    const pendingMerge = typeof localStorage !== 'undefined' && 
                         localStorage.getItem('flashcards_pending_merge') === 'true';
    
    if (pendingMerge) {
      console.log('[FlashcardService] Pending merge detected, loading local flashcards');
      // Clear the flag
      localStorage.removeItem('flashcards_pending_merge');
    }
    
    // Always load from localStorage for now
    return this.loadFromLocalStorage();
  }

  /**
   * Save flashcards to localStorage.
   */
  private saveToLocalStorage(cards: Flashcard[]): Observable<void> {
    return new Observable(observer => {
      try {
        if (typeof localStorage !== 'undefined') {
          const key = this.getStorageKey();
          localStorage.setItem(key, JSON.stringify(cards));
          console.log(`[FlashcardService] Saved ${cards.length} flashcards to ${key}`);
        }
        observer.next();
        observer.complete();
      } catch (error) {
        console.error('[FlashcardService] Error saving flashcards:', error);
        observer.error(error);
      }
    });
  }

  /**
   * Load flashcards from localStorage.
   */
  private loadFromLocalStorage(): Observable<Flashcard[]> {
    return new Observable(observer => {
      try {
        if (typeof localStorage !== 'undefined') {
          const key = this.getStorageKey();
          const data = localStorage.getItem(key);
          console.log(`[FlashcardService] Loading flashcards from ${key}`);
          if (data) {
            const cards = JSON.parse(data) as Flashcard[];
            // Convert date strings back to Date objects + run FSRS migration once
            const parsedCards = cards.map(card => this.fsrs.migrateFromLegacy({
              ...card,
              createdAt: new Date(card.createdAt),
              nextReviewDate: new Date(card.nextReviewDate),
              lastReviewDate: card.lastReviewDate ? new Date(card.lastReviewDate) : undefined
            }));
            console.log(`[FlashcardService] Loaded ${parsedCards.length} flashcards`);
            observer.next(parsedCards);
          } else {
            console.log('[FlashcardService] No flashcards found in storage');
            observer.next([]);
          }
        } else {
          observer.next([]);
        }
        observer.complete();
      } catch (error) {
        console.error('[FlashcardService] Error loading flashcards:', error);
        observer.error(error);
      }
    });
  }

  /**
   * Save flashcards to Supabase.
   * Note: This will be fully implemented in Task 14 (storage persistence)
   */
  private saveToSupabase(cards: Flashcard[]): Observable<void> {
    // TODO: Implement Supabase storage in Task 14
    // For now, also save to localStorage as backup
    return this.saveToLocalStorage(cards);
  }

  /**
   * Load flashcards from Supabase.
   * Note: This will be fully implemented in Task 14 (storage persistence)
   */
  private loadFromSupabase(): Observable<Flashcard[]> {
    // TODO: Implement Supabase storage in Task 14
    // For now, load from localStorage
    return this.loadFromLocalStorage();
  }
}
