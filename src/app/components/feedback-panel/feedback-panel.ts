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

  typeLabels = computed(() => {
    const labels: { [key: string]: string } = {
      grammar: 'Grammar',
      vocabulary: 'Vocabulary',
      structure: 'Structure',
      spelling: 'Spelling',
      suggestion: 'Suggestions',
      meaning: 'Meaning',
      tense: 'Tense',
    };
    return labels;
  });

  typeIcons = computed(() => {
    const icons: { [key: string]: string } = {
      grammar: '📝',
      tense: '📝',
      vocabulary: '📚',
      meaning: '📚',
      structure: '🏗️',
      spelling: '✍️',
      suggestion: '💡'
    };
    return icons;
  });

  formattedFeedback = computed(() => {
    return this.feedback().map(item => ({
      ...item,
      formattedSuggestion: this.formatSuggestionText(item.suggestion),
      formattedExplanation: item.explanation ? this.formatExplanationText(item.explanation) : ''
    }));
  });

  groupedFeedback = computed(() => {
    type FormattedItem = ReturnType<typeof this.formattedFeedback>[number];
    const groups: { [key: string]: FormattedItem[] } = {};
    this.formattedFeedback().forEach(item => {
      if (!groups[item.type]) {
        groups[item.type] = [];
      }
      groups[item.type].push(item);
    });
    return groups;
  });

  feedbackTypes = computed(() => Object.keys(this.groupedFeedback()));

  private formatSuggestionText(text: string): string {
    let formatted = text;

    // Highlight words in single quotes with orange
    // Match quote after space/start, content, quote before space/punctuation/end
    // This avoids matching apostrophes inside words like "o'clock"
    formatted = formatted.replace(
      /(\s|^)'(.+?)'(\s|[.,!?]|$)/g,
      (_, before, content, after) => `${before}<span class="text-orange">${content}</span>${after}`
    );

    // Also handle double quotes
    formatted = formatted.replace(
      /(\s|^)"(.+?)"(\s|[.,!?]|$)/g,
      (_, before, content, after) => `${before}<span class="text-orange">${content}</span>${after}`
    );

    return formatted;
  }

  private formatExplanationText(explanation: string): string {
    // Highlight important words in orange/yellow
    let formatted = explanation;

    // Match single quotes wrapping phrases (including apostrophes inside like "child's")
    // Pattern: quote after space/start, then any content including apostrophes, then quote before space/punctuation/end
    // Use greedy match between word boundaries to capture full phrases
    formatted = formatted.replace(/(\s|^)'(.+?)'(\s|[.,!?]|$)/g, (_match, before, content, after) => {
      return `${before}<span class="text-orange">${content}</span>${after}`;
    });

    // Also handle double quotes
    formatted = formatted.replace(/(\s|^)"(.+?)"(\s|[.,!?]|$)/g, (_match, before, content, after) => {
      return `${before}<span class="text-orange">${content}</span>${after}`;
    });

    return formatted;
  }
}
