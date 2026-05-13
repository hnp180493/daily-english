import { Component, ChangeDetectionStrategy, input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReviewStats } from '../../models/review.model';
import { TranslationService } from '../../services/translation.service';

@Component({
  selector: 'app-review-stats',
  imports: [CommonModule],
  templateUrl: './review-stats.html',
  styleUrl: './review-stats.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ReviewStatsComponent {
  protected translate = inject(TranslationService);
  stats = input.required<ReviewStats>();
}
