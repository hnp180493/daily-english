import { Component, ViewContainerRef, inject, OnInit, OnDestroy } from '@angular/core';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { HeaderComponent } from './components/header/header';
import { FooterComponent } from './components/footer/footer';
import { ToastContainer } from './components/toast-container/toast-container';
import { ModalService } from './services/modal.service';
import { WeeklyGoalService } from './services/weekly-goal.service';
import { AnalyticsService } from './services/analytics.service';
import { RetentionTrackingService } from './services/retention-tracking.service';
import { filter, Subscription } from 'rxjs';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, HeaderComponent, FooterComponent, ToastContainer],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements OnInit, OnDestroy {
  title = 'English Practice Platform';
  
  private viewContainerRef = inject(ViewContainerRef);
  private modalService = inject(ModalService);
  private weeklyGoalService = inject(WeeklyGoalService);
  private analyticsService = inject(AnalyticsService);
  private retentionTrackingService = inject(RetentionTrackingService);
  private router = inject(Router);
  private routerSubscription?: Subscription;

  ngOnInit(): void {
    // Register ViewContainerRef for modal service
    this.modalService.setViewContainerRef(this.viewContainerRef);
    
    // Force WeeklyGoalService initialization
    console.log('[App] WeeklyGoalService initialized:', !!this.weeklyGoalService);

    // Initialize retention tracking
    this.retentionTrackingService.initialize();

    // Track page views on navigation
    this.routerSubscription = this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => {
        const path = event.urlAfterRedirects;
        const title = this.getPageTitle();
        this.analyticsService.trackPageView(path, title);
      });
  }

  ngOnDestroy(): void {
    this.routerSubscription?.unsubscribe();
  }

  /**
   * Extract page title from router state or document title
   */
  private getPageTitle(): string {
    // Try to get title from route data
    let route = this.router.routerState.root;
    while (route.firstChild) {
      route = route.firstChild;
    }
    
    const routeTitle = route.snapshot.data['seo']?.title;
    if (routeTitle) {
      return routeTitle;
    }

    // Fallback to document title
    return document.title || 'Daily English';
  }
}
