import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-dashboard-skeleton',
  imports: [CommonModule],
  template: `
    <div class="dashboard-skeleton">
      <!-- Header Skeleton -->
      <div class="skeleton-header">
        <div class="skeleton-title"></div>

      </div>

      <!-- Stats Cards Skeleton -->
      <div class="skeleton-stats-grid">
        <div class="skeleton-card">
          <div class="skeleton-card-title"></div>
          <div class="skeleton-card-value"></div>
          <div class="skeleton-card-subtitle"></div>
        </div>
        <div class="skeleton-card">
          <div class="skeleton-card-title"></div>
          <div class="skeleton-card-value"></div>
          <div class="skeleton-card-subtitle"></div>
        </div>
        <div class="skeleton-card">
          <div class="skeleton-card-title"></div>
          <div class="skeleton-card-value"></div>
          <div class="skeleton-card-subtitle"></div>
        </div>
        <div class="skeleton-card">
          <div class="skeleton-card-title"></div>
          <div class="skeleton-card-value"></div>
          <div class="skeleton-card-subtitle"></div>
        </div>
      </div>

      <!-- Charts Grid Skeleton -->
      <div class="skeleton-charts-grid">
        <div class="skeleton-chart-card">
          <div class="skeleton-card-title"></div>
          <div class="skeleton-chart"></div>
        </div>
        <div class="skeleton-chart-card">
          <div class="skeleton-card-title"></div>
          <div class="skeleton-chart"></div>
        </div>
      </div>

      <!-- Large Chart Skeleton -->
      <div class="skeleton-large-chart">
        <div class="skeleton-card-title"></div>
        <div class="skeleton-chart-large"></div>
      </div>
    </div>
  `,
  styles: [`
    .dashboard-skeleton {
      padding: 2rem;
      max-width: 1400px;
      margin: 0 auto;
    }

    .skeleton-header {
      margin-bottom: 2rem;
    }

    .skeleton-title {
      height: 2rem;
      width: 200px;
      background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
      background-size: 200% 100%;
      animation: shimmer 1.5s infinite;
      border-radius: 0.5rem;
      margin-bottom: 1rem;
    }

    .skeleton-tabs {
      display: flex;
      gap: 1rem;
    }

    .skeleton-tab {
      height: 2.5rem;
      width: 120px;
      background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
      background-size: 200% 100%;
      animation: shimmer 1.5s infinite;
      border-radius: 0.5rem;
    }

    .skeleton-stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 1.5rem;
      margin-bottom: 2rem;
    }

    .skeleton-card {
      background: white;
      border-radius: 0.75rem;
      padding: 1.5rem;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }

    .skeleton-card-title {
      height: 1rem;
      width: 60%;
      background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
      background-size: 200% 100%;
      animation: shimmer 1.5s infinite;
      border-radius: 0.25rem;
      margin-bottom: 1rem;
    }

    .skeleton-card-value {
      height: 2.5rem;
      width: 80%;
      background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
      background-size: 200% 100%;
      animation: shimmer 1.5s infinite;
      border-radius: 0.5rem;
      margin-bottom: 0.5rem;
    }

    .skeleton-card-subtitle {
      height: 0.875rem;
      width: 50%;
      background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
      background-size: 200% 100%;
      animation: shimmer 1.5s infinite;
      border-radius: 0.25rem;
    }

    .skeleton-charts-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
      gap: 1.5rem;
      margin-bottom: 2rem;
    }

    .skeleton-chart-card {
      background: white;
      border-radius: 0.75rem;
      padding: 1.5rem;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }

    .skeleton-chart {
      height: 250px;
      background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
      background-size: 200% 100%;
      animation: shimmer 1.5s infinite;
      border-radius: 0.5rem;
      margin-top: 1rem;
    }

    .skeleton-large-chart {
      background: white;
      border-radius: 0.75rem;
      padding: 1.5rem;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }

    .skeleton-chart-large {
      height: 350px;
      background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
      background-size: 200% 100%;
      animation: shimmer 1.5s infinite;
      border-radius: 0.5rem;
      margin-top: 1rem;
    }

    @keyframes shimmer {
      0% {
        background-position: -200% 0;
      }
      100% {
        background-position: 200% 0;
      }
    }

    @media (max-width: 768px) {
      .dashboard-skeleton {
        padding: 1rem;
      }

      .skeleton-stats-grid {
        grid-template-columns: 1fr;
      }

      .skeleton-charts-grid {
        grid-template-columns: 1fr;
      }
    }

    /* Dark mode support */
    @media (prefers-color-scheme: dark) {
      .skeleton-card,
      .skeleton-chart-card,
      .skeleton-large-chart {
        background: #1f2937;
      }

      .skeleton-title,
      .skeleton-tab,
      .skeleton-card-title,
      .skeleton-card-value,
      .skeleton-card-subtitle,
      .skeleton-chart,
      .skeleton-chart-large {
        background: linear-gradient(90deg, #374151 25%, #4b5563 50%, #374151 75%);
        background-size: 200% 100%;
      }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DashboardSkeletonComponent {}
