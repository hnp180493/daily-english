import { Component, ChangeDetectionStrategy, output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-api-key-prompt',
  imports: [CommonModule],
  templateUrl: './api-key-prompt.html',
  styleUrl: './api-key-prompt.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ApiKeyPromptComponent {
  close = output<void>();
  goToSettings = output<void>();

  onClose(): void {
    this.close.emit();
  }

  onGoToSettings(): void {
    this.goToSettings.emit();
  }
}
