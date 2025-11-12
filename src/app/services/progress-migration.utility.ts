import { Injectable, inject } from '@angular/core';
import { Observable, forkJoin, of } from 'rxjs';
import { map, switchMap, tap } from 'rxjs/operators';
import { ProgressService } from './progress.service';
import { ExerciseService } from './exercise.service';
import { DatabaseService } from './database/database.service';
import { UserProgress, ExerciseAttempt } from '../models/exercise.model';

/**
 * Utility service to migrate old progress data to include category and level
 */
@Injectable({
  providedIn: 'root'
})
export class ProgressMigrationUtility {
  private progressService = inject(ProgressService);
  private exerciseService = inject(ExerciseService);
  private databaseService = inject(DatabaseService);

  /**
   * Check if migration is needed (any attempt missing category or level)
   */
  needsMigration(progress: UserProgress): boolean {
    const attempts = Object.values(progress.exerciseHistory);
    return attempts.some(attempt => !attempt.category || !attempt.level);
  }

  /**
   * Migrate progress data by adding category and level to attempts
   */
  migrateProgressData(): Observable<boolean> {
    console.log('[ProgressMigration] Starting migration...');

    return this.progressService.getUserProgress().pipe(
      switchMap(progress => {
        if (!this.needsMigration(progress)) {
          console.log('[ProgressMigration] No migration needed');
          return of(false);
        }

        console.log('[ProgressMigration] Migration needed, fetching exercise data...');

        // Get all exercise IDs that need migration
        const attemptsToMigrate = Object.entries(progress.exerciseHistory)
          .filter(([_, attempt]) => !attempt.category || !attempt.level)
          .map(([exerciseId, attempt]) => ({ exerciseId, attempt }));

        if (attemptsToMigrate.length === 0) {
          return of(false);
        }

        // Fetch all exercises
        const exerciseIds = attemptsToMigrate.map(item => item.exerciseId);
        return this.exerciseService.getExercisesByIds(exerciseIds).pipe(
          map(exercises => {
            const exerciseMap = new Map(exercises.map(ex => [ex.id, ex]));
            
            // Update attempts with category and level
            const updatedHistory = { ...progress.exerciseHistory };
            let updateCount = 0;

            attemptsToMigrate.forEach(({ exerciseId, attempt }) => {
              const exercise = exerciseMap.get(exerciseId);
              if (exercise) {
                updatedHistory[exerciseId] = {
                  ...attempt,
                  category: exercise.category,
                  level: exercise.level
                };
                updateCount++;
              }
            });

            console.log(`[ProgressMigration] Updated ${updateCount} attempts`);

            // Save updated progress
            const updatedProgress: UserProgress = {
              ...progress,
              exerciseHistory: updatedHistory
            };

            return updatedProgress;
          }),
          switchMap(updatedProgress => {
            return this.databaseService.saveProgressAuto(updatedProgress).pipe(
              map(() => true)
            );
          }),
          tap(() => {
            console.log('[ProgressMigration] Migration completed successfully');
          })
        );
      })
    );
  }
}
