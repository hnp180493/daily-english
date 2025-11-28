import { Injectable, inject, signal, effect } from '@angular/core';
import { Observable, of, combineLatest, forkJoin } from 'rxjs';
import { map, switchMap, tap, catchError } from 'rxjs/operators';
import {
  ReviewData,
  ReviewDataWithMetadata,
  ReviewQueueItem,
  UrgencyLevel,
  ErrorPattern,
  WeakPoint,
  ReviewStats
} from '../models/review.model';
import { Exercise, SentenceAttempt } from '../models/exercise.model';
import { ProgressService } from './progress.service';
import { ExerciseService } from './exercise.service';
import { DatabaseService } from './database/database.service';
import { ErrorPatternAnalyzer } from './error-pattern-analyzer';
import { AuthService } from './auth.service';
import { ReviewMigrationUtility } from './review-migration.utility';
import { ToastService } from './toast.service';
import { Router } from '@angular/router';
import * as SpacedRepetition from './spaced-repetition.algorithm';

@Injectable({
  providedIn: 'root'
})
export class ReviewService {
  private progressService = inject(ProgressService);
  private exerciseService = inject(ExerciseService);
  private databaseService = inject(DatabaseService);
  private errorPatternAnalyzer = inject(ErrorPatternAnalyzer);
  private authService = inject(AuthService);
  private toastService = inject(ToastService);
  private router = inject(Router);

  // Signal for reactive review queue
  private reviewQueueSignal = signal<ReviewQueueItem[]>([]);
  private migrationCompleted = false;

  // Cache for review data
  private reviewDataCache = new Map<string, ReviewDataWithMetadata>();
  private allReviewDataCache: ReviewDataWithMetadata[] | null = null;
  private cacheTimestamp: number = 0;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  // Notification management
  private notificationIntervalId: any = null;
  private notificationInitialized = false;
  private lastNotificationTime = 0;
  private readonly NOTIFICATION_COOLDOWN = 60 * 60 * 1000; // 1 hour cooldown between notifications

  // Guard against duplicate scheduleNextReview calls
  private schedulingInProgress = new Map<string, boolean>();

  private currentUserId: string | null = null;

  constructor() {
    // Initialize current user ID immediately
    const initialUser = this.authService.currentUser();
    this.currentUserId = initialUser?.uid || null;
    
    // Load review queue immediately if user is already logged in
    if (this.currentUserId) {
      console.log('[ReviewService] User already logged in, loading review queue');
      setTimeout(() => {
        this.getReviewQueue().subscribe();
      }, 500);
    }
    
    // Trigger migration check when user logs in
    effect(() => {
      const user = this.authService.currentUser();
      const userId = user?.uid || null;
      
      // Only initialize if user changed
      if (userId && userId !== this.currentUserId) {
        console.log('[ReviewService] User logged in:', userId);
        this.currentUserId = userId;
        this.migrationCompleted = false; // Reset for new user
        this.checkAndMigrateReviewData();
        // Load review queue after migration
        setTimeout(() => {
          this.getReviewQueue().subscribe();
        }, 1000);
        // Initialize notifications after migration (only once)
        if (!this.notificationInitialized) {
          setTimeout(() => this.initializeNotifications(), 2000);
        }
      } else if (!userId && this.currentUserId) {
        // User logged out
        console.log('[ReviewService] User logged out');
        this.currentUserId = null;
        this.migrationCompleted = false;
        this.reviewQueueSignal.set([]);
        this.cleanupNotifications();
      }
    });
  }

  /**
   * Get the review queue as a signal for reactive components
   */
  getReviewQueueSignal() {
    return this.reviewQueueSignal.asReadonly();
  }

