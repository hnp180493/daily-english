import { Component, ChangeDetectionStrategy, input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-loading-spinner',
  imports: [CommonModule],
  template: `
    <div class="loading-container" [class.fullscreen]="fullscreen()">
      <div class="spinner-wrapper">
        <div class="spinner" [class.small]="size() === 'small'" [class.large]="size() === 'large'"></div>
        @if (message()) {
          <p class="loading-message">{{ message() }}</p>
        }
      </div>
    </div>
  `,
  styles: [`
    .loading-container {
      display: flex;
      justify-content: center;
      align-items: center;
      padding: 2rem;
      min-height: 200px;
    }

    .loading-container.fullscreen {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(17, 24, 39, 0.95);
      z-index: 9999;
      min-height: 100vh;
    }

    .spinner-wrapper {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1rem;
    }

    .spinner {
      width: 48px;
      height: 48px;
      border: 4px solid #374151;
      border-top-color: #8B5CF6;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    .spinner.small {
      width: 24px;
      height: 24px;
      border-width: 3px;
    }

    .spinner.large {
      width: 64px;
      height: 64px;
      border-width: 5px;
    }

    .loading-message {
      color: #9CA3AF;
      font-size: 0.875rem;
      margin: 0;
      text-align: center;
    }

    @keyframes spin {
      to {
        transform: rotate(360deg);
      }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LoadingSpinnerComponent {
  size = input<'small' | 'medium' | 'large'>('medium');
  message = input<string>('');
  fullscreen = input<boolean>(false);
}
