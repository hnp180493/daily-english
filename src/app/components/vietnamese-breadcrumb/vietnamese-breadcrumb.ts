import { Component, ChangeDetectionStrategy, input, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { VietnameseSeoService } from '../../services/vietnamese-seo.service';

export interface BreadcrumbItem {
  name: string;
  url: string;
  isActive?: boolean;
}

@Component({
  selector: 'app-vietnamese-breadcrumb',
  imports: [CommonModule, RouterModule],
  template: `
    <nav class="vietnamese-breadcrumb" aria-label="Breadcrumb">
      <ol class="breadcrumb-list">
        @for (item of items(); track $index; let isLast = $last) {
          <li class="breadcrumb-item" [class.active]="isLast || item.isActive">
            @if (isLast || item.isActive) {
              <span class="breadcrumb-current" aria-current="page">
                {{ item.name }}
              </span>
            } @else {
              <a [routerLink]="item.url" class="breadcrumb-link">
                {{ item.name }}
              </a>
            }
            @if (!isLast) {
              <svg
                class="breadcrumb-separator"
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M6 12L10 8L6 4"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
            }
          </li>
        }
      </ol>
    </nav>
  `,
  styles: `
    .vietnamese-breadcrumb {
      margin: 1rem 0;
      padding: 0.75rem 0;
    }

    .breadcrumb-list {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.5rem;
      list-style: none;
      margin: 0;
      padding: 0;
    }

    .breadcrumb-item {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.875rem;
    }

    .breadcrumb-link {
      color: #4f46e5;
      text-decoration: none;
      transition: color 0.2s ease;
    }

    .breadcrumb-link:hover {
      color: #4338ca;
      text-decoration: underline;
    }

    .breadcrumb-current {
      color: #6b7280;
      font-weight: 500;
    }

    .breadcrumb-item.active .breadcrumb-current {
      color: #1f2937;
    }

    .breadcrumb-separator {
      color: #9ca3af;
      flex-shrink: 0;
    }

    @media (max-width: 768px) {
      .vietnamese-breadcrumb {
        margin: 0.75rem 0;
        padding: 0.5rem 0;
      }

      .breadcrumb-item {
        font-size: 0.8125rem;
      }

      .breadcrumb-separator {
        width: 14px;
        height: 14px;
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VietnameseBreadcrumbComponent implements OnInit {
  private vietnameseSeoService = inject(VietnameseSeoService);

  items = input.required<BreadcrumbItem[]>();
  injectSchema = input<boolean>(true);
  baseUrl = input<string>('https://dailyenglish.qzz.io');

  ngOnInit(): void {
    // Inject breadcrumb schema if enabled
    if (this.injectSchema()) {
      const breadcrumbData = this.items().map((item) => ({
        name: item.name,
        url: item.url.startsWith('http') ? item.url : `${this.baseUrl()}${item.url}`,
      }));

      const schema = this.vietnameseSeoService.generateVietnameseBreadcrumbSchema(breadcrumbData);
      this.vietnameseSeoService.setVietnameseStructuredData(schema, 'vietnamese-breadcrumb');
    }
  }
}
