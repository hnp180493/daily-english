import { Component, ChangeDetectionStrategy, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PENALTY_CONSTANTS } from '../../models/penalty.constants';

export interface PenaltyMetrics {
  baseScore: number;
  totalIncorrectAttempts: number;
  totalRetries: number;
  totalPenalty: number;
  finalScore: number;
}

export interface CurrentPenaltyMetrics {
  currentAverage: number;
  totalIncorrectAttempts: number;
  totalRetries: number;
  totalPenalty: number;
  currentScore: number;
}

@Component({
  selector: 'app-penalty-score',
  imports: [CommonModule],
  templateUrl: './penalty-score.html',
  styleUrl: './penalty-score.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PenaltyScore {
  // Review mode metrics
  penaltyMetrics = input<PenaltyMetrics | null>(null);
  
  // Current exercise metrics
  currentMetrics = input<CurrentPenaltyMetrics | null>(null);
  
  // Display mode
  isReviewMode = input<boolean>(false);
  
  // Exercise completion status
  isExerciseComplete = input<boolean>(false);
  
  // Expose penalty constants to template
  readonly INCORRECT_PENALTY = PENALTY_CONSTANTS.INCORRECT_ATTEMPT_PENALTY;
  readonly RETRY_PENALTY = PENALTY_CONSTANTS.RETRY_PENALTY;
}
