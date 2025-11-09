import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-auth-status',
  imports: [CommonModule],
  templateUrl: './auth-status.html',
  styleUrl: './auth-status.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AuthStatus {
  private authService = inject(AuthService);

  isAuthenticated = this.authService.isAuthenticated;
  currentUser = this.authService.currentUser;
  isAnonymous = () => this.authService.isAnonymous();
  displayName = () => this.authService.getDisplayName();
  email = () => this.authService.getEmail();
  photoURL = () => this.authService.getPhotoURL();

  signInWithGoogle(): void {
    this.authService.signInWithGoogle().subscribe({
      next: () => {
        console.log('Signed in with Google successfully');
        window.location.reload();
      },
      error: (error) => console.error('Google sign in failed:', error)
    });
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

  signOut(): void {
    this.authService.signOut().subscribe({
      next: () => {
        console.log('Signed out successfully');
        // Refresh page to clear all user data
        window.location.reload();
      },
      error: (error) => console.error('Sign out failed:', error)
    });
  }
}