  /**
   * Check if migration is needed and perform it
   * This runs once per user session on initialization
   */
  private checkAndMigrateReviewData(): void {
    // Guard against multiple simultaneous calls
    if (this.migrationCompleted) {
      console.log('[ReviewService] Migration already completed, skipping');
      return;
    }

    console.log('[ReviewService] Checking if review data migration is needed...');

    combineLatest([
      this.databaseService.loadAllReviewDataAuto(),
      this.progressService.getUserProgress()
    ]).pipe(
      switchMap(([existingReviewData, progress]) => {
        // Check if migration is needed
        if (!ReviewMigrationUtility.isMigrationNeeded(existingReviewData, progress)) {
          this.migrationCompleted = true;
          return of(null);
        }

        // Perform migration
        console.log('[ReviewService] Starting review data migration...');
        const userId = this.authService.getUserId();
        if (!userId) {
          console.error('[ReviewService] No user ID available for migration');
          return of(null);
        }

        const reviewDataList = ReviewMigrationUtility.migrateProgressToReviewData(progress, userId);
        
        // Save all review data to database
        // Extract only ReviewData fields (without metadata) for storage
        const saveOperations = reviewDataList.map(reviewDataWithMeta => {
          const { exerciseId, userId: _, createdAt: __, updatedAt: ___, ...reviewData } = reviewDataWithMeta;
          return this.databaseService.saveReviewDataAuto(exerciseId, reviewData);
        });

        return forkJoin(saveOperations).pipe(
          tap(() => {
            ReviewMigrationUtility.logMigrationResults(reviewDataList);
            this.migrationCompleted = true;
            console.log('[ReviewService] Migration completed successfully');
          }),
          catchError(error => {
            console.error('[ReviewService] Migration failed:', error);
            this.migrationCompleted = true; // Mark as completed to avoid retry loops
            return of(null);
          })
        );
      }),
      catchError(error => {
        console.error('[ReviewService] Error checking migration status:', error);
        this.migrationCompleted = true;
        return of(null);
      })
    ).subscribe();
  }

  /**
   * Get the review queue as an observable
   */
  getReviewQueue(): Observable<ReviewQueueItem[]> {
    // Check if cache is valid
    if (this.isCacheValid() && this.allReviewDataCache) {
      console.log('[ReviewService] Using cached review data');
      return this.buildReviewQueue(this.allReviewDataCache);
    }

    return combineLatest([
      this.databaseService.loadAllReviewDataAuto(),
      this.progressService.getUserProgress()
    ]).pipe(
      switchMap(([reviewDataList]) => {
        if (!reviewDataList || reviewDataList.length === 0) {
          return of([]);
        }

        // Update cache
        this.updateCache(reviewDataList);

        return this.buildReviewQueue(reviewDataList);
      }),
      tap(queue => this.reviewQueueSignal.set(queue)),
      catchError(error => {
        console.error('[ReviewService] Error loading review queue:', error);
        // Return cached data if available
        if (this.allReviewDataCache) {
          console.log('[ReviewService] Returning cached data after error');
          return this.buildReviewQueue(this.allReviewDataCache);
        }
        return of([]);
      })
    );
  }

  /**
   * Build review queue from review data list
   */
  private buildReviewQueue(reviewDataList: ReviewDataWithMetadata[]): Observable<ReviewQueueItem[]> {
    // Get all exercises for the review data
    const exerciseIds = reviewDataList.map(rd => rd.exerciseId);
    return this.exerciseService.getExercisesByIds(exerciseIds).pipe(
      map((exercises: Exercise[]) => {
        const exerciseMap = new Map(exercises.map(ex => [ex.id, ex]));

        return reviewDataList
          .map(reviewData => {
            const exercise = exerciseMap.get(reviewData.exerciseId);
            if (!exercise) return null;

            const urgency = this.calculateUrgency(reviewData);
            const estimatedTime = this.estimateReviewTime(exercise, reviewData);
            const incorrectQuestionCount = reviewData.incorrectSentenceIndices?.length || 0;

            return {
              exerciseId: reviewData.exerciseId,
              exercise,
              urgency,
              nextReviewDate: reviewData.nextReviewDate,
              lastScore: reviewData.lastScore,
              estimatedTime,
              incorrectQuestionCount,
              reviewData
            } as ReviewQueueItem;
          })
          .filter((item): item is ReviewQueueItem => item !== null)
          .sort((a, b) => this.compareUrgency(a.urgency, b.urgency));
      })
    );
  }

