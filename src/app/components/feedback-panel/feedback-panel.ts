import { CommonModule } from '@angular/common';
import { Component, ChangeDetectionStrategy, input, computed } from '@angular/core';
import { FeedbackItem } from '../../models/exercise.model';

@Component({
  selector: 'app-feedback-panel',
  imports: [CommonModule],
  templateUrl: './feedback-panel.html',
  styleUrl: './feedback-panel.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FeedbackPanelComponent {
  feedback = input<FeedbackItem[]>([]);
  accuracyScore = input<number>(0);
  userInput = input<string>('');

  groupedFeedback = computed(() => {
    const groups: { [key: string]: FeedbackItem[] } = {};
    this.feedback().forEach(item => {
      if (!groups[item.type]) {
        groups[item.type] = [];
      }
      groups[item.type].push(item);
    });
    return groups;
  });

  feedbackTypes = computed(() => Object.keys(this.groupedFeedback()));

  getTypeLabel(type: string): string {
    const labels: { [key: string]: string } = {
      grammar: 'Grammar',
      vocabulary: 'Vocabulary',
      structure: 'Structure',
      spelling: 'Spelling',
      suggestion: 'Suggestions'
    };
    return labels[type] || type;
  }

  getTypeIcon(type: string): string {
    const icons: { [key: string]: string } = {
      grammar: '📝',
      vocabulary: '📚',
      structure: '🏗️',
      spelling: '✍️',
      suggestion: '💡'
    };
    return icons[type] || '📌';
  }

  formatSuggestion(item: FeedbackItem): string {
    let text = item.suggestion;

    // Highlight words in green (correct) and red (incorrect) without strikethrough
    // Pattern: word(incorrect) -> <span class="correct">word</span><span class="incorrect">incorrect</span>
    text = text.replace(/(\w+)\s*\(([^)]+)\)/g, '<span class="text-green">$1</span> <span class="text-red">($2)</span>');

    return text;
  }

  formatExplanation(explanation: string): string {
    // Highlight important words in orange/yellow
    let formatted = explanation;

    // Highlight words in quotes or important terms
    formatted = formatted.replace(/['"]([^'"]+)['"]/g, '<span class="text-orange">$1</span>');
    // Use negative lookahead/lookbehind to avoid breaking contractions
    // Match whole words including contractions (e.g., It's, you've, isn't)
    formatted = formatted.replace(/(?<!\w)(It's|it's|you've|youve|isn't|isnt|wasn't|wasnt|It\s+is|it\s+is|brewed|brew|coffee|ate|a\s+toast|a\s+cup\s+of)(?!\w)/gi, '<span class="text-orange">$1</span>');

    return formatted;
  }
}
