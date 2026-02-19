import { CommonModule } from '@angular/common';
import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-dictation-actions',
  imports: [CommonModule],
  templateUrl: './dictation-actions.html',
  styleUrl: './dictation-actions.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DictationActions {
  @Input() showFeedback!: boolean;
  @Input() currentAccuracy!: number;
  @Input() userInput!: string;
  @Input() passingScore!: number;
  @Input() canGoNext!: boolean;
  @Input() autoNextOnPerfect!: boolean;
  @Input() isSubmitting!: boolean;

  @Output() submit = new EventEmitter<void>();
  @Output() replay = new EventEmitter<void>();
  @Output() retry = new EventEmitter<void>();
  @Output() skip = new EventEmitter<void>();
  @Output() next = new EventEmitter<void>();
  @Output() complete = new EventEmitter<void>();

  onSubmit(): void {
    this.submit.emit();
  }

  onReplay(): void {
    this.replay.emit();
  }

  onRetry(): void {
    this.retry.emit();
  }

  onSkip(): void {
    this.skip.emit();
  }

  onRetryAnswer(): void {
    // Clear feedback and input to start fresh
    this.retry.emit();
  }

  onNext(): void {
    this.next.emit();
  }

  onComplete(): void {
    this.complete.emit();
  }
}
