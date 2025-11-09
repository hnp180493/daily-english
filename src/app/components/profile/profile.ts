import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
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
export class ProfileComponent {
  private router = inject(Router);
  private authService = inject(AuthService);

  currentUser = this.authService.currentUser;
  displayName = () => this.authService.getDisplayName();
  email = () => this.authService.getEmail();
  photoURL = () => this.authService.getPhotoURL();
  isAnonymous = () => this.authService.isAnonymous();

  activeTab = signal<TabType>('achievements');

  goBack(): void {
    this.router.navigate(['/home']);
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
