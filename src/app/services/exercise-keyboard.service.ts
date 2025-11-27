import { Injectable, signal } from '@angular/core';

export interface KeyboardShortcut {
  key: string;
  description: string;
  action: () => void;
  condition?: () => boolean;
}

@Injectable({
  providedIn: 'root'
})
export class ExerciseKeyboardService {
  private shortcuts = signal<KeyboardShortcut[]>([]);

  registerShortcuts(shortcuts: KeyboardShortcut[]): void {
    this.shortcuts.set(shortcuts);
  }

  handleKeyDown(event: KeyboardEvent): boolean {
    const target = event.target as HTMLElement;
    const isInTextarea = target.tagName === 'TEXTAREA';
    const isInInput = target.tagName === 'INPUT';
    
    const shortcuts = this.shortcuts();
    for (const shortcut of shortcuts) {
      if (this.matchesKey(event, shortcut.key)) {
        // Check condition first
        const conditionMet = !shortcut.condition || shortcut.condition();
        if (!conditionMet) {
          continue;
        }

        // Special handling for 'r' key - allow in textarea when readonly
        if (shortcut.key === 'r' && isInTextarea) {
          const textarea = target as HTMLTextAreaElement;
          // Only trigger if textarea is readonly (can proceed to next)
          if (textarea.readOnly) {
            event.preventDefault();
            shortcut.action();
            return true;
          }
          // If not readonly, let user type 'r' normally
          continue;
        }
        
        // For other keys, ignore if in input/textarea
        if (isInTextarea || isInInput) {
          continue;
        }
        
        // Execute shortcut
        event.preventDefault();
        shortcut.action();
        return true;
      }
    }

    return false;
  }

  handleTextareaEnter(event: KeyboardEvent, onSubmit: () => void, onNext: () => void, canProceed: boolean): void {
    event.preventDefault();
    
    if (canProceed) {
      onNext();
    } else {
      onSubmit();
    }
  }

  private matchesKey(event: KeyboardEvent, key: string): boolean {
    return event.key === key || event.key === key.toUpperCase();
  }

  clearShortcuts(): void {
    this.shortcuts.set([]);
  }
}
