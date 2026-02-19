import { CommonModule } from '@angular/common';
import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy, inject, OnInit } from '@angular/core';
import { PointsAnimationService } from '../../../services/points-animation.service';
import { ProgressService } from '../../../services/progress.service';

@Component({
  selector: 'app-dictation-completion',
  imports: [CommonModule],
  templateUrl: './dictation-completion.html',
  styleUrl: './dictation-completion.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DictationCompletion implements OnInit {
  private pointsAnimationService = inject(PointsAnimationService);
  private progressService = inject(ProgressService);
  
  @Input() overallAccuracy!: number;
  @Input() completedCount!: number;
  @Input() totalSentences!: number;
  @Input() completionPoints!: number;

  @Output() retry = new EventEmitter<void>();
  @Output() goBack = new EventEmitter<void>();

  ngOnInit(): void {
    // Award points after completion screen is rendered
    setTimeout(() => {
      this.awardCompletionPoints();
    }, 100);
  }

  onRetry(): void {
    this.retry.emit();
  }

  onGoBack(): void {
    this.goBack.emit();
  }

  private awardCompletionPoints(): void {
    const sourceElement = document.querySelector('.points-earned-card') as HTMLElement
      || document.querySelector('.completion-stats') as HTMLElement
      || document.querySelector('.dictation-practice-container') as HTMLElement;
    
    if (!sourceElement) {
      console.warn('No source element found for points animation');
      this.progressService.addBonusPoints(this.completionPoints);
      return;
    }
    
    console.log('Triggering points animation from:', sourceElement.className);
    
    this.pointsAnimationService.triggerPointsAnimation(this.completionPoints, sourceElement).then(() => {
      this.progressService.addBonusPoints(this.completionPoints);
    });
  }
}
