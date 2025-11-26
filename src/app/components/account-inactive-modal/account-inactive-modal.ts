import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-account-inactive-modal',
  imports: [CommonModule],
  templateUrl: './account-inactive-modal.html',
  styleUrl: './account-inactive-modal.scss'
})
export class AccountInactiveModal {
  @Output() close = new EventEmitter<void>();

  onClose(): void {
    this.close.emit();
  }
}
