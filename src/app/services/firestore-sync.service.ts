import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { UserProgress, CustomExercise } from '../models/exercise.model';
import { DatabaseService } from './database/database.service';
import { FavoriteData, UserProfile, UnsubscribeFunction } from './database/database.interface';

export type { FavoriteData, UserProfile };
export type Unsubscribe = UnsubscribeFunction;

/**
 * @deprecated Use DatabaseService directly instead
 * 
 * DEPRECATED: This service is no longer used and will be removed in a future version.
 * All functionality has been moved to DatabaseService.
 * 
 * Migration guide:
 * - Replace FirestoreSyncService with DatabaseService
 * - All methods have equivalent *Auto() methods in DatabaseService
 * - Example: firestoreSyncService.saveProgress() → databaseService.saveProgressAuto()
 * 
 * This file is kept temporarily for reference only.
 */
@Injectable({
  providedIn: 'root'
})
export class FirestoreSyncService {
  private databaseService = inject(DatabaseService);

  // User profile methods
  saveUserProfile(): Observable<void> {
    return this.databaseService.saveUserProfileAuto();
  }

  loadUserProfile(): Observable<UserProfile | null> {
    return this.databaseService.loadUserProfileAuto();
  }

  // Progress sync methods
  saveProgress(progress: UserProgress): Observable<void> {
    return this.databaseService.saveProgressAuto(progress);
  }

  loadProgress(): Observable<UserProgress | null> {
    return this.databaseService.loadProgressAuto();
  }

  subscribeToProgress(callback: (progress: UserProgress | null) => void): Unsubscribe {
    return this.databaseService.subscribeToProgressAuto(callback);
  }

  // Favorites sync methods
  saveFavorites(favorites: FavoriteData[]): Observable<void> {
    return this.databaseService.saveFavoritesAuto(favorites);
  }

  loadFavorites(): Observable<FavoriteData[] | null> {
    return this.databaseService.loadFavoritesAuto();
  }

  subscribeToFavorites(callback: (favorites: FavoriteData[] | null) => void): Unsubscribe {
    return this.databaseService.subscribeToFavoritesAuto(callback);
  }

  // Custom exercise sync methods - REMOVED
  // Custom exercises are now stored in localStorage only
  // See CustomExerciseService for implementation
}
