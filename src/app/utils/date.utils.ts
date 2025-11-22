/**
 * Date utility functions for handling local timezone dates
 */

/**
 * Get today's date in YYYY-MM-DD format using local timezone
 * This ensures daily challenges reset at midnight in user's local time
 */
export function getTodayLocalDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Convert a Date object to YYYY-MM-DD format using local timezone
 */
export function toLocalDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Get the start of the current week (Monday) in local timezone
 * Week runs from Monday to Sunday (ISO week)
 * Sunday is considered the last day of the week, not the first
 */
export function getWeekStartLocalDate(): string {
  const now = new Date();
  const day = now.getDay();
  // Calculate days to subtract to get to Monday
  // Sunday (0) -> subtract 6 days to get to Monday of CURRENT week
  // Monday (1) -> subtract 0 days
  // Tuesday (2) -> subtract 1 day
  // etc.
  const diff = day === 0 ? 6 : day - 1;
  const monday = new Date(now);
  monday.setDate(now.getDate() - diff);
  return toLocalDateString(monday);
}

/**
 * Check if two dates are the same day in local timezone
 */
export function isSameLocalDay(date1: Date, date2: Date): boolean {
  return toLocalDateString(date1) === toLocalDateString(date2);
}
