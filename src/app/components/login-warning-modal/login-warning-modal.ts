import { Component, ChangeDetectionStrategy, output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-login-warning-modal',
  imports: [CommonModule],
  templateUrl: './login-warning-modal.html',
  styleUrl: './login-warning-modal.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LoginWarningModal {
  confirm = output<void>();
  cancel = output<void>();

  onConfirm(): void {
    this.confirm.emit();
  }

  onCancel(): void {
    this.cancel.emit();
  }
}
