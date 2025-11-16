import { Component, ChangeDetectionStrategy, output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-registration-limit-modal',
  imports: [CommonModule],
  templateUrl: './registration-limit-modal.html',
  styleUrl: './registration-limit-modal.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RegistrationLimitModal {
  close = output<void>();

  onClose(): void {
    this.close.emit();
  }
}
