import { Component, ChangeDetectionStrategy, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReviewStats } from '../../models/review.model';

@Component({
  selector: 'app-review-stats',
  imports: [CommonModule],
  templateUrl: './review-stats.html',
  styleUrl: './review-stats.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ReviewStatsComponent {
  // Input signal
  stats = input.required<ReviewStats>();


}
