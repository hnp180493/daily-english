import { Component, ChangeDetectionStrategy, input, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { VietnameseSeoService } from '../../services/vietnamese-seo.service';

export interface FAQItem {
  question: string;
  answer: string;
  isOpen?: boolean;
}

@Component({
  selector: 'app-vietnamese-faq',
  imports: [CommonModule],
  template: `
    <div class="vietnamese-faq">
      <h2 class="faq-title">{{ title() }}</h2>
      <div class="faq-list">
        @for (faq of faqs(); track $index) {
          <div class="faq-item" [class.open]="faq.isOpen">
            <button
              class="faq-question"
              (click)="toggleFAQ($index)"
              [attr.aria-expanded]="faq.isOpen"
            >
              <span>{{ faq.question }}</span>
              <svg
                class="faq-icon"
                [class.rotated]="faq.isOpen"
                width="20"
                height="20"
                viewBox="0 0 20 20"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M5 7.5L10 12.5L15 7.5"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
            </button>
            @if (faq.isOpen) {
              <div class="faq-answer">
                <p>{{ faq.answer }}</p>
              </div>
            }
          </div>
        }
      </div>
    </div>
  `,
  styles: `
    .vietnamese-faq {
      margin: 2rem 0;
    }

    .faq-title {
      font-size: 1.5rem;
      font-weight: 600;
      color: #1f2937;
      margin-bottom: 1.5rem;
    }

    .faq-list {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .faq-item {
      border: 1px solid #e5e7eb;
      border-radius: 0.5rem;
      overflow: hidden;
      transition: all 0.2s ease;
    }

    .faq-item.open {
      border-color: #4f46e5;
      box-shadow: 0 2px 8px rgba(79, 70, 229, 0.1);
    }

    .faq-question {
      width: 100%;
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1rem 1.25rem;
      background: white;
      border: none;
      cursor: pointer;
      font-size: 1rem;
      font-weight: 500;
      color: #1f2937;
      text-align: left;
      transition: background-color 0.2s ease;
    }

    .faq-question:hover {
      background-color: #f9fafb;
    }

    .faq-item.open .faq-question {
      color: #4f46e5;
    }

    .faq-icon {
      flex-shrink: 0;
      transition: transform 0.2s ease;
      color: #6b7280;
    }

    .faq-icon.rotated {
      transform: rotate(180deg);
      color: #4f46e5;
    }

    .faq-answer {
      padding: 0 1.25rem 1.25rem 1.25rem;
      background: #f9fafb;
      animation: slideDown 0.2s ease;
    }

    .faq-answer p {
      margin: 0;
      color: #4b5563;
      line-height: 1.6;
    }

    @keyframes slideDown {
      from {
        opacity: 0;
        transform: translateY(-10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    @media (max-width: 768px) {
      .faq-title {
        font-size: 1.25rem;
      }

      .faq-question {
        padding: 0.875rem 1rem;
        font-size: 0.9375rem;
      }

      .faq-answer {
        padding: 0 1rem 1rem 1rem;
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VietnameseFaqComponent implements OnInit {
  private vietnameseSeoService = inject(VietnameseSeoService);

  title = input<string>('Câu hỏi thường gặp');
  faqs = input.required<FAQItem[]>();
  injectSchema = input<boolean>(true);

  ngOnInit(): void {
    // Inject FAQ schema if enabled
    if (this.injectSchema()) {
      const faqData = this.faqs().map((faq) => ({
        question: faq.question,
        answer: faq.answer,
      }));

      const schema = this.vietnameseSeoService.generateVietnameseFAQSchema(faqData);
      this.vietnameseSeoService.setVietnameseStructuredData(schema, 'vietnamese-faq');
    }
  }

  toggleFAQ(index: number): void {
    const currentFaqs = this.faqs();
    const updatedFaqs = currentFaqs.map((faq, i) => ({
      ...faq,
      isOpen: i === index ? !faq.isOpen : faq.isOpen,
    }));

    // Note: Since faqs is an input signal, we can't directly update it
    // The parent component should handle the state
    // This is just for demonstration - in real use, emit an event
  }
}
