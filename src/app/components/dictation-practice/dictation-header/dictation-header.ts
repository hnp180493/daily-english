import { CommonModule } from '@angular/common';
import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { Exercise } from '../../../models/exercise.model';

@Component({
  selector: 'app-dictation-header',
  imports: [CommonModule],
  templateUrl: './dictation-header.html',
  styleUrl: './dictation-header.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DictationHeader {
  @Input() exercise: Exercise | null = null;
  @Input() progressPercentage!: number;
  @Input() currentSentenceIndex!: number;
  @Input() totalSentences!: number;
  @Input() attemptCount!: number;
  @Input() completionPoints!: number;

  @Output() settingsClick = new EventEmitter<void>();
  @Output() goBack = new EventEmitter<void>();

  onSettingsClick(): void {
    this.settingsClick.emit();
  }

  onGoBack(): void {
    this.goBack.emit();
  }
}
