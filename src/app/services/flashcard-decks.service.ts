import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { Observable, of } from 'rxjs';
import {
  CUSTOM_DECK_STORAGE_KEY,
  CustomDeck,
  Flashcard,
  FSRS_CONSTANTS,
  SmartDeckDefinition,
  SmartDeckKind,
} from '../models/memory-retention.model';
import { AuthService } from './auth.service';
import { FlashcardService } from './flashcard.service';

/**
 * Builds review queues for a given deck reference. Two kinds:
 *
 * 1. **Smart decks** — dynamic rule (due / weak / new / leech / category / all).
 *    Cards are computed on the fly from the FlashcardService signal.
 *
 * 2. **Custom decks** — user-defined fixed cardId list, persisted in localStorage
 *    (per-user namespace, mirrors FlashcardService).
 *
 * Plus: weak-card detector that surfaces cards with low stability/high lapses
 * so the smart "Weak words" deck has something to gather. This pairs with
 * the existing error-pattern-analyzer for vocabulary-related lapses.
 */
@Injectable({ providedIn: 'root' })
export class FlashcardDecksService {
  private auth = inject(AuthService);
  private flashcards = inject(FlashcardService);

  private readonly STORAGE_PREFIX = CUSTOM_DECK_STORAGE_KEY;

  /** Custom decks created by the user. */
  readonly customDecks = signal<CustomDeck[]>([]);

  /** Smart decks — re-computed when flashcards change. */
  readonly smartDecks = computed<SmartDeckDefinition[]>(() => {
    const all = this.flashcards.allFlashcards();
    const due = this.flashcards.dueFlashcards();
    const leech = this.flashcards.leechFlashcards();
    const newCards = all.filter((c) => (c.state ?? 'new') === 'new' && (c.reviewCount ?? 0) === 0);
    const weak = this.getWeakCards(all);
    const categories = this.getUniqueCategories(all);

    const decks: SmartDeckDefinition[] = [
      {
        id: 'smart-due',
        kind: 'due',
        label: 'Due today',
        description: 'All cards due for review by FSRS schedule',
        icon: '⏰',
        cardCount: due.length,
      },
      {
        id: 'smart-new',
        kind: 'new',
        label: 'New',
        description: 'Cards never reviewed — start gently',
        icon: '🆕',
        cardCount: newCards.length,
      },
      {
        id: 'smart-weak',
        kind: 'weak',
        label: 'Weak words',
        description: 'Cards with low stability or repeated failures',
        icon: '🎯',
        cardCount: weak.length,
      },
      {
        id: 'smart-leech',
        kind: 'leech',
        label: 'Leech',
        description: `Cards failed ≥ ${FSRS_CONSTANTS.LEECH_THRESHOLD} times — rethink your approach`,
        icon: '🐌',
        cardCount: leech.length,
      },
      {
        id: 'smart-all',
        kind: 'all',
        label: 'All',
        description: 'Including not-yet-due cards — use for cramming',
        icon: '📚',
        cardCount: all.filter((c) => !c.suspended).length,
      },
    ];

    for (const category of categories) {
      const count = all.filter((c) => c.category === category && !c.suspended).length;
      if (count > 0) {
        decks.push({
          id: `smart-cat-${category}`,
          kind: 'category',
          label: this.formatCategoryLabel(category),
          description: `All cards in the "${category}" category`,
          icon: '📁',
          argument: category,
          cardCount: count,
        });
      }
    }

    return decks;
  });

  constructor() {
    this.loadCustomDecks();
    // Reload custom decks if auth changes (per-user storage).
    effect(() => {
      this.auth.currentUser();
      this.loadCustomDecks();
    });
  }

  /**
   * Resolve a deck reference (smart deck definition OR custom deck) into a
   * concrete card list. Caller passes the resolved list into the study UI.
   */
  resolveSmartDeck(deck: SmartDeckDefinition): Flashcard[] {
    const all = this.flashcards.allFlashcards();
    switch (deck.kind) {
      case 'due':
        return this.flashcards.dueFlashcards();
      case 'new':
        return all.filter((c) => (c.state ?? 'new') === 'new' && (c.reviewCount ?? 0) === 0 && !c.suspended);
      case 'weak':
        return this.getWeakCards(all);
      case 'leech':
        return this.flashcards.leechFlashcards();
      case 'all':
        return all.filter((c) => !c.suspended);
      case 'category':
        return all.filter((c) => c.category === deck.argument && !c.suspended);
      default:
        return [];
    }
  }

