import { Component, ChangeDetectionStrategy, input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AnalyticsData } from '../../../models/analytics.model';
import { TranslationService } from '../../../services/translation.service';

@Component({
  selector: 'app-vocabulary-stats',
  imports: [CommonModule],
  templateUrl: './vocabulary-stats.html',
  styleUrl: './vocabulary-stats.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class VocabularyStatsComponent {
  analytics = input.required<AnalyticsData>();
  protected translate = inject(TranslationService);

  showWordDetails(word: { text: string; frequency: number; size: number }): void {
    console.log('Word details:', word);
    // Future enhancement: Show modal with example sentences
  }
}