  /**
   * Schedule the next review for an exercise based on performance
   */
  scheduleNextReview(exerciseId: string, performance: number): void {
    // Guard against duplicate calls
    if (this.schedulingInProgress.get(exerciseId)) {
      console.log(`[ReviewService] Already scheduling review for ${exerciseId}, skipping duplicate call`);
      return;
    }

    this.schedulingInProgress.set(exerciseId, true);

    this.databaseService.loadReviewDataAuto(exerciseId).subscribe({
      next: existingReview => {
        const now = new Date();

        if (existingReview) {
          // Update existing review data
          const schedule = SpacedRepetition.calculateNextInterval(
            existingReview.interval,
            existingReview.easinessFactor,
            performance
          );

          const updatedReview: ReviewData = {
            ...existingReview,
            easinessFactor: schedule.easinessFactor,
            interval: schedule.interval,
            nextReviewDate: schedule.nextReviewDate,
            repetitionCount: existingReview.repetitionCount + 1,
            lastReviewDate: now,
            lastScore: performance
          };

          this.databaseService.saveReviewDataAuto(exerciseId, updatedReview).subscribe({
            next: () => {
              console.log('[ReviewService] Review scheduled for', exerciseId);
              // Invalidate cache and refresh the queue
              this.invalidateCache();
              this.getReviewQueue().subscribe();
              // Clear scheduling flag
              this.schedulingInProgress.delete(exerciseId);
            },
            error: error => {
              console.error('[ReviewService] Failed to save review data:', error);
              // Clear scheduling flag on error too
              this.schedulingInProgress.delete(exerciseId);
            }
          });
        } else {
          // Create new review data
          const schedule = SpacedRepetition.calculateNextInterval(
            0, // First review
            2.5, // Default easiness factor
            performance
          );

          const newReview: ReviewData = {
            easinessFactor: schedule.easinessFactor,
            interval: schedule.interval,
            nextReviewDate: schedule.nextReviewDate,
            repetitionCount: 1,
            lastReviewDate: now,
            lastScore: performance,
            incorrectSentenceIndices: []
          };

          this.databaseService.saveReviewDataAuto(exerciseId, newReview).subscribe({
            next: () => {
              console.log('[ReviewService] Initial review created for', exerciseId);
              // Invalidate cache and refresh the queue
              this.invalidateCache();
              this.getReviewQueue().subscribe();
              // Clear scheduling flag
              this.schedulingInProgress.delete(exerciseId);
            },
            error: error => {
              console.error('[ReviewService] Failed to create review data:', error);
              // Clear scheduling flag on error too
              this.schedulingInProgress.delete(exerciseId);
            }
          });
        }
      },
      error: error => {
        console.error('[ReviewService] Failed to load review data:', error);
        // Clear scheduling flag on error
        this.schedulingInProgress.delete(exerciseId);
      }
    });
  }

  /**
   * Get the next review date for an exercise
   */
  getNextReviewDate(exerciseId: string): Observable<Date | null> {
    return this.databaseService.loadReviewDataAuto(exerciseId).pipe(
      map(reviewData => reviewData?.nextReviewDate || null),
      catchError(() => of(null))
    );
  }

  /**
   * Get exercises that are due for review
   */
  getDueReviews(): Observable<ReviewQueueItem[]> {
    return this.getReviewQueue().pipe(
      map(queue => {
        const now = new Date();
        return queue.filter(item => item.nextReviewDate <= now);
      })
    );
  }

  /**
   * Get error patterns from user's exercise attempts
   */
  getErrorPatterns(): Observable<ErrorPattern[]> {
    return this.progressService.getUserProgress().pipe(
      map(progress => {
        const attempts = Object.values(progress.exerciseHistory);
        return this.errorPatternAnalyzer.analyzePatterns(attempts);
      }),
      catchError(error => {
        console.error('[ReviewService] Error analyzing patterns:', error);
        return of([]);
      })
    );
  }

  /**
   * Get weak points identified from error patterns
   */
  getWeakPoints(): Observable<WeakPoint[]> {
    return this.getErrorPatterns().pipe(
      map(patterns => this.errorPatternAnalyzer.identifyWeakPoints(patterns)),
      catchError(error => {
        console.error('[ReviewService] Error identifying weak points:', error);
        return of([]);
      })
    );
  }

  /**
   * Generate a custom exercise targeting a specific weak point
   */
  generateCustomExercise(weakPoint: WeakPoint): Observable<Exercise> {
    // For now, return an observable that will be implemented later
    // This would integrate with AI service to generate custom exercises
    console.log('[ReviewService] Custom exercise generation for weak point:', weakPoint);
    return of({} as Exercise);
  }

