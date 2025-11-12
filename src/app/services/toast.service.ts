import { Injectable, signal } from '@angular/core';

export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
  action?: {
    label: string;
    callback: () => void;
  };
}

@Injectable({
  providedIn: 'root'
})
export class ToastService {
  private toasts = signal<Toast[]>([]);
  private idCounter = 0;

  getToasts() {
    return this.toasts.asReadonly();
  }

  show(message: string, type: Toast['type'] = 'info', duration: number = 5000, action?: Toast['action']): string {
    const id = `toast-${++this.idCounter}`;
    const toast: Toast = { id, message, type, duration, action };

    this.toasts.update(toasts => [...toasts, toast]);

    if (duration > 0) {
      setTimeout(() => this.dismiss(id), duration);
    }

    return id;
  }

  success(message: string, duration?: number): string {
    return this.show(message, 'success', duration);
  }

  error(message: string, duration?: number): string {
    return this.show(message, 'error', duration);
  }

  warning(message: string, duration?: number): string {
    return this.show(message, 'warning', duration);
  }

  info(message: string, duration?: number): string {
    return this.show(message, 'info', duration);
  }

  dismiss(id: string): void {
    this.toasts.update(toasts => toasts.filter(t => t.id !== id));
  }

  clear(): void {
    this.toasts.set([]);
  }
}
