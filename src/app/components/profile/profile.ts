import { Component, ChangeDetectionStrategy, inject, signal, OnInit, computed, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { Location } from '@angular/common';
import { AchievementShowcase } from '../achievements/achievement-showcase/achievement-showcase';
import { AiProviderConfig } from '../ai-provider-config/ai-provider-config';
import { AppSettingsComponent } from '../app-settings/app-settings';
import { AuthService } from '../../services/auth.service';
import { ModalService } from '../../services/modal.service';
import { ExportImportModal } from '../export-import-modal/export-import-modal';
import { TranslationService } from '../../services/translation.service';

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
  private modalService = inject(ModalService);
  private destroyRef = inject(DestroyRef);
  protected translate = inject(TranslationService);

  currentUser = this.authService.currentUser;
  displayName = () => this.authService.getDisplayName();
  email = () => this.authService.getEmail();
  photoURL = () => this.authService.getPhotoURL();
  isAnonymous = () => this.authService.isAnonymous();
  isGuestMode = computed(() => !this.authService.currentUser());

  activeTab = signal<TabType>('achievements');

  ngOnInit(): void {
    // Profile is cached by the route-reuse strategy, so ngOnInit runs only once.
    // Follow the query param stream so links like /profile?tab=settings work on every visit.
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const tab = params.get('tab');
      if (tab === 'settings' || tab === 'achievements') {
        this.activeTab.set(tab);
      }
    });
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
    if (confirm('Are you sure you want to log out?')) {
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

  signInWithGoogle(): void {
    this.authService.signInWithGoogle().subscribe({
      next: () => {
        console.log('Signing in with Google...');
      },
      error: (error) => console.error('Google sign-in failed:', error)
    });
  }

  setActiveTab(tab: TabType): void {
    this.activeTab.set(tab);
    // Keep the URL in sync so a later /profile?tab=... link is seen as a change on the cached route.
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  openExportImportModal(): void {
    const modalRef = this.modalService.open(ExportImportModal);
    if (modalRef) {
      modalRef.instance.close.subscribe(() => {
        this.modalService.close();
      });
    }
  }
}
