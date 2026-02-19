import { CommonModule } from '@angular/common';
import { Component, Input, Output, EventEmitter, ViewChild, ElementRef, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DictationSentence } from '../../../models/dictation.model';

@Component({
  selector: 'app-dictation-input',
  imports: [CommonModule, FormsModule],
  templateUrl: './dictation-input.html',
  styleUrl: './dictation-input.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DictationInput {
  @ViewChild('dictationInput') dictationInput?: ElementRef<HTMLTextAreaElement>;
  
  @Input() userInput!: string;
  @Input() showFeedback!: boolean;
  @Input() currentAccuracy!: number;
  @Input() currentSentence: DictationSentence | null = null;
  @Input() passingScore!: number;

  @Output() userInputChange = new EventEmitter<string>();
  @Output() enterKey = new EventEmitter<KeyboardEvent>();

  getHighlightedText(): string {
    if (!this.currentSentence || !this.currentSentence.feedback) return '';
    
    const userWords = this.userInput.trim().split(/\s+/);
    const feedback = this.currentSentence.feedback;
    
    // Create a map of incorrect words
    const misspelledMap = new Map<string, string>();
    
    // Add misspelled words
    feedback.mistakes.misspelledWords.forEach(mistake => {
      misspelledMap.set(mistake.typed.toLowerCase(), mistake.original);
    });
    
    // Build highlighted HTML
    let html = '';
    userWords.forEach((word, index) => {
      const wordLower = word.toLowerCase();
      const isExtra = feedback.mistakes.extraWords.some(w => w.toLowerCase() === wordLower);
      const isMisspelled = misspelledMap.has(wordLower);
      
      if (isExtra || isMisspelled) {
        // Highlight incorrect words in red
        html += `<span class="bg-red-200 dark:bg-red-900/50 text-red-800 dark:text-red-300 rounded">${this.escapeHtml(word)}</span>`;
      } else {
        // Correct words
        html += `<span class="text-gray-800 dark:text-gray-200">${this.escapeHtml(word)}</span>`;
      }
      
      if (index < userWords.length - 1) {
        html += ' ';
      }
    });
    
    return html;
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  onInputChange(value: string): void {
    this.userInputChange.emit(value);
  }

  onEnterKey(event: KeyboardEvent): void {
    event.preventDefault();
    
    // Allow submit if not showing feedback OR if showing feedback but score < passingScore
    if (!this.showFeedback || this.currentAccuracy < this.passingScore) {
      this.enterKey.emit(event);
    }
    // If already passed (100%), Enter does nothing - user must click Next button
  }

  focus(): void {
    setTimeout(() => {
      this.dictationInput?.nativeElement.focus();
    }, 100);
  }

  setCursorPosition(position: number): void {
    setTimeout(() => {
      const textarea = this.dictationInput?.nativeElement;
      if (textarea) {
        textarea.focus();
        textarea.setSelectionRange(position, position);
      }
    }, 100);
  }

  moveCursorToMissingWord(original: string, userInput: string): void {
    const originalWords = original.toLowerCase().split(/\s+/);
    const userWords = userInput.toLowerCase().split(/\s+/);
    
    let userIndex = 0;
    let charPosition = 0;
    
    for (let i = 0; i < originalWords.length; i++) {
      const originalWord = originalWords[i].replace(/[.,!?;:"""''()[\]{}—–-]/g, '');
      
      if (userIndex < userWords.length) {
        const userWord = userWords[userIndex].replace(/[.,!?;:"""''()[\]{}—–-]/g, '');
        
        if (originalWord === userWord) {
          charPosition += userWords[userIndex].length + 1;
          userIndex++;
        } else {
          this.setCursorPosition(charPosition);
          return;
        }
      } else {
        this.setCursorPosition(charPosition);
        return;
      }
    }
  }
}
