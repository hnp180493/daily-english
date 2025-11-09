import { Component, ChangeDetectionStrategy, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AnalyticsData } from '../../../models/analytics.model';

@Component({
  selector: 'app-vocabulary-stats',
  imports: [CommonModule],
  templateUrl: './vocabulary-stats.html',
  styleUrl: './vocabulary-stats.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class VocabularyStatsComponent {
  analytics = input.required<AnalyticsData>();

  showWordDetails(word: { text: string; frequency: number; size: number }): void {
    console.log('Word details:', word);
    // Future enhancement: Show modal with example sentences
  }
}
