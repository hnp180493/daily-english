import { Component, ChangeDetectionStrategy, input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WeakAreaData } from '../../../models/enhanced-analytics.model';

/**
 * Weak Areas Analysis Component
 * Identifies and displays challenging sentence patterns
 */
@Component({
  selector: 'app-weak-areas-analysis',
  imports: [CommonModule],
  templateUrl: './weak-areas-analysis.html',
  styleUrl: './weak-areas-analysis.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class WeakAreasAnalysisComponent {
  data = input.required<WeakAreaData[]>();
  
  // Track expanded weak area
  expandedIndex = signal<number | null>(null);

  /**
   * Toggle expansion of a weak area
   */
  toggleExpand(index: number): void {
    this.expandedIndex.set(this.expandedIndex() === index ? null : index);
  }

  /**
   * Check if a weak area is expanded
   */
  isExpanded(index: number): boolean {
    return this.expandedIndex() === index;
  }

  /**
   * Handle keyboard navigation
   */
  handleKeyDown(event: KeyboardEvent, index: number): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.toggleExpand(index);
    }
  }

  /**
   * Get progress towards minimum exercises
   */
  getProgress(totalExercises: number): number {
    return Math.min((totalExercises / 10) * 100, 100);
  }

  /**
   * Get accuracy color class
   */
  getAccuracyColorClass(accuracy: number): string {
    if (accuracy >= 80) return 'text-green-600 dark:text-green-400';
    if (accuracy >= 60) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  }

  /**
   * Get accuracy background class
   */
  getAccuracyBgClass(accuracy: number): string {
    if (accuracy >= 80) return 'bg-green-50 dark:bg-green-900/20';
    if (accuracy >= 60) return 'bg-yellow-50 dark:bg-yellow-900/20';
    return 'bg-red-50 dark:bg-red-900/20';
  }
}