  /**
   * Get review statistics for the user
   */
  getReviewStats(): Observable<ReviewStats> {
    return combineLatest([
      this.databaseService.loadAllReviewDataAuto(),
      this.progressService.getUserProgress()
    ]).pipe(
      map(([reviewDataList, progress]) => {
        const now = new Date();
        const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

        // Calculate reviews this week (based on lastReviewDate)
        const reviewsThisWeek = reviewDataList.filter(rd => rd.lastReviewDate >= oneWeekAgo).length;

        // Calculate weak points improved: exercises that improved from < 80% to >= 80%
        const exerciseHistory = Object.values(progress.exerciseHistory);
        const weakPointsImproved = this.calculateImprovedExercises(exerciseHistory);

        // Use the same streak calculation as header (from ProgressService)
        const currentStreak = this.progressService.calculateStreak();

        // Total reviews completed (count of all review data entries)
        const totalReviewsCompleted = reviewDataList.reduce((sum, rd) => sum + rd.repetitionCount, 0);

        return {
          reviewsThisWeek,
          weakPointsImproved,
          currentStreak,
          totalReviewsCompleted
        };
      }),
      catchError(error => {
        console.error('[ReviewService] Error calculating stats:', error);
        return of({
          reviewsThisWeek: 0,
          weakPointsImproved: 0,
          currentStreak: 0,
          totalReviewsCompleted: 0
        });
      })
    );
  }

  /**
   * Calculate number of exercises that improved from weak (< 80%) to strong (>= 80%)
   * by comparing with review history
   */
  private calculateImprovedExercises(exerciseHistory: any[]): number {
    let improvedCount = 0;

    exerciseHistory.forEach(attempt => {
      // Current score is >= 80% (strong)
      if (attempt.accuracyScore >= 80) {
        // Check if this exercise was previously weak (< 80%)
        // We can infer this from sentence attempts with low accuracy or high retries
        if (attempt.sentenceAttempts && Array.isArray(attempt.sentenceAttempts)) {
          const hasWeakSentences = attempt.sentenceAttempts.some(
            (sa: any) => sa.accuracyScore < 80 || sa.retryCount > 1
          );
          
          if (hasWeakSentences) {
            improvedCount++;
          }
        }
      }
    });

    return improvedCount;
  }

  /**
   * Get incorrect questions for quick review mode
   */
  getIncorrectQuestions(exerciseId: string): SentenceAttempt[] {
    // Get the exercise attempt from progress service signal (synchronous)
    const progress = this.progressService.getProgressSignal()();
    const attempt = progress.exerciseHistory[exerciseId];
    
    if (!attempt?.sentenceAttempts) {
      return [];
    }

    // Filter sentences with >= 2 issues (incorrectAttempts + retryCount)
    return attempt.sentenceAttempts.filter((sa, index) => {
      const issues = (sa.incorrectAttempts || 0) + (sa.retryCount || 0);
      return issues >= 2;
    });
  }

  /**
   * Check for reviews due within 24 hours and return count
   * This can be used to display notifications
   */
  checkDueReviews(): Observable<{ count: number; urgentCount: number }> {
    return this.databaseService.loadAllReviewDataAuto().pipe(
      map(reviewDataList => {
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Reset to start of day for date-only comparison

        // Count reviews that are due today or earlier (compare dates only)
        const dueNow = reviewDataList.filter(rd => {
          const reviewDate = new Date(rd.nextReviewDate);
          reviewDate.setHours(0, 0, 0, 0); // Reset to start of day
          return reviewDate <= today;
        });

        // Count urgent reviews (due today or earlier AND score < 60%)
        const urgentReviews = dueNow.filter(rd => rd.lastScore < 60);

        return {
          count: dueNow.length,
          urgentCount: urgentReviews.length
        };
      }),
      catchError(error => {
        console.error('[ReviewService] Error checking due reviews:', error);
        return of({ count: 0, urgentCount: 0 });
      })
    );
  }

  /**
   * Initialize notification checking
   * Call this on app initialization to set up periodic checks
   */
  initializeNotifications(): void {
    // Prevent multiple initializations
    if (this.notificationInitialized) {
      console.log('[ReviewService] Notifications already initialized, skipping');
      return;
    }

    this.notificationInitialized = true;
    console.log('[ReviewService] Initializing notifications');

    // Check immediately on initialization
    this.checkDueReviews().subscribe(({ count, urgentCount }) => {
      if (count > 0 || urgentCount > 0) {
        this.showReviewNotification(count, urgentCount);
      }
    });

    // Clear any existing interval
    if (this.notificationIntervalId) {
      clearInterval(this.notificationIntervalId);
    }

    // Set up periodic checks (every hour)
    this.notificationIntervalId = setInterval(() => {
      this.checkDueReviews().subscribe(({ count, urgentCount }) => {
        if (count > 0 || urgentCount > 0) {
          this.showReviewNotification(count, urgentCount);
        }
      });
    }, 60 * 60 * 1000); // Check every hour
  }

  /**
   * Clean up notification resources
   */
  private cleanupNotifications(): void {
    if (this.notificationIntervalId) {
      clearInterval(this.notificationIntervalId);
      this.notificationIntervalId = null;
    }
    this.notificationInitialized = false;
    this.lastNotificationTime = 0;
    console.log('[ReviewService] Notifications cleaned up');
  }

