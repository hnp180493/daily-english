import { Injectable } from '@angular/core';

/**
 * Service to manage user privacy preferences and PII filtering
 * Handles analytics opt-out and ensures no personally identifiable information is tracked
 */
@Injectable({
  providedIn: 'root'
})
export class PrivacyService {
  private readonly STORAGE_KEY_OPT_OUT = 'analytics_opt_out';
  
  // PII detection patterns
  private readonly piiPatterns = {
    email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
    phone: /\b(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g,
    creditCard: /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g,
    ssn: /\b\d{3}-\d{2}-\d{4}\b/g,
    ipAddress: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g,
    url: /https?:\/\/[^\s]+/g
  };

  /**
   * Check if analytics is enabled (user has not opted out)
   */
  isAnalyticsEnabled(): boolean {
    const optOut = localStorage.getItem(this.STORAGE_KEY_OPT_OUT);
    return optOut !== 'true';
  }

  /**
   * Enable analytics tracking
   */
  enableAnalytics(): void {
    localStorage.removeItem(this.STORAGE_KEY_OPT_OUT);
  }

  /**
   * Disable analytics tracking (opt-out)
   */
  disableAnalytics(): void {
    localStorage.setItem(this.STORAGE_KEY_OPT_OUT, 'true');
  }

  /**
   * Toggle analytics enabled state
   */
  toggleAnalytics(): boolean {
    if (this.isAnalyticsEnabled()) {
      this.disableAnalytics();
      return false;
    } else {
      this.enableAnalytics();
      return true;
    }
  }

  /**
   * Filter PII from a string value
   */
  filterPii(value: string): string {
    if (typeof value !== 'string') return value;

    let filtered = value;
    
    // Replace email addresses
    filtered = filtered.replace(this.piiPatterns.email, '[EMAIL_REDACTED]');
    
    // Replace phone numbers
    filtered = filtered.replace(this.piiPatterns.phone, '[PHONE_REDACTED]');
    
    // Replace credit card numbers
    filtered = filtered.replace(this.piiPatterns.creditCard, '[CC_REDACTED]');
    
    // Replace SSN
    filtered = filtered.replace(this.piiPatterns.ssn, '[SSN_REDACTED]');
    
    // Replace IP addresses
    filtered = filtered.replace(this.piiPatterns.ipAddress, '[IP_REDACTED]');

    return filtered;
  }

  /**
   * Filter PII from event parameters
   */
  filterEventParams(params: Record<string, any>): Record<string, any> {
    if (!params) return params;

    const filtered: Record<string, any> = {};

    for (const [key, value] of Object.entries(params)) {
      if (typeof value === 'string') {
        filtered[key] = this.filterPii(value);
      } else if (typeof value === 'object' && value !== null) {
        filtered[key] = this.filterEventParams(value);
      } else {
        filtered[key] = value;
      }
    }

    return filtered;
  }

  /**
   * Check if a string contains PII
   */
  containsPii(value: string): boolean {
    if (typeof value !== 'string') return false;

    return (
      this.piiPatterns.email.test(value) ||
      this.piiPatterns.phone.test(value) ||
      this.piiPatterns.creditCard.test(value) ||
      this.piiPatterns.ssn.test(value)
    );
  }

  /**
   * Validate event parameters for PII
   */
  validateEventParams(params: Record<string, any>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!params) {
      return { valid: true, errors };
    }

    for (const [key, value] of Object.entries(params)) {
      if (typeof value === 'string' && this.containsPii(value)) {
        errors.push(`Parameter "${key}" contains PII`);
      } else if (typeof value === 'object' && value !== null) {
        const nestedValidation = this.validateEventParams(value);
        if (!nestedValidation.valid) {
          errors.push(...nestedValidation.errors.map(e => `${key}.${e}`));
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}
