import {
  Component,
  ChangeDetectionStrategy,
  input,
  AfterViewInit,
  ViewChild,
  ElementRef,
  OnDestroy,
  inject,
  effect,
  signal,
  untracked
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Chart, ChartConfiguration, registerables } from 'chart.js';
import { AnalyticsData } from '../../../models/analytics.model';
import { TranslationService } from '../../../services/translation.service';
import { categoryLabel, dateLocale, levelLabel, tCount } from '../dashboard-i18n';

// Register Chart.js components
Chart.register(...registerables);

@Component({
  selector: 'app-progress-charts',
  imports: [CommonModule],
  templateUrl: './progress-charts.html',
  styleUrl: './progress-charts.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProgressChartsComponent implements AfterViewInit, OnDestroy {
  private router = inject(Router);
  protected translate = inject(TranslationService);

  analytics = input.required<AnalyticsData>();

  @ViewChild('scoreTrendCanvas') scoreTrendCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('categoryCanvas') categoryCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('difficultyCanvas') difficultyCanvas!: ElementRef<HTMLCanvasElement>;

  private scoreTrendChart?: Chart;
  private categoryChart?: Chart;
  private difficultyChart?: Chart;

  private viewReady = signal(false);
  private timers: ReturnType<typeof setTimeout>[] = [];

  constructor() {
    // Redraw whenever the analytics input changes (charts used to be drawn once and never updated)
    effect(() => {
      this.analytics();
      this.translate.language(); // Chart.js labels are baked in at render time: redraw on language switch
      if (!this.viewReady()) return;
      untracked(() => this.renderAll());
    });
  }

  ngAfterViewInit(): void {
    this.viewReady.set(true);
  }

  ngOnDestroy(): void {
    // Pending staggered renders must not create charts on a detached canvas after destroy
    this.timers.forEach(clearTimeout);
    this.timers = [];
    this.scoreTrendChart?.destroy();
    this.categoryChart?.destroy();
    this.difficultyChart?.destroy();
  }

  private renderAll(): void {
    this.timers.forEach(clearTimeout);
    // Render charts progressively
    this.renderScoreTrendChart();
    this.timers = [
      setTimeout(() => this.renderCategoryChart(), 100),
      setTimeout(() => this.renderDifficultyChart(), 200),
    ];
  }

  /** 'YYYY-MM-DD' as a LOCAL date (new Date(str) parses it as UTC midnight → previous day in UTC-x). */
  private parseLocalDate(value: string): Date {
    const [y, m, d] = value.split('-').map(Number);
    return new Date(y, (m || 1) - 1, d || 1);
  }

  private renderScoreTrendChart(): void {
    const data = this.analytics();
    this.scoreTrendChart?.destroy();
    this.scoreTrendChart = undefined;
    if (!data.scoreTrends.dates.length || !this.scoreTrendCanvas) return;

    const config: ChartConfiguration = {
      type: 'line',
      data: {
        labels: data.scoreTrends.dates,
        datasets: [
          {
            label: this.translate.t('dashboard.charts.accuracy_score'),
            data: data.scoreTrends.scores,
            borderColor: '#4F46E5',
            backgroundColor: 'rgba(79, 70, 229, 0.1)',
            tension: 0.4,
            fill: true
          },
          {
            label: this.translate.t('dashboard.charts.average'),
            data: Array(data.scoreTrends.dates.length).fill(data.scoreTrends.averageScore),
            borderColor: '#10B981',
            borderDash: [5, 5],
            borderWidth: 2,
            pointRadius: 0
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          tooltip: {
            callbacks: {
              title: (context) => {
                const date = this.parseLocalDate(context[0].label);
                return date.toLocaleDateString(dateLocale(this.translate), {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric'
                });
              },
              label: (context) => `${context.dataset.label}: ${context.parsed.y}%`
            }
          },
          legend: {
            display: true,
            position: 'top'
          }
        },
        scales: {
          y: {
            min: 0,
            max: 100,
            ticks: {
              callback: (value) => `${value}%`
            }
          },
          x: {
            ticks: {
              maxRotation: 45,
              minRotation: 45
            }
          }
        }
      }
    };

    try {
      this.scoreTrendChart = new Chart(this.scoreTrendCanvas.nativeElement, config);
    } catch (error) {
      console.error('Failed to initialize score trend chart:', error);
    }
  }

  private renderCategoryChart(): void {
    const data = this.analytics();
    this.categoryChart?.destroy();
    this.categoryChart = undefined;
    if (!data.categoryDistribution.length || !this.categoryCanvas) return;

    const config: ChartConfiguration = {
      type: 'bar',
      data: {
        labels: data.categoryDistribution.map((c) => categoryLabel(this.translate, c.category, c.categoryName)),
        datasets: [
          {
            label: this.translate.t('dashboard.exercises_completed'),
            data: data.categoryDistribution.map((c) => c.count),
            backgroundColor: '#4F46E5'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: 'y',
        onClick: (event, elements) => {
          if (elements.length > 0) {
            const index = elements[0].index;
            const category = data.categoryDistribution[index].category;
            this.router.navigate(['/exercises'], { queryParams: { category } });
          }
        },
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            callbacks: {
              label: (context) => tCount(this.translate, 'dashboard.n_exercises', context.parsed.x ?? 0)
            }
          }
        },
        scales: {
          x: {
            beginAtZero: true,
            ticks: {
              precision: 0
            }
          }
        }
      }
    };

    try {
      this.categoryChart = new Chart(this.categoryCanvas.nativeElement, config);
    } catch (error) {
      console.error('Failed to initialize category chart:', error);
    }
  }

  private renderDifficultyChart(): void {
    const data = this.analytics();
    this.difficultyChart?.destroy();
    this.difficultyChart = undefined;
    if (!data.difficultyBreakdown.length || !this.difficultyCanvas) return;

    const config: ChartConfiguration = {
      type: 'pie',
      data: {
        labels: data.difficultyBreakdown.map((d) => levelLabel(this.translate, d.level, d.levelName)),
        datasets: [
          {
            data: data.difficultyBreakdown.map((d) => d.count),
            backgroundColor: ['#10B981', '#F59E0B', '#EF4444']
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        onClick: (event, elements) => {
          if (elements.length > 0) {
            const index = elements[0].index;
            const difficulty = data.difficultyBreakdown[index].level;
            this.router.navigate(['/exercises'], { queryParams: { level: difficulty } });
          }
        },
        plugins: {
          legend: {
            position: 'bottom'
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                const label = context.label || '';
                const value = context.parsed;
                const percentage = data.difficultyBreakdown[context.dataIndex].percentage;
                return `${label}: ${value} (${percentage}%)`;
              }
            }
          }
        }
      }
    };

    try {
      this.difficultyChart = new Chart(this.difficultyCanvas.nativeElement, config);
    } catch (error) {
      console.error('Failed to initialize difficulty chart:', error);
    }
  }
}
