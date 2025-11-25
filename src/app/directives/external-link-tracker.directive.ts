import { Directive, HostListener, ElementRef, inject } from '@angular/core';
import { AnalyticsService } from '../services/analytics.service';

/**
 * Directive to track external link clicks
 * Automatically tracks when users click on links pointing to external domains
 */
@Directive({
  selector: 'a[href]',
  standalone: true
})
export class ExternalLinkTrackerDirective {
  private analytics = inject(AnalyticsService);
  private elementRef = inject(ElementRef);

  @HostListener('click', ['$event'])
  onClick(event: MouseEvent): void {
    const anchor = this.elementRef.nativeElement as HTMLAnchorElement;
    const href = anchor.href;
    
    if (!href) return;

    // Check if link is external
    const isExternal = this.isExternalLink(href);
    
    if (isExternal) {
      const linkText = anchor.textContent?.trim() || anchor.title || 'No text';
      this.analytics.trackExternalLinkClick(href, linkText);
    }
  }

  private isExternalLink(href: string): boolean {
    try {
      const url = new URL(href);
      const currentHost = window.location.hostname;
      return url.hostname !== currentHost;
    } catch {
      return false;
    }
  }
}
