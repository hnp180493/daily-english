import { Injectable, inject } from '@angular/core';
import { Achievement } from '../models/achievement.model';
import { ToastService } from './toast.service';
import { TranslationService } from './translation.service';

const RARITY_COLORS: Record<string, string> = {
  common: '#94A3B8',
  rare: '#60A5FA',
  epic: '#A78BFA',
  legendary: '#FBBF24',
};

/**
 * Renders an unlocked achievement as a 1080x1080 PNG (html2canvas, lazy-loaded)
 * and shares it via the Web Share API when files are supported, otherwise
 * downloads it so the user can post it to Facebook/Zalo manually.
 */
@Injectable({ providedIn: 'root' })
export class AchievementShareService {
  private toast = inject(ToastService);
  private translate = inject(TranslationService);

  async share(achievement: Achievement): Promise<void> {
    this.toast.info(this.translate.t('share.generating'), 1500);
    let blob: Blob;
    try {
      blob = await this.renderCard(achievement);
    } catch (err) {
      console.error('[AchievementShare] Render failed:', err);
      this.toast.error(this.translate.t('share.failed'));
      return;
    }

    const text = this.translate.t('share.text').replace('{name}', achievement.name);
    const file = new File([blob], `achievement-${achievement.id}.png`, { type: 'image/png' });
    const shareData: ShareData = { files: [file], text, url: `${window.location.origin}/achievements` };

    if (navigator.canShare?.(shareData)) {
      try {
        await navigator.share(shareData);
        return;
      } catch (err) {
        // User cancelled: nothing else to do.
        if ((err as DOMException)?.name === 'AbortError') return;
      }
    }

    this.download(blob, file.name);
    this.toast.success(this.translate.t('share.downloaded'));
  }

  private async renderCard(achievement: Achievement): Promise<Blob> {
    const { default: html2canvas } = await import('html2canvas');
    const color = RARITY_COLORS[achievement.rarity] ?? RARITY_COLORS['epic'];

    const card = document.createElement('div');
    card.style.cssText = [
      'position:fixed', 'left:-10000px', 'top:0', 'width:540px', 'height:540px',
      'display:flex', 'flex-direction:column', 'align-items:center', 'justify-content:center',
      'gap:20px', 'padding:40px', 'box-sizing:border-box', 'font-family:Inter,system-ui,sans-serif',
      'color:#E2E8F0', 'text-align:center',
      `background:radial-gradient(circle at 50% 30%, ${color}55, #0A0E27 70%)`,
    ].join(';');

    const icon = document.createElement('img');
    icon.src = achievement.iconUrl;
    icon.crossOrigin = 'anonymous';
    icon.style.cssText = `width:160px;height:160px;object-fit:contain;filter:drop-shadow(0 0 24px ${color})`;

    const rarity = document.createElement('div');
    rarity.textContent = achievement.rarity.toUpperCase();
    rarity.style.cssText = `font-size:14px;letter-spacing:4px;font-weight:700;color:${color}`;

    const name = document.createElement('div');
    name.textContent = achievement.name;
    name.style.cssText = 'font-size:34px;font-weight:800;line-height:1.2';

    const desc = document.createElement('div');
    desc.textContent = achievement.description;
    desc.style.cssText = 'font-size:16px;color:#94A3B8;max-width:420px';

    const footer = document.createElement('div');
    footer.textContent = this.translate.t('share.card_footer');
    footer.style.cssText = 'margin-top:12px;font-size:13px;color:#A78BFA';

    card.append(icon, rarity, name, desc, footer);
    document.body.appendChild(card);
    try {
      await icon.decode().catch(() => undefined); // render even if the icon fails
      const canvas = await html2canvas(card, { backgroundColor: '#0A0E27', scale: 2, useCORS: true, logging: false });
      return await new Promise<Blob>((resolve, reject) =>
        canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob returned null'))), 'image/png')
      );
    } finally {
      card.remove();
    }
  }

  private download(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}
