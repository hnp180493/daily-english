import { Injectable } from '@angular/core';

export type FontSize = 'small' | 'medium' | 'large' | 'xlarge';
export type FontFamily = 'default' | 'dyslexic';

const FONT_SIZE_CLASSES: FontSize[] = ['small', 'medium', 'large', 'xlarge'];

@Injectable({ providedIn: 'root' })
export class FontSizeService {
  applyFontSize(size: FontSize): void {
    if (typeof document === 'undefined') return;
    const html = document.documentElement;
    FONT_SIZE_CLASSES.forEach(s => html.classList.remove(`font-size-${s}`));
    html.classList.add(`font-size-${size}`);
  }

  applyFontFamily(family: FontFamily): void {
    if (typeof document === 'undefined') return;
    const html = document.documentElement;
    html.classList.toggle('font-family-dyslexic', family === 'dyslexic');
  }
}
