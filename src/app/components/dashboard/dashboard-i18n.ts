import { Locale } from 'date-fns';
import { vi } from 'date-fns/locale';
import { TranslationService } from '../../services/translation.service';
import { CATEGORY_KEYS } from '../exercise-card/exercise-card';

/**
 * Display-only helpers shared by the dashboard widgets. They never change data,
 * they only turn stable identifiers / numbers into localized text.
 */

/** BCP 47 locale for Intl date formatting, following the UI language. */
export function dateLocale(t: TranslationService): string {
  return t.language() === 'vi' ? 'vi-VN' : 'en-US';
}

/** date-fns locale object (undefined → date-fns default English). */
export function dateFnsLocale(t: TranslationService): Locale | undefined {
  return t.language() === 'vi' ? vi : undefined;
}

/** t(key) with `{name}` placeholders replaced. */
export function tf(t: TranslationService, key: string, params: Record<string, string | number> = {}): string {
  let text = t.t(key);
  for (const [name, value] of Object.entries(params)) {
    text = text.replace(`{${name}}`, '' + value);
  }
  return text;
}

/** t(key), or `fallback` when the key is not in the dictionary. */
export function tOr(t: TranslationService, key: string, fallback: string): string {
  const text = t.t(key);
  return text === key ? fallback : text;
}

/** Picks `<key>_one` for exactly 1, `<key>` otherwise, and fills `{n}`. */
export function tCount(t: TranslationService, key: string, n: number, params: Record<string, string | number> = {}): string {
  return tf(t, n === 1 ? `${key}_one` : key, { n, ...params });
}

/** Localized category name from the category value (e.g. 'daily-life'). */
export function categoryLabel(t: TranslationService, category: string, fallback: string): string {
  const key = CATEGORY_KEYS[category];
  return key ? tOr(t, `category.${key}.name`, fallback) : fallback;
}

/** Localized difficulty name from the level value (e.g. 'beginner'). */
export function levelLabel(t: TranslationService, level: string, fallback: string): string {
  return tOr(t, `level.${level}.name`, fallback);
}

/** Unit strings: '{n}s' / '{n} giây' etc. */
export function unitSec(t: TranslationService, n: number): string {
  return tf(t, 'dashboard.unit.s', { n });
}
export function unitMin(t: TranslationService, n: number): string {
  return tf(t, 'dashboard.unit.m', { n });
}
export function unitHour(t: TranslationService, n: number): string {
  return tf(t, 'dashboard.unit.h', { n });
}
