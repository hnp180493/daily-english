import { Injectable, signal, computed, inject } from '@angular/core';
import { Observable, of } from 'rxjs';
import { switchMap, tap, catchError } from 'rxjs/operators';
import { AuthService } from './auth.service';
import { DatabaseService } from './database/database.service';
import { GUEST_FAVORITES_KEY } from '../constants/storage-keys';

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

  private currentUserId: string | null = null;
  private isInitialized = false;

  constructor() {
    // Wait for auth to be stable before initializing
    this.initAfterAuth();
  }

  private async initAfterAuth(): Promise<void> {
    await this.authService.waitForAuth();
    
    const user = this.authService.currentUser();
    const userId = user?.uid || 'guest';
    
    if (userId !== this.currentUserId) {
      this.currentUserId = userId;
      this.isInitialized = true;
      this.initializeFavorites();
    }
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

    // Save to storage
    this.saveFavorites(updated);
  }

  addFavorite(exerciseId: string): void {
    if (!this.isFavorite(exerciseId)) {
      const updated = [...this.favorites(), { exerciseId, addedAt: new Date() }];
      
      // Update local state immediately
      this.favorites.set(updated);

      // Save to storage
      this.saveFavorites(updated);
    }
  }

  removeFavorite(exerciseId: string): void {
    const updated = this.favorites().filter(f => f.exerciseId !== exerciseId);
    
    // Update local state immediately
    this.favorites.set(updated);

    // Save to storage
    this.saveFavorites(updated);
  }
  
  private saveFavorites(favorites: FavoriteExercise[]): void {
    const userId = this.authService.getUserId();
    
    // Guest user - save to localStorage
    if (!userId) {
      this.saveToLocalStorage(favorites);
      return;
    }
    
    // Authenticated user - save to Firestore
    this.databaseService.saveFavoritesAuto(favorites).subscribe({
      next: () => console.log('[FavoriteService] Favorites saved to Firestore'),
      error: (error: Error) => {
        console.error('[FavoriteService] Failed to save favorites:', error);
        // Revert on error - reload from database
        this.loadAndMigrateData();
      }
    });
  }
  
  private saveToLocalStorage(favorites: FavoriteExercise[]): void {
    try {
      localStorage.setItem(GUEST_FAVORITES_KEY, JSON.stringify(favorites));
      console.log(`[FavoriteService] Saved ${favorites.length} favorites to localStorage`);
    } catch (error) {
      console.error('[FavoriteService] Failed to save to localStorage:', error);
    }
  }

  getFavorites(): FavoriteExercise[] {
    return this.favorites();
  }

  private initializeFavorites(): void {
    const userId = this.authService.getUserId();

    // Guest user - load from localStorage only
    if (!userId) {
      this.loadFromLocalStorage();
      return;
    }

    // Authenticated user - load and migrate in single request
    this.loadAndMigrateData();
  }

  private loadFromLocalStorage(): void {
    const stored = localStorage.getItem(GUEST_FAVORITES_KEY);

    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        const favorites = parsed.map((f: FavoriteExercise) => ({
          ...f,
          addedAt: new Date(f.addedAt)
        }));
        this.favorites.set(favorites);
        console.log(`[FavoriteService] Loaded ${favorites.length} favorites from localStorage`);
      } catch (error) {
        console.error('[FavoriteService] Failed to parse localStorage data:', error);
        this.favorites.set([]);
      }
    } else {
      console.log('[FavoriteService] No favorites found in localStorage');
      this.favorites.set([]);
    }
  }

  private loadAndMigrateData(): void {
    const userId = this.authService.getUserId();
    if (!userId) return;

    // Single request to load data
    this.databaseService.loadFavoritesAuto().subscribe({
      next: cloudFavorites => {
        if (cloudFavorites && cloudFavorites.length > 0) {
          // Data exists in Firestore, use it directly
          this.favorites.set(cloudFavorites);
          console.log('[FavoriteService] Favorites loaded from Firestore');
          return;
        }

        // No cloud data - check for localStorage data to migrate
        const localData = this.checkLocalStorageData(userId);
        if (localData && localData.length > 0) {
          console.log('[FavoriteService] Migrating localStorage data to Firestore');
          this.favorites.set(localData); // Set immediately
          this.databaseService.saveFavoritesAuto(localData).subscribe({
            next: () => {
              this.clearLocalStorageData(userId);
              console.log('[FavoriteService] Migration completed successfully');
            },
            error: (error: Error) => {
              console.error('[FavoriteService] Migration save failed:', error);
            }
          });
        } else {
          // No data anywhere
          this.favorites.set([]);
          console.log('[FavoriteService] No favorites found');
        }
      },
      error: (error: Error) => {
        console.error('[FavoriteService] Failed to load favorites:', error);
        this.favorites.set([]);
      }
    });
  }

  private checkLocalStorageData(userId: string): FavoriteExercise[] {
    const stored = localStorage.getItem(GUEST_FAVORITES_KEY);
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
    return [];
  }

  private clearLocalStorageData(userId: string): void {
    localStorage.removeItem(GUEST_FAVORITES_KEY);
    console.log('[FavoriteService] Cleared localStorage data');
  }
}
