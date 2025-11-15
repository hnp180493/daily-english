import { CommonModule } from '@angular/common';
import { Component, ChangeDetectionStrategy, input, computed } from '@angular/core';
import { DictationFeedback } from '../../models/dictation.model';

@Component({
  selector: 'app-dictation-feedback',
  imports: [CommonModule],
  templateUrl: './dictation-feedback.html',
  styleUrl: './dictation-feedback.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DictationFeedbackComponent {
  feedback = input<DictationFeedback | null>(null);
  originalText = input<string>('');
  userText = input<string>('');
  showAnswer = input<boolean>(true);

  // Computed properties for display
  hasErrors = computed(() => {
    const fb = this.feedback();
    if (!fb) return false;
    
    return fb.mistakes.missingWords.length > 0 ||
           fb.mistakes.extraWords.length > 0 ||
           fb.mistakes.misspelledWords.length > 0;
  });

  accuracyLevel = computed(() => {
    const fb = this.feedback();
    if (!fb) return 'none';
    
    const avgAccuracy = (fb.characterAccuracy + fb.wordAccuracy) / 2;
    
    if (avgAccuracy >= 90) return 'excellent';
    if (avgAccuracy >= 75) return 'good';
    if (avgAccuracy >= 50) return 'fair';
    return 'poor';
  });

  accuracyColor = computed(() => {
    const level = this.accuracyLevel();
    const colors: { [key: string]: string } = {
      excellent: 'text-green-600 dark:text-green-400',
      good: 'text-blue-600 dark:text-blue-400',
      fair: 'text-yellow-600 dark:text-yellow-400',
      poor: 'text-red-600 dark:text-red-400',
      none: 'text-gray-600 dark:text-gray-400'
    };
    return colors[level] || colors['none'];
  });

  // Format text with differences highlighted
  formattedComparison = computed(() => {
    const fb = this.feedback();
    if (!fb || !fb.differences) return { original: this.originalText(), user: this.userText() };
    
    let originalHtml = '';
    let userHtml = '';
    
    fb.differences.forEach(diff => {
      switch (diff.type) {
        case 'match':
          originalHtml += `<span class="text-green-600 dark:text-green-400">${this.escapeHtml(diff.originalText)}</span> `;
          userHtml += `<span class="text-green-600 dark:text-green-400">${this.escapeHtml(diff.userText)}</span> `;
          break;
        case 'delete':
          originalHtml += `<span class="text-red-600 dark:text-red-400 font-semibold">${this.escapeHtml(diff.originalText)}</span> `;
          break;
        case 'insert':
          userHtml += `<span class="text-orange-600 dark:text-orange-400 font-semibold">${this.escapeHtml(diff.userText)}</span> `;
          break;
        case 'replace':
          originalHtml += `<span class="text-red-600 dark:text-red-400 font-semibold">${this.escapeHtml(diff.originalText)}</span> `;
          userHtml += `<span class="text-orange-600 dark:text-orange-400 font-semibold">${this.escapeHtml(diff.userText)}</span> `;
          break;
      }
    });
    
    return {
      original: originalHtml.trim(),
      user: userHtml.trim()
    };
  });

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}
