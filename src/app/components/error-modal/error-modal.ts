import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-error-modal',
  imports: [CommonModule],
  templateUrl: './error-modal.html',
  styleUrl: './error-modal.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ErrorModal {
  errorMessage = input.required<string>();
  title = input<string>('Error');
  
  close = output<void>();

  onClose(): void {
    this.close.emit();
  }

  // Check if error message contains URLs
  hasLinks(): boolean {
    return this.errorMessage().includes('http://') || this.errorMessage().includes('https://');
  }

  // Parse error message to extract links
  parseMessage(): { text: string; isLink: boolean; url?: string }[] {
    const message = this.errorMessage();
    const parts: { text: string; isLink: boolean; url?: string }[] = [];
    
    // Split by URLs
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    let lastIndex = 0;
    let match;
    
    while ((match = urlRegex.exec(message)) !== null) {
      // Add text before URL
      if (match.index > lastIndex) {
        parts.push({
          text: message.substring(lastIndex, match.index),
          isLink: false
        });
      }
      
      // Add URL
      parts.push({
        text: match[0],
        isLink: true,
        url: match[0]
      });
      
      lastIndex = match.index + match[0].length;
    }
    
    // Add remaining text
    if (lastIndex < message.length) {
      parts.push({
        text: message.substring(lastIndex),
        isLink: false
      });
    }
    
    return parts.length > 0 ? parts : [{ text: message, isLink: false }];
  }
}
