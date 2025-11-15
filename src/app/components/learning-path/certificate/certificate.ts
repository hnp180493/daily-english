import { Component, ChangeDetectionStrategy, input, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PathCompletion } from '../../../models/learning-path.model';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-certificate',
  imports: [CommonModule],
  templateUrl: './certificate.html',
  styleUrl: './certificate.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CertificateComponent {
  private authService = inject(AuthService);

  completion = input.required<PathCompletion>();
  userName = signal<string>('');

  constructor() {
    // Get user name from auth service
    const user = this.authService.currentUser();
    this.userName.set(user?.displayName || user?.email || 'Learner');
  }

  downloadCertificate(): void {
    const certificateElement = document.getElementById('certificate');
    if (!certificateElement) return;

    // Use html2canvas to convert to image
    import('html2canvas').then(({ default: html2canvas }) => {
      html2canvas(certificateElement, {
        scale: 2,
        backgroundColor: '#1F2937'
      }).then(canvas => {
        const link = document.createElement('a');
        link.download = `certificate-${this.completion().pathId}-${Date.now()}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
      });
    }).catch(error => {
      console.error('Error downloading certificate:', error);
      alert('Failed to download certificate. Please try again.');
    });
  }

  shareCertificate(): void {
    const completion = this.completion();
    const text = `I just completed the ${completion.pathName} learning path! 🎉`;
    
    if (navigator.share) {
      navigator.share({
        title: 'Learning Path Certificate',
        text: text,
        url: window.location.href
      }).catch(error => {
        console.log('Error sharing:', error);
      });
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(text).then(() => {
        alert('Certificate text copied to clipboard!');
      });
    }
  }

  formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }
}
