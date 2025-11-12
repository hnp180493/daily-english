import { Component, ChangeDetectionStrategy, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ReviewService } from '../../services/review.service';
import { ErrorPattern, WeakPoint, GrammarLesson, VocabularyDrill } from '../../models/review.model';

@Component({
  selector: 'app-error-patterns',
  imports: [CommonModule],
  templateUrl: './error-patterns.html',
  styleUrl: './error-patterns.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ErrorPatternsComponent implements OnInit {
  private reviewService = inject(ReviewService);
  private router = inject(Router);

  // Signals for component state
  errorPatterns = signal<ErrorPattern[]>([]);
  weakPoints = signal<WeakPoint[]>([]);
  isLoading = signal(true);
  selectedWeakPoint = signal<WeakPoint | null>(null);

  ngOnInit(): void {
    this.loadErrorPatterns();
    this.loadWeakPoints();
  }

  private loadErrorPatterns(): void {
    this.reviewService.getErrorPatterns().subscribe(patterns => {
      this.errorPatterns.set(patterns);
      this.isLoading.set(false);
    });
  }

  private loadWeakPoints(): void {
    this.reviewService.getWeakPoints().subscribe(weakPoints => {
      this.weakPoints.set(weakPoints);
    });
  }

  viewGrammarLesson(pattern: ErrorPattern): void {
    // Navigate to grammar lesson or show modal
    console.log('[ErrorPatternsComponent] View grammar lesson for:', pattern);
    // TODO: Implement grammar lesson view
  }

  startVocabularyDrill(pattern: ErrorPattern): void {
    // Start vocabulary drill for this pattern
    console.log('[ErrorPatternsComponent] Start vocabulary drill for:', pattern);
    // TODO: Implement vocabulary drill
  }

  generateCustomExercise(weakPoint: WeakPoint): void {
    this.selectedWeakPoint.set(weakPoint);
    this.reviewService.generateCustomExercise(weakPoint).subscribe(exercise => {
      if (exercise && exercise.id) {
        // Navigate to the custom exercise
        this.router.navigate(['/exercise', exercise.id]);
      }
    });
  }

  getPatternTypeColor(type: string): string {
    switch (type) {
      case 'grammar':
        return 'bg-blue-100 text-blue-800';
      case 'vocabulary':
        return 'bg-green-100 text-green-800';
      case 'structure':
        return 'bg-purple-100 text-purple-800';
      case 'spelling':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  getImprovementColor(rate: number): string {
    if (rate >= 50) {
      return 'text-green-600';
    } else if (rate >= 25) {
      return 'text-yellow-600';
    } else {
      return 'text-red-600';
    }
  }

  formatDate(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return 'Today';
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else if (diffDays < 30) {
      const weeks = Math.floor(diffDays / 7);
      return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
    } else {
      const months = Math.floor(diffDays / 30);
      return `${months} month${months > 1 ? 's' : ''} ago`;
    }
  }
}
