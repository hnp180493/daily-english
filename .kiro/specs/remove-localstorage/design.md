# Design Document

## Overview

This design document outlines the refactoring strategy to eliminate localStorage dependencies from the language learning application, except for temporary in-progress exercise state and custom exercises. The current architecture uses a hybrid approach with both localStorage and Firestore, creating data consistency issues and security vulnerabilities. The refactored system will use Firestore as the single source of truth for all persistent user data.

### Current State

The application currently uses localStorage for:
- **ProgressService**: User progress, attempts, points, credits, streaks
- **AchievementService**: Unlocked achievements, progress tracking, reward claims
- **FavoriteService**: Favorited exercises
- **RewardService**: Unlocked themes, hints, avatar frames
- **ExercisePersistenceService**: In-progress exercise state (KEEP)
- **CustomExerciseService**: User-created exercises (KEEP with modifications)

### Target State

After refactoring:
- **ProgressService**: Firestore only (no localStorage)
- **AchievementService**: Firestore only (no localStorage)
- **FavoriteService**: Firestore only (no localStorage)
- **RewardService**: Firestore only (no localStorage)
- **ExercisePersistenceService**: localStorage only (unchanged)
- **CustomExerciseService**: Firestore primary, localStorage for offline support

## Architecture

### Data Flow Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        User Actions                          │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                   Angular Services Layer                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Progress   │  │ Achievement  │  │   Favorite   │     │
│  │   Service    │  │   Service    │  │   Service    │     │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘     │
│         │                  │                  │              │
│         └──────────────────┼──────────────────┘              │
│                            │                                 │
│                            ▼                                 │
│                  ┌──────────────────┐                       │
│                  │  Database Service │                       │
│                  └─────────┬─────────┘                       │
└────────────────────────────┼─────────────────────────────────┘
                             │
                             ▼
                  ┌──────────────────────┐
                  │ Firebase Database    │
                  │ Service              │
                  └──────────┬───────────┘
                             │
                             ▼
                  ┌──────────────────────┐
                  │   Firestore Cloud    │
                  │   Database           │
                  └──────────────────────┘

EXCEPTIONS (Keep localStorage):
┌──────────────────────────────────────────────────────────────┐
│  ExercisePersistenceService  →  localStorage (temporary)     │
│  CustomExerciseService       →  Firestore + localStorage     │
└──────────────────────────────────────────────────────────────┘
```

### Service Refactoring Strategy

Each service will follow this pattern:

1. **Remove localStorage operations** (except migration)
2. **Add Firestore operations** for all data persistence
3. **Implement one-time migration** from localStorage to Firestore
4. **Remove real-time subscriptions** to prevent race conditions
5. **Add comprehensive error handling** for all database operations

## Components and Interfaces

### 1. ProgressService Refactoring

**Current Issues:**
- Stores progress in localStorage with user-specific keys
- Syncs to Firestore but keeps localStorage as primary
- Uses real-time subscriptions that can cause race conditions
- Migration logic runs on every initialization

**Design Changes:**

```typescript
@Injectable({ providedIn: 'root' })
export class ProgressService {
  // REMOVE: private readonly STORAGE_KEY_PREFIX = 'user_progress_';
  // REMOVE: private getStorageKey(): string | null
  // REMOVE: private loadProgress(): UserProgress
  // REMOVE: private saveProgress(progress: UserProgress): void
  // REMOVE: private migrateOldData(): void
  
  private databaseService = inject(DatabaseService);
  private authService = inject(AuthService);
  private progress$ = new BehaviorSubject<UserProgress>(this.getDefaultProgress());
  private progressSignal = signal<UserProgress>(this.getDefaultProgress());
  private migrationCompleted = signal<boolean>(false);

  constructor() {
    effect(() => {
      const user = this.authService.currentUser();
      if (user) {
        this.initializeUserProgress();
      } else {
        this.resetToDefault();
      }
    });
  }

