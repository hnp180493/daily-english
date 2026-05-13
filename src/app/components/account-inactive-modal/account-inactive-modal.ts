import { Component, EventEmitter, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslationService } from '../../services/translation.service';

@Component({
  selector: 'app-account-inactive-modal',
  imports: [CommonModule],
  templateUrl: './account-inactive-modal.html',
  styleUrl: './account-inactive-modal.scss'
})
export class AccountInactiveModal {
  protected translate = inject(TranslationService);
  @Output() close = new EventEmitter<void>();

  onClose(): void {
    this.close.emit();
  }
}