  /**
   * Show a review notification with toast UI
   * Includes cooldown to prevent spam
   */
  private showReviewNotification(dueCount: number, urgentCount: number): void {
    // Check cooldown to prevent spam
    const now = Date.now();
    if (now - this.lastNotificationTime < this.NOTIFICATION_COOLDOWN) {
      console.log('[ReviewService] Notification cooldown active, skipping');
      return;
    }

    this.lastNotificationTime = now;

    if (urgentCount > 0) {
      const message = urgentCount === 1 
        ? '� BBạn có 1 bài ôn tập khẩn cấp cần làm ngay!'
        : `🔴 Bạn có ${urgentCount} bài ôn tập khẩn cấp cần làm ngay!`;
      
      this.toastService.show(message, 'warning', 10000, {
        label: 'Xem ngay',
        callback: () => this.router.navigate(['/review-queue'])
      });
    } else if (dueCount > 0) {
      const message = dueCount === 1
        ? '📚 Bạn có 1 bài đã đến hạn ôn tập'
        : `📚 Bạn có ${dueCount} bài đã đến hạn ôn tập`;
      
      this.toastService.show(message, 'info', 8000, {
        label: 'Xem danh sách',
        callback: () => this.router.navigate(['/review-queue'])
      });
    }
  }

  // Private helper methods

  private calculateUrgency(reviewData: ReviewData): UrgencyLevel {
    const now = new Date();
    now.setHours(0, 0, 0, 0); // Reset to start of day

    const reviewDate = new Date(reviewData.nextReviewDate);
    reviewDate.setHours(0, 0, 0, 0); // Reset to start of day

    // Calculate days difference
    const daysDiff = Math.floor(
      (reviewDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysDiff < 0) {
      // Overdue (past due date)
      return UrgencyLevel.HIGH;
    } else if (daysDiff <= 1) {
      // Due today or tomorrow (0-1 days)
      return UrgencyLevel.MEDIUM;
    } else {
      // Scheduled for later (2-5 days away)
      return UrgencyLevel.LOW;
    }
  }

  private estimateReviewTime(exercise: Exercise, reviewData: ReviewData): number {
    // Base time: 2 minutes per sentence
    const baseTime = exercise.highlightedSentences.length * 2;

    // Adjust based on difficulty
    const difficultyMultiplier =
      {
        beginner: 0.8,
        intermediate: 1.0,
        advanced: 1.3
      }[exercise.level] || 1.0;

    // Adjust based on previous performance
    const performanceMultiplier = reviewData.lastScore < 60 ? 1.5 : 1.0;

    return Math.round(baseTime * difficultyMultiplier * performanceMultiplier);
  }

  private compareUrgency(a: UrgencyLevel, b: UrgencyLevel): number {
    const urgencyOrder = {
      [UrgencyLevel.HIGH]: 0,
      [UrgencyLevel.MEDIUM]: 1,
      [UrgencyLevel.LOW]: 2
    };
    return urgencyOrder[a] - urgencyOrder[b];
  }



  /**
   * Check if cache is still valid
   */
  private isCacheValid(): boolean {
    const now = Date.now();
    return this.cacheTimestamp > 0 && (now - this.cacheTimestamp) < this.CACHE_DURATION;
  }

  /**
   * Update the cache with new review data
   */
  private updateCache(reviewDataList: ReviewDataWithMetadata[]): void {
    this.allReviewDataCache = reviewDataList;
    this.cacheTimestamp = Date.now();

    // Update individual cache entries
    this.reviewDataCache.clear();
    reviewDataList.forEach(rd => {
      this.reviewDataCache.set(rd.exerciseId, rd);
    });

    // console.log(`[ReviewService] Cache updated with ${reviewDataList.length} entries`);
  }

  /**
   * Invalidate the cache (call after updates)
   * Public method to allow components to force refresh
   */
  invalidateCache(): void {
    this.allReviewDataCache = null;
    this.cacheTimestamp = 0;
    this.reviewDataCache.clear();
    // console.log('[ReviewService] Cache invalidated');
  }

  /**
   * Get cached review data for a specific exercise
   */
  getCachedReviewData(exerciseId: string): ReviewDataWithMetadata | null {
    if (this.isCacheValid()) {
      return this.reviewDataCache.get(exerciseId) || null;
    }
    return null;
  }
}
