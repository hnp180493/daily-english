import { Injectable, signal, computed, inject, effect } from '@angular/core';
import { Observable, of } from 'rxjs';
import { switchMap, tap, catchError } from 'rxjs/operators';
import { AuthService } from './auth.service';
import { DatabaseService } from './database/database.service';
import { UnsubscribeFunction } from './database/database.interface';

export interface FavoriteExercise {
  exerciseId: string;
  addedAt: Date;
}

@Injectable({
  providedIn: 'root'
})
export class FavoriteService {
  private authService = inject(AuthService);
  private databaseService = inject(DatabaseService);
  private favorites = signal<FavoriteExercise[]>([]);

  favoriteIds = computed(() => 
    this.favorites().map(f => f.exerciseId)
  );

  favoriteCount = computed(() => this.favorites().length);

  private isInitialized = false;

  constructor() {
    // Reload favorites when user changes
    effect(() => {
      const user = this.authService.currentUser();
      if (user && !this.isInitialized) {
        // Initialize favorites only once per user session
        this.isInitialized = true;
        this.initializeFavorites();
      } else if (!user) {
        this.isInitialized = false;
        this.favorites.set([]);
      }
    });
  }

  isFavorite(exerciseId: string): boolean {
    return this.favoriteIds().includes(exerciseId);
  }

  toggleFavorite(exerciseId: string): void {
    const updated = this.isFavorite(exerciseId)
      ? this.favorites().filter(f => f.exerciseId !== exerciseId)
      : [...this.favorites(), { exerciseId, addedAt: new Date() }];

    // Update local state immediately (optimistic update)
    this.favorites.set(updated);

    // Save to Firestore
    this.databaseService.saveFavoritesAuto(updated).subscribe({
      next: () => console.log('[FavoriteService] Favorites saved to Firestore'),
      error: (error: Error) => {
        console.error('[FavoriteService] Failed to save favorites:', error);
        // Revert on error
        this.loadFromFirestore();
      }
    });
  }

  addFavorite(exerciseId: string): void {
    if (!this.isFavorite(exerciseId)) {
      const updated = [...this.favorites(), { exerciseId, addedAt: new Date() }];
      
      // Update local state immediately
      this.favorites.set(updated);

      // Save to Firestore
      this.databaseService.saveFavoritesAuto(updated).subscribe({
        next: () => console.log('[FavoriteService] Favorite added'),
        error: (error: Error) => {
          console.error('[FavoriteService] Failed to add favorite:', error);
          this.loadFromFirestore();
        }
      });
    }
  }

  removeFavorite(exerciseId: string): void {
    const updated = this.favorites().filter(f => f.exerciseId !== exerciseId);
    
    // Update local state immediately
    this.favorites.set(updated);

    // Save to Firestore
    this.databaseService.saveFavoritesAuto(updated).subscribe({
      next: () => console.log('[FavoriteService] Favorite removed'),
      error: (error: Error) => {
        console.error('[FavoriteService] Failed to remove favorite:', error);
        this.loadFromFirestore();
      }
    });
  }

  getFavorites(): FavoriteExercise[] {
    return this.favorites();
  }

  private initializeFavorites(): void {
    this.checkAndMigrateData().subscribe({
      next: () => {
        this.loadFromFirestore();
      },
      error: (error: Error) => {
        console.error('[FavoriteService] Migration failed:', error);
        this.loadFromFirestore();
      }
    });
  }

  private loadFromFirestore(): void {
    this.databaseService.loadFavoritesAuto().subscribe({
      next: (favorites) => {
        this.favorites.set(favorites || []);
        console.log('[FavoriteService] Favorites loaded from Firestore');
      },
      error: (error: Error) => {
        console.error('[FavoriteService] Failed to load favorites:', error);
      }
    });
  }

  private checkAndMigrateData(): Observable<void> {
    const userId = this.authService.getUserId();
    if (!userId) return of(undefined);

    // Check if user has data in Firestore
    return this.databaseService.loadFavoritesAuto().pipe(
      switchMap(cloudFavorites => {
        if (cloudFavorites && cloudFavorites.length > 0) {
          // Data exists in Firestore, no migration needed
          console.log('[FavoriteService] Data already exists in Firestore, skipping migration');
          return of(undefined);
        }

        // Check for localStorage data to migrate
        const localData = this.checkLocalStorageData(userId);
        if (localData && localData.length > 0) {
          console.log('[FavoriteService] Migrating localStorage data to Firestore');
          return this.databaseService.saveFavoritesAuto(localData).pipe(
            tap(() => {
              this.clearLocalStorageData(userId);
              console.log('[FavoriteService] Migration completed successfully');
            })
          );
        }

        // No data to migrate
        console.log('[FavoriteService] No localStorage data to migrate');
        return of(undefined);
      }),
      catchError((error: Error) => {
        console.error('[FavoriteService] Migration error:', error);
        return of(undefined);
      })
    );
  }

  private checkLocalStorageData(userId: string): FavoriteExercise[] {
    const key = `exercise_favorites_${userId}`;
    const stored = localStorage.getItem(key);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        return parsed.map((f: any) => ({
          ...f,
          addedAt: new Date(f.addedAt)
        }));
      } catch (error) {
        console.error('[FavoriteService] Failed to parse localStorage data:', error);
        return [];
      }
    }
    
    // Also check old key format
    const oldKey = 'exercise_favorites';
    const oldStored = localStorage.getItem(oldKey);
    if (oldStored) {
      try {
        const parsed = JSON.parse(oldStored);
        return parsed.map((f: any) => ({
          ...f,
          addedAt: new Date(f.addedAt)
        }));
      } catch (error) {
        console.error('[FavoriteService] Failed to parse old localStorage data:', error);
        return [];
      }
    }
    
    return [];
  }

  private clearLocalStorageData(userId: string): void {
    const key = `exercise_favorites_${userId}`;
    localStorage.removeItem(key);
    // Also remove old key if exists
    localStorage.removeItem('exercise_favorites');
    console.log('[FavoriteService] Cleared localStorage data');
  }
}
