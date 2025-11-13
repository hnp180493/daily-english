import { Directive, HostListener, Input, inject } from '@angular/core';
import { Router } from '@angular/router';

/**
 * Optimized router link directive that prefetches routes on hover
 * This reduces perceived navigation delay by preloading the route module
 */
@Directive({
  selector: '[appOptimizedRouterLink]',
  standalone: true,
})
export class OptimizedRouterLinkDirective {
  @Input() appOptimizedRouterLink: string | any[] = '';
  
  private router = inject(Router);
  private prefetched = false;

  @HostListener('mouseenter')
  onMouseEnter(): void {
    if (!this.prefetched) {
      this.prefetchRoute();
    }
  }

  @HostListener('click', ['$event'])
  onClick(event: MouseEvent): void {
    // Prevent default and navigate programmatically for better control
    event.preventDefault();
    
    const url = Array.isArray(this.appOptimizedRouterLink)
      ? this.appOptimizedRouterLink
      : [this.appOptimizedRouterLink];
    
    this.router.navigate(url);
  }

  private prefetchRoute(): void {
    try {
      const url = Array.isArray(this.appOptimizedRouterLink)
        ? this.appOptimizedRouterLink.join('/')
        : this.appOptimizedRouterLink;
      
      // Trigger route preloading
      this.router.navigate([url], { skipLocationChange: true }).then(() => {
        // Navigation was just for preloading, don't actually change route
        this.prefetched = true;
        console.log('[OptimizedLink] Prefetched:', url);
      }).catch(() => {
        // Ignore errors during prefetch
      });
    } catch (error) {
      // Ignore prefetch errors
    }
  }
}
