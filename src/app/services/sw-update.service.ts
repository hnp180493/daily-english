import { Injectable, inject, signal, NgZone } from '@angular/core';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { filter } from 'rxjs/operators';
import { interval } from 'rxjs';
import { ToastService } from './toast.service';

/**
 * Listens for new Service Worker versions and prompts the user to reload.
 * Also polls for updates every 30 minutes when the tab is active.
 */
@Injectable({ providedIn: 'root' })
export class SwUpdateService {
  private swUpdate = inject(SwUpdate);
  private toast = inject(ToastService);
  private zone = inject(NgZone);

  readonly updateAvailable = signal(false);

  start(): void {
    if (!this.swUpdate.isEnabled) {
      return;
    }

    // Subscribe to version-ready events
    this.swUpdate.versionUpdates
      .pipe(filter((evt): evt is VersionReadyEvent => evt.type === 'VERSION_READY'))
      .subscribe(() => {
        this.updateAvailable.set(true);
        this.toast.info(
          'Có bản cập nhật mới. Tải lại để áp dụng.',
          10000
        );
      });

    // Poll for updates every 30 minutes (only when tab is in foreground)
    this.zone.runOutsideAngular(() => {
      interval(30 * 60 * 1000).subscribe(() => {
        this.swUpdate.checkForUpdate().catch(err => {
          console.warn('[SwUpdate] Check failed:', err);
        });
      });
    });
  }

  async applyUpdate(): Promise<void> {
    if (!this.swUpdate.isEnabled) return;
    try {
      await this.swUpdate.activateUpdate();
      window.location.reload();
    } catch (err) {
      console.error('[SwUpdate] Failed to activate update:', err);
      window.location.reload();
    }
  }
}
