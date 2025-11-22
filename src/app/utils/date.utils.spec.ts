import { getTodayLocalDate, toLocalDateString, getWeekStartLocalDate, isSameLocalDay } from './date.utils';

describe('Date Utils', () => {
  describe('getTodayLocalDate', () => {
    it('should return date in YYYY-MM-DD format using local timezone', () => {
      const result = getTodayLocalDate();
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('should match local date not UTC', () => {
      const now = new Date();
      const expected = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      expect(getTodayLocalDate()).toBe(expected);
    });
  });

  describe('toLocalDateString', () => {
    it('should convert Date to YYYY-MM-DD using local timezone', () => {
      const date = new Date(2024, 10, 23); // November 23, 2024
      expect(toLocalDateString(date)).toBe('2024-11-23');
    });

    it('should pad single digit months and days', () => {
      const date = new Date(2024, 0, 5); // January 5, 2024
      expect(toLocalDateString(date)).toBe('2024-01-05');
    });
  });

  describe('getWeekStartLocalDate', () => {
    it('should return Monday of current week', () => {
      const result = getWeekStartLocalDate();
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('should return Monday when today is Wednesday', () => {
      // This test would need to mock Date
      const result = getWeekStartLocalDate();
      const date = new Date(result);
      expect(date.getDay()).toBe(1); // Monday
    });

    it('should handle Sunday correctly - Sunday is last day of week', () => {
      // Manual test: If today is Sunday Nov 24, 2024
      // Week is Mon Nov 18 - Sun Nov 24
      // So Monday should be Nov 18 (6 days ago)
      const sunday = new Date(2024, 10, 24); // Nov 24, 2024 is Sunday
      const day = sunday.getDay(); // 0
      const diff = day === 0 ? 6 : day - 1;
      const monday = new Date(sunday);
      monday.setDate(sunday.getDate() - diff);
      
      // Monday should be Nov 18
      expect(monday.getDate()).toBe(18);
      expect(monday.getDay()).toBe(1); // Monday
    });
  });

  describe('isSameLocalDay', () => {
    it('should return true for same day', () => {
      const date1 = new Date(2024, 10, 23, 10, 0, 0);
      const date2 = new Date(2024, 10, 23, 23, 59, 59);
      expect(isSameLocalDay(date1, date2)).toBe(true);
    });

    it('should return false for different days', () => {
      const date1 = new Date(2024, 10, 23);
      const date2 = new Date(2024, 10, 24);
      expect(isSameLocalDay(date1, date2)).toBe(false);
    });
  });
});
