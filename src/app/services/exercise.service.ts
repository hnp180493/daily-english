import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, combineLatest } from 'rxjs';
import { map, switchMap, filter } from 'rxjs/operators';
import { Exercise, DifficultyLevel, ExerciseCategory, CustomExercise } from '../models/exercise.model';
import { CustomExerciseService } from './custom-exercise.service';

@Injectable({
  providedIn: 'root'
})
export class ExerciseService {
  private http = inject(HttpClient);
  private customExerciseService = inject(CustomExerciseService);
  
  private exercises$ = new BehaviorSubject<Exercise[]>([]);
  private selectedLevel$ = new BehaviorSubject<DifficultyLevel | null>(null);
  private selectedCategory$ = new BehaviorSubject<ExerciseCategory | null>(null);

  constructor() {
    this.loadExercises();
  }

  getFilteredExercises(): Observable<Exercise[]> {
    return combineLatest([
      this.exercises$,
      this.selectedLevel$,
      this.selectedCategory$
    ]).pipe(
      map(([exercises, level, category]) =>
        exercises.filter(ex =>
          (!level || ex.level === level) &&
          (!category || ex.category === category)
        )
      )
    );
  }

  getAllExercises(): Observable<Exercise[]> {
    return this.exercises$.asObservable();
  }

  setLevel(level: DifficultyLevel | null): void {
    this.selectedLevel$.next(level);
  }

  setCategory(category: ExerciseCategory | null): void {
    this.selectedCategory$.next(category);
  }

  getSelectedLevel(): Observable<DifficultyLevel | null> {
    return this.selectedLevel$.asObservable();
  }

  getSelectedCategory(): Observable<ExerciseCategory | null> {
    return this.selectedCategory$.asObservable();
  }

  getExerciseById(id: string): Observable<Exercise | undefined> {
    return this.exercises$.pipe(
      filter(exercises => exercises.length > 0),
      map(exercises => exercises.find(ex => ex.id === id))
    );
  }

  getExercisesByIds(ids: string[]): Observable<Exercise[]> {
    return this.exercises$.pipe(
      filter(exercises => exercises.length > 0),
      map(exercises => exercises.filter(ex => ids.includes(ex.id)))
    );
  }

  // Check if exercise ID is for a custom exercise
  isCustomExercise(id: string): boolean {
    return id.startsWith('custom-');
  }

  // Get exercise from either regular or custom source
  getExerciseByIdUnified(id: string): Observable<Exercise | CustomExercise | undefined> {
    if (this.isCustomExercise(id)) {
      return this.customExerciseService.getCustomExerciseById(id);
    }
    return this.getExerciseById(id).pipe(
      switchMap(exercise => {
        // If not found in regular exercises, try custom exercises as fallback
        if (!exercise) {
          return this.customExerciseService.getCustomExerciseById(id);
        }
        return [exercise];
      })
    );
  }

  private loadExercises(): void {
    // Load all exercises from single combined file
    this.http.get<Exercise[]>('/data/exercises/all-exercises.json').subscribe({
      next: (allExercises) => {
        // Sort by ID
        allExercises.sort((a, b) => {
          const idA = parseInt(a.id.replace('ex-', ''));
          const idB = parseInt(b.id.replace('ex-', ''));
          return idA - idB;
        });
        this.exercises$.next(allExercises);
      },
      error: (error) => console.error('Failed to load exercises:', error)
    });
  }
}
