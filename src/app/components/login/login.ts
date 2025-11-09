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
    this.authService.signInWithGoogle().subscribe({
      next: () => {
        console.log('[Login] Signed in with Google successfully');
        this.router.navigate(['/home']);
      },
      error: (error) => {
        console.error('[Login] Google sign in failed:', error);
        alert('Đăng nhập thất bại. Vui lòng thử lại.');
      }
    });
  }
}
