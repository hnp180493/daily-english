import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input
} from '@angular/core';
import { PronunciationAttempt } from '../../../models/pronunciation.model';
import { PronunciationAggregatorService } from '../../../services/pronunciation/pronunciation-aggregator.service';
import { TranslationService } from '../../../services/translation.service';

@Component({
  selector: 'app-pronunciation-stats',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pronunciation-stats.html',
  styleUrl: './pronunciation-stats.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PronunciationStatsComponent {
  attempts = input.required<PronunciationAttempt[]>();

  private aggregator = inject(PronunciationAggregatorService);
  protected translate = inject(TranslationService);

  stats = computed(() => this.aggregator.aggregate(this.attempts()));
  isEmpty = computed(() => this.stats().totalAttempts === 0);

  scoreColor = computed(() => {
    const avg = this.stats().averageScore;
    if (avg >= 85) return 'text-green-400';
    if (avg >= 60) return 'text-amber-400';
    return 'text-red-400';
  });

  trendPath = computed(() => {
    const trend = this.stats().scoreTrend;
    if (trend.length < 2) return '';
    const w = 240;
    const h = 60;
    const xs = trend.map((_, i) => (i / (trend.length - 1)) * w);
    const ys = trend.map(p => h - (p.score / 100) * h);
    return xs.map((x, i) => `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${ys[i].toFixed(1)}`).join(' ');
  });

  lastTrendScore = computed(() => {
    const trend = this.stats().scoreTrend;
    return trend.length > 0 ? trend[trend.length - 1].score : 0;
  });
}
