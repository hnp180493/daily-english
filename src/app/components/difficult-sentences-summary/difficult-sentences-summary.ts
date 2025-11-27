import { Component, input, computed, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SentenceProgress } from '../../services/exercise-state.service';

interface DifficultSentence {
  index: number;
  sentence: SentenceProgress;
  totalIssues: number;
}

@Component({
  selector: 'app-difficult-sentences-summary',
  imports: [CommonModule],
  templateUrl: './difficult-sentences-summary.html',
  styleUrl: './difficult-sentences-summary.scss'
})
export class DifficultSentencesSummary {
  sentences = input.required<SentenceProgress[]>();
  threshold = input<number>(2); // Show sentences with >= 2 total issues

  startQuickReview = output<void>();

  difficultSentences = computed(() => {
    const sents = this.sentences();
    
    return sents
      .map((sentence, index) => ({
        index,
        sentence,
        totalIssues: sentence.incorrectAttempts + sentence.retryCount
      }))
      .filter(item => item.sentence.incorrectAttempts >= 1 || item.sentence.retryCount >= 2)
      .sort((a, b) => b.totalIssues - a.totalIssues); // Sort by most difficult first
  });

  hasDifficultSentences = computed(() => this.difficultSentences().length > 0);
}
