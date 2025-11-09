import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  imports: [CommonModule],
  templateUrl: './login.html',
  styleUrl: './login.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LoginComponent {
  private authService = inject(AuthService);
  private router = inject(Router);

  signInWithGoogle(): void {
    console.log('[Login] Starting Google OAuth flow...');
    this.authService.signInWithGoogle().subscribe({
      next: () => {
        console.log('[Login] OAuth redirect initiated');
        // Don't navigate manually - OAuth will redirect automatically
      },
      error: (error) => {
        console.error('[Login] Google sign in failed:', error);
        alert('Đăng nhập thất bại. Vui lòng thử lại.');
      }
    });
  }
}
