import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SentenceProgress } from '../../services/exercise-state.service';

@Component({
  selector: 'app-translation-review',
  imports: [CommonModule],
  templateUrl: './translation-review.html',
  styleUrl: './translation-review.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TranslationReview {
  sentences = input.required<SentenceProgress[]>();
  currentSentenceIndex = input<number>(0);
  currentTTSSentenceIndex = input<number | null>(-1);
  isExerciseComplete = input<boolean>(false);

  practiceAgain = output<void>();
  quit = output<void>();
  playSentence = output<number>();
}
