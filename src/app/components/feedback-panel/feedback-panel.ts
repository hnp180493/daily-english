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
    // Highlight words in green (correct) and red (incorrect) without strikethrough
    // Pattern: word(incorrect) -> <span class="correct">word</span><span class="incorrect">incorrect</span>
    return text.replace(/(\w+)\s*\(([^)]+)\)/g, '<span class="text-green">$1</span> <span class="text-red">($2)</span>');
  }

  private formatExplanationText(explanation: string): string {
    // Highlight important words in orange/yellow
    let formatted = explanation;

    // First, highlight words in quotes (keep the quotes)
    formatted = formatted.replace(/(['"])([^'"]+)\1/g, '<span class="text-orange">$1$2$1</span>');

    return formatted;
  }
}