  private initializeUserProgress(): void {
    // Check if migration is needed (one-time check)
    this.checkAndMigrateData().subscribe({
      next: () => {
        // Load from Firestore
        this.loadFromFirestore();
      },
      error: (error) => {
        console.error('Migration failed:', error);
        this.loadFromFirestore(); // Try loading anyway
      }
    });
  }

  private checkAndMigrateData(): Observable<void> {
    const userId = this.authService.getUserId();
    if (!userId) return of(undefined);

    // Check if user has data in Firestore
    return this.databaseService.loadProgressAuto().pipe(
      switchMap(cloudProgress => {
        if (cloudProgress) {
          // Data exists in Firestore, no migration needed
          this.migrationCompleted.set(true);
          return of(undefined);
        }

        // Check for localStorage data to migrate
        const localData = this.checkLocalStorageData(userId);
        if (localData) {
          console.log('[ProgressService] Migrating localStorage data to Firestore');
          return this.databaseService.saveProgressAuto(localData).pipe(
            tap(() => {
              this.clearLocalStorageData(userId);
              this.migrationCompleted.set(true);
              console.log('[ProgressService] Migration completed successfully');
            })
          );
        }

        // No data to migrate
        this.migrationCompleted.set(true);
        return of(undefined);
      }),
      catchError(error => {
        console.error('[ProgressService] Migration error:', error);
        return of(undefined);
      })
    );
  }

  private loadFromFirestore(): void {
    this.databaseService.loadProgressAuto().subscribe({
      next: (progress) => {
        const data = progress || this.getDefaultProgress();
        this.progress$.next(data);
        this.progressSignal.set(data);
      },
      error: (error) => {
        console.error('[ProgressService] Failed to load progress:', error);
        // Keep current state on error
      }
    });
  }

  recordAttempt(attempt: ExerciseAttempt): void {
    const current = this.progress$.value;
    const streakUpdate = this.updateStreak(current);
    
    const updated: UserProgress = {
      ...current,
      attempts: [...current.attempts, attempt],
      totalCredits: current.totalCredits + this.calculateCredits(attempt),
      totalPoints: current.totalPoints + attempt.pointsEarned,
      lastActivityDate: new Date(),
      currentStreak: streakUpdate.currentStreak,
      lastStreakDate: streakUpdate.lastStreakDate
    };

    // Update local state immediately
    this.progress$.next(updated);
    this.progressSignal.set(updated);

    // Save to Firestore
    this.databaseService.saveProgressAuto(updated).subscribe({
      next: () => console.log('[ProgressService] Progress saved to Firestore'),
      error: (error) => {
        console.error('[ProgressService] Failed to save progress:', error);
        // TODO: Implement retry logic or queue for later
      }
    });

    this.checkAchievements(updated);
  }

  // Helper methods for migration
  private checkLocalStorageData(userId: string): UserProgress | null {
    const key = `user_progress_${userId}`;
    const stored = localStorage.getItem(key);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (error) {
        console.error('[ProgressService] Failed to parse localStorage data:', error);
        return null;
      }
    }
    return null;
  }

  private clearLocalStorageData(userId: string): void {
    const key = `user_progress_${userId}`;
    localStorage.removeItem(key);
    // Also remove old key if exists
    localStorage.removeItem('user_progress');
  }
}
```

### 2. AchievementService Refactoring

**Current Issues:**
- Stores achievement data in localStorage
- No server-side validation for reward claims
- Can be manipulated to claim rewards multiple times

**Design Changes:**

```typescript
@Injectable({ providedIn: 'root' })
export class AchievementService {
  // REMOVE: private readonly STORAGE_KEY_PREFIX = 'user_achievements_';
  // REMOVE: private getStorageKey(): string | null
  // REMOVE: private loadUserData(): void
  // REMOVE: private saveUserData(data: UserAchievementData): void
  
  private databaseService = inject(DatabaseService);
  private authService = inject(AuthService);
  private allAchievements = signal<Achievement[]>([]);
  private userAchievementData = signal<UserAchievementData>(this.getDefaultUserData());

