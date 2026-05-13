import { Component, ChangeDetectionStrategy, output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslationService } from '../../services/translation.service';

@Component({
  selector: 'app-registration-limit-modal',
  imports: [CommonModule],
  templateUrl: './registration-limit-modal.html',
  styleUrl: './registration-limit-modal.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RegistrationLimitModal {
  protected translate = inject(TranslationService);
  close = output<void>();

  onClose(): void {
    this.close.emit();
  }
}
