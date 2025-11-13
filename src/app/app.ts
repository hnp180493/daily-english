import { Component, inject, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HeaderComponent } from './components/header/header';
import { FooterComponent } from './components/footer/footer';
import { ToastContainer } from './components/toast-container/toast-container';
import { ToastService } from './services/toast.service';
import { ReviewService } from './services/review.service';
import { NotificationTestUtility } from './services/notification-test.utility';
import { NavigationOptimizerService } from './services/navigation-optimizer.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, HeaderComponent, FooterComponent, ToastContainer],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements OnInit {
  title = 'English Practice Platform';
  
  private toastService = inject(ToastService);
  private reviewService = inject(ReviewService);
  private navigationOptimizer = inject(NavigationOptimizerService);
  
  ngOnInit(): void {
    // Setup test functions in development
    NotificationTestUtility.setupGlobalTestFunctions(this.toastService, this.reviewService);
  }
}