  constructor() {
    this.initializeAchievements();

    effect(() => {
      const user = this.authService.currentUser();
      if (user) {
        this.loadFromFirestore();
      }
    });
  }

  private loadFromFirestore(): void {
    // Check and migrate if needed
    this.checkAndMigrateData().subscribe({
      next: () => {
        // Load achievement data from Firestore
        this.databaseService.loadAchievementsAuto().subscribe({
          next: (data) => {
            if (data) {
              this.userAchievementData.set(data);
              this.syncAchievementStates();
            }
          },
          error: (error) => {
            console.error('[AchievementService] Failed to load achievements:', error);
          }
        });
      }
    });
  }

  private unlockAchievement(achievementId: string): void {
    // ... update local state ...

    // Save to Firestore immediately
    const userData = this.userAchievementData();
    this.databaseService.saveAchievementsAuto(userData).subscribe({
      next: () => console.log('[AchievementService] Achievement unlocked and saved'),
      error: (error) => {
        console.error('[AchievementService] Failed to save achievement:', error);
        // TODO: Implement retry logic
      }
    });
  }

  claimRewards(achievementId: string): void {
    const achievement = this.getAchievementById(achievementId);
    if (!achievement || !achievement.unlocked || achievement.rewardsClaimed) {
      return;
    }

    // Update claim status in Firestore FIRST
    const userData = this.userAchievementData();
    const updatedUserData = this.markRewardsClaimed(userData, achievementId);

    this.databaseService.saveAchievementsAuto(updatedUserData).subscribe({
      next: () => {
        // Only grant rewards after successful Firestore update
        this.rewardService.grantRewards(achievement.rewards);
        this.userAchievementData.set(updatedUserData);
        this.syncAchievementStates();
        console.log('[AchievementService] Rewards claimed successfully');
      },
      error: (error) => {
        console.error('[AchievementService] Failed to claim rewards:', error);
        // Don't grant rewards if Firestore update fails
      }
    });
  }
}
```

### 3. FavoriteService Refactoring

**Current Issues:**
- Uses localStorage as primary storage
- Real-time sync can cause conflicts
- Merge logic runs on every load

**Design Changes:**

```typescript
@Injectable({ providedIn: 'root' })
export class FavoriteService {
  // REMOVE: private readonly STORAGE_KEY_PREFIX = 'exercise_favorites_';
  // REMOVE: private getStorageKey(): string | null
  // REMOVE: private loadFavoritesFromLocalStorage(): FavoriteExercise[]
  // REMOVE: private saveFavoritesToLocalStorage(): void
  // REMOVE: private migrateOldData(): void
  
  private databaseService = inject(DatabaseService);
  private authService = inject(AuthService);
  private favorites = signal<FavoriteExercise[]>([]);

  constructor() {
    effect(() => {
      const user = this.authService.currentUser();
      if (user) {
        this.initializeFavorites();
      } else {
        this.favorites.set([]);
      }
    });
  }

  private initializeFavorites(): void {
    this.checkAndMigrateData().subscribe({
      next: () => {
        this.loadFromFirestore();
      }
    });
  }

  private loadFromFirestore(): void {
    this.databaseService.loadFavoritesAuto().subscribe({
      next: (favorites) => {
        this.favorites.set(favorites || []);
      },
      error: (error) => {
        console.error('[FavoriteService] Failed to load favorites:', error);
      }
    });
  }