  resolveCustomDeck(deck: CustomDeck): Flashcard[] {
    const byId = new Map(this.flashcards.allFlashcards().map((c) => [c.id, c]));
    return deck.cardIds
      .map((id) => byId.get(id))
      .filter((c): c is Flashcard => !!c && !c.suspended);
  }

  // ---------------------------------
  // Custom deck CRUD
  // ---------------------------------

  createCustomDeck(name: string, cardIds: string[], description?: string): Observable<CustomDeck> {
    const now = new Date();
    const deck: CustomDeck = {
      id: `deck_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      name: name.trim(),
      description: description?.trim(),
      cardIds,
      createdAt: now,
      updatedAt: now,
    };
    this.customDecks.update((decks) => [...decks, deck]);
    this.persistCustomDecks();
    return of(deck);
  }

  updateCustomDeck(deckId: string, patch: Partial<CustomDeck>): void {
    this.customDecks.update((decks) =>
      decks.map((d) => (d.id === deckId ? { ...d, ...patch, updatedAt: new Date() } : d))
    );
    this.persistCustomDecks();
  }

  deleteCustomDeck(deckId: string): void {
    this.customDecks.update((decks) => decks.filter((d) => d.id !== deckId));
    this.persistCustomDecks();
  }

  /**
   * Add or remove a card from a deck.
   */
  toggleCardInDeck(deckId: string, cardId: string): void {
    this.customDecks.update((decks) =>
      decks.map((d) => {
        if (d.id !== deckId) return d;
        const exists = d.cardIds.includes(cardId);
        const next = exists ? d.cardIds.filter((id) => id !== cardId) : [...d.cardIds, cardId];
        return { ...d, cardIds: next, updatedAt: new Date() };
      })
    );
    this.persistCustomDecks();
  }

  // ---------------------------------
  // Weak card detection
  // ---------------------------------

  /**
   * Weak = lapsed at least once AND (stability low OR more lapses than reviews/3).
   * Surface here is meant to be actionable — "fix these specific words".
   */
  private getWeakCards(all: Flashcard[]): Flashcard[] {
    return all
      .filter((c) => !c.suspended)
      .filter((c) => {
        const lapses = c.lapses ?? 0;
        const stability = c.stability ?? 0;
        if (lapses === 0) return false;
        if (stability < 3) return true;
        const reviews = c.reviewCount ?? 0;
        return reviews > 0 && lapses / reviews > 0.33;
      })
      .sort((a, b) => (b.lapses ?? 0) - (a.lapses ?? 0));
  }

  private getUniqueCategories(all: Flashcard[]): string[] {
    const set = new Set<string>();
    for (const card of all) {
      if (card.category) set.add(card.category);
    }
    return Array.from(set).sort();
  }

  private formatCategoryLabel(category: string): string {
    return category
      .replace(/[-_]/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase());
  }

  // ---------------------------------
  // Persistence
  // ---------------------------------

  private getStorageKey(): string {
    const user = this.auth.currentUser();
    return `${this.STORAGE_PREFIX}_${user?.uid ?? 'guest'}`;
  }

  private loadCustomDecks(): void {
    if (typeof localStorage === 'undefined') return;
    try {
      const raw = localStorage.getItem(this.getStorageKey());
      if (!raw) {
        this.customDecks.set([]);
        return;
      }
      const parsed = JSON.parse(raw) as CustomDeck[];
      const revived = parsed.map((d) => ({
        ...d,
        createdAt: new Date(d.createdAt),
        updatedAt: new Date(d.updatedAt),
      }));
      this.customDecks.set(revived);
    } catch (err) {
      console.warn('[FlashcardDecksService] Failed to load custom decks', err);
      this.customDecks.set([]);
    }
  }

  private persistCustomDecks(): void {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem(this.getStorageKey(), JSON.stringify(this.customDecks()));
    } catch (err) {
      console.warn('[FlashcardDecksService] Failed to persist custom decks', err);
    }
  }
}
