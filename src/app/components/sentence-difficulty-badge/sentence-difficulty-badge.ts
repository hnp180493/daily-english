import { Component, input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-sentence-difficulty-badge',
  imports: [CommonModule],
  template: `
    @if (showBadge()) {
      <div 
        class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
        [ngClass]="badgeClass()"
        [title]="tooltipText()">
        <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
        </svg>
        <span>{{ badgeText() }}</span>
      </div>
    }
  `,
  styles: [`
    :host {
      display: inline-block;
    }
  `]
})
export class SentenceDifficultyBadge {
  incorrectAttempts = input<number>(0);
  retryCount = input<number>(0);

  totalIssues = computed(() => this.incorrectAttempts() + this.retryCount());
  
  showBadge = computed(() => this.totalIssues() > 0);

  difficultyLevel = computed(() => {
    const total = this.totalIssues();
    if (total >= 5) return 'critical';
    if (total >= 3) return 'high';
    if (total >= 2) return 'medium';
    return 'low';
  });

  badgeClass = computed(() => {
    const level = this.difficultyLevel();
    const baseClasses = 'transition-all duration-200';
    
    switch (level) {
      case 'critical':
        return `${baseClasses} bg-red-100 text-red-800 border border-red-300`;
      case 'high':
        return `${baseClasses} bg-orange-100 text-orange-800 border border-orange-300`;
      case 'medium':
        return `${baseClasses} bg-yellow-100 text-yellow-800 border border-yellow-300`;
      default:
        return `${baseClasses} bg-blue-100 text-blue-800 border border-blue-300`;
    }
  });

  badgeText = computed(() => {
    const total = this.totalIssues();
    const incorrect = this.incorrectAttempts();
    const retries = this.retryCount();
    
    if (incorrect > 0 && retries > 0) {
      return `${incorrect} lỗi, ${retries} retry`;
    } else if (incorrect > 0) {
      return `${incorrect} lỗi`;
    } else {
      return `${retries} retry`;
    }
  });

  tooltipText = computed(() => {
    const level = this.difficultyLevel();
    const incorrect = this.incorrectAttempts();
    const retries = this.retryCount();
    
    let text = '';
    if (incorrect > 0) {
      text += `${incorrect} lần submit sai. `;
    }
    if (retries > 0) {
      text += `${retries} lần retry. `;
    }
    
    switch (level) {
      case 'critical':
        text += 'Câu này rất khó - nên luyện lại!';
        break;
      case 'high':
        text += 'Câu khó - cần chú ý!';
        break;
      case 'medium':
        text += 'Câu hơi khó - có thể cải thiện.';
        break;
      default:
        text += 'Câu cần luyện thêm.';
    }
    
    return text;
  });
}