  toggleFavorite(exerciseId: string): void {
    const updated = this.isFavorite(exerciseId)
      ? this.favorites().filter(f => f.exerciseId !== exerciseId)
      : [...this.favorites(), { exerciseId, addedAt: new Date() }];

    // Update local state immediately
    this.favorites.set(updated);

    // Save to Firestore
    this.databaseService.saveFavoritesAuto(updated).subscribe({
      next: () => console.log('[FavoriteService] Favorites saved'),
      error: (error) => {
        console.error('[FavoriteService] Failed to save favorites:', error);
        // Revert on error
        this.loadFromFirestore();
      }
    });
  }
}
```

### 4. RewardService Refactoring

**Current Issues:**
- Stores rewards in localStorage
- No server-side validation
- Points can be manipulated

**Design Changes:**

```typescript
@Injectable({ providedIn: 'root' })
export class RewardService {
  // REMOVE: private readonly STORAGE_KEY_PREFIX = 'user_rewards_';
  // REMOVE: private getStorageKey(): string | null
  // REMOVE: private loadRewards(): UserRewards
  // REMOVE: private saveRewards(): void
  
  private databaseService = inject(DatabaseService);
  private authService = inject(AuthService);
  private progressService = inject(ProgressService);
  private unlockedRewards = signal<UserRewards>(this.getDefaultRewards());

  constructor() {
    effect(() => {
      const user = this.authService.currentUser();
      if (user) {
        this.initializeRewards();
      }
    });
  }

  private initializeRewards(): void {
    this.checkAndMigrateData().subscribe({
      next: () => {
        this.loadFromFirestore();
      }
    });
  }

  private loadFromFirestore(): void {
    this.databaseService.loadRewardsAuto().subscribe({
      next: (rewards) => {
        this.unlockedRewards.set(rewards || this.getDefaultRewards());
      },
      error: (error) => {
        console.error('[RewardService] Failed to load rewards:', error);
      }
    });
  }

  grantRewards(rewards: Reward[]): void {
    rewards.forEach(reward => {
      switch (reward.type) {
        case RewardType.CREDITS:
          this.grantCredits(reward.value as number);
          break;
        case RewardType.THEME:
          this.unlockTheme(reward.value as string);
          break;
        // ... other cases
      }
    });

    // Save to Firestore
    this.databaseService.saveRewardsAuto(this.unlockedRewards()).subscribe({
      next: () => console.log('[RewardService] Rewards saved'),
      error: (error) => {
        console.error('[RewardService] Failed to save rewards:', error);
      }
    });
  }
}
```

### 5. Database Service Extensions

**New Methods Needed:**

```typescript
// Add to database.interface.ts
export interface UserAchievementData {
  userId: string;
  unlockedAchievements: Array<{
    achievementId: string;
    unlockedAt: Date;
    rewardsClaimed: boolean;
  }>;
  progress: { [achievementId: string]: AchievementProgress };
  lastEvaluated: Date;
}

export interface UserRewards {
  themes: string[];
  hints: number;
  avatarFrames: string[];
}

export interface IDatabase {
  // ... existing methods ...
  
  // Achievement Operations
  saveAchievements(userId: string, data: UserAchievementData): Observable<void>;
  loadAchievements(userId: string): Observable<UserAchievementData | null>;
  
  // Reward Operations
  saveRewards(userId: string, rewards: UserRewards): Observable<void>;
  loadRewards(userId: string): Observable<UserRewards | null>;
}
```

## Data Models

### Firestore Collection Structure

```
users/
  {userId}/
    (document) - User profile data
    data/
      progress (document) - UserProgress
      favorites (document) - { favorites: FavoriteData[] }
      achievements (document) - UserAchievementData
      rewards (document) - UserRewards
    customExercises/
      {exerciseId} (document) - CustomExercise
