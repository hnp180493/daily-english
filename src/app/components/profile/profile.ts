import { Component, ChangeDetectionStrategy, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { Location } from '@angular/common';
import { AchievementShowcase } from '../achievements/achievement-showcase/achievement-showcase';
import { AiProviderConfig } from '../ai-provider-config/ai-provider-config';
import { AppSettingsComponent } from '../app-settings/app-settings';
import { AuthService } from '../../services/auth.service';

type TabType = 'achievements' | 'settings';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, AchievementShowcase, AiProviderConfig, AppSettingsComponent],
  templateUrl: './profile.html',
  styleUrls: ['./profile.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProfileComponent implements OnInit {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private location = inject(Location);
  private authService = inject(AuthService);

  currentUser = this.authService.currentUser;
  displayName = () => this.authService.getDisplayName();
  email = () => this.authService.getEmail();
  photoURL = () => this.authService.getPhotoURL();
  isAnonymous = () => this.authService.isAnonymous();

  activeTab = signal<TabType>('achievements');

  ngOnInit(): void {
    const tab = this.route.snapshot.queryParamMap.get('tab');
    if (tab === 'settings') {
      this.activeTab.set('settings');
    }
  }

  goBack(): void {
    // Check if there's history to go back to
    if (window.history.length > 1) {
      this.location.back();
    } else {
      // Fallback to home if no history
      this.router.navigate(['/home']);
    }
  }

  signOut(): void {
    if (confirm('Bạn có chắc muốn đăng xuất?')) {
      this.authService.signOut().subscribe({
        next: () => {
          console.log('Signed out successfully');
          window.location.reload();
        },
        error: (error) => console.error('Sign out failed:', error)
      });
    }
  }

  linkWithGoogle(): void {
    this.authService.linkAnonymousWithGoogle().subscribe({
      next: () => {
        console.log('Linked with Google successfully');
        window.location.reload();
      },
      error: (error) => console.error('Link with Google failed:', error)
    });
  }

  setActiveTab(tab: TabType): void {
    this.activeTab.set(tab);
  }
}