```

### Migration Data Structure

```typescript
interface MigrationStatus {
  userId: string;
  progressMigrated: boolean;
  achievementsMigrated: boolean;
  favoritesMigrated: boolean;
  rewardsMigrated: boolean;
  migratedAt: Date;
}
```

## Error Handling

### Error Handling Strategy

1. **Network Errors**: Retry with exponential backoff
2. **Permission Errors**: Log and notify user
3. **Data Validation Errors**: Log and use default values
4. **Migration Errors**: Preserve localStorage data and retry on next login

### Retry Logic

```typescript
private saveWithRetry<T>(
  saveFn: () => Observable<T>,
  maxRetries: number = 3
): Observable<T> {
  return saveFn().pipe(
    retry({
      count: maxRetries,
      delay: (error, retryCount) => {
        const delayMs = Math.min(1000 * Math.pow(2, retryCount), 10000);
        console.log(`Retry ${retryCount} after ${delayMs}ms`);
        return timer(delayMs);
      }
    }),
    catchError(error => {
      console.error('Save failed after retries:', error);
      return throwError(() => error);
    })
  );
}
```

### Offline Support

```typescript
interface PendingOperation {
  type: 'save' | 'delete';
  collection: string;
  data: any;
  timestamp: Date;
}

class OfflineQueue {
  private queue: PendingOperation[] = [];
  
  enqueue(operation: PendingOperation): void {
    this.queue.push(operation);
    this.saveQueueToLocalStorage();
  }
  
  processQueue(): Observable<void> {
    // Process all pending operations when online
    return from(this.queue).pipe(
      concatMap(op => this.executeOperation(op)),
      tap(() => this.clearQueue())
    );
  }
}
```

## Testing Strategy

### Unit Tests

1. **Service Tests**
   - Test Firestore save/load operations
   - Test migration logic
   - Test error handling
   - Mock DatabaseService

2. **Migration Tests**
   - Test localStorage to Firestore migration
   - Test migration with missing data
   - Test migration with corrupted data
   - Test migration idempotency

3. **Error Handling Tests**
   - Test network failure scenarios
   - Test retry logic
   - Test offline queue

### Integration Tests

1. **End-to-End Data Flow**
   - Complete exercise → Save to Firestore
   - Unlock achievement → Save to Firestore
   - Claim rewards → Update Firestore

2. **Migration Scenarios**
   - New user (no localStorage)
   - Existing user (with localStorage)
   - User with partial data

### Manual Testing Checklist

- [ ] Complete exercise and verify Firestore save
- [ ] Unlock achievement and verify Firestore save
- [ ] Claim rewards and verify Firestore save
- [ ] Toggle favorite and verify Firestore save
- [ ] Clear browser cache and verify data persists
- [ ] Test with network offline
- [ ] Test migration from localStorage
- [ ] Verify localStorage is cleared after migration
- [ ] Test on multiple devices with same account

## Performance Considerations

### Optimization Strategies

1. **Batch Writes**: Group multiple updates when possible
2. **Debouncing**: Debounce rapid updates (e.g., favorites)
3. **Caching**: Cache Firestore data in memory
4. **Lazy Loading**: Load data only when needed

### Monitoring

- Log all Firestore operations with timing
- Track migration success/failure rates
- Monitor error rates by type
- Track offline queue size

## Security Considerations

### Firestore Security Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // User can only access their own data
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
      
      match /data/{document} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
      
      match /customExercises/{exerciseId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
    }
  }
}
```

### Data Validation

- Validate all data before saving to Firestore
- Sanitize user input
- Implement server-side validation for critical operations (rewards, achievements)

## Migration Plan

### Phase 1: Preparation
- Add new Firestore methods to DatabaseService
- Implement migration logic in each service
- Add comprehensive logging

### Phase 2: Testing
- Test migration with sample data
- Verify data integrity
- Test error scenarios

### Phase 3: Deployment
- Deploy with migration enabled
- Monitor migration success rates
- Address any issues

### Phase 4: Cleanup
- Remove localStorage code after successful migration period
- Remove migration logic after all users migrated
- Update documentation

## Rollback Strategy

If critical issues are discovered:

1. **Immediate**: Revert to previous version
2. **Data Recovery**: Restore from Firestore backups
3. **User Communication**: Notify affected users
4. **Investigation**: Analyze logs and identify root cause
5. **Fix and Redeploy**: Address issues and redeploy

## Documentation Updates

- Update service documentation
- Document Firestore schema
- Update developer guide
- Create migration troubleshooting guide
