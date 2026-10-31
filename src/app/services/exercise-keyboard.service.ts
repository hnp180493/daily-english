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
    // Leave browser shortcuts (Ctrl+R), IME composition (Vietnamese input) and native controls alone.
    if (event.ctrlKey || event.metaKey || event.altKey || event.isComposing) return false;

    const target = event.target as HTMLElement;
    const tag = target?.tagName;
    if (tag === 'TEXTAREA' || tag === 'INPUT' || tag === 'BUTTON' || tag === 'SELECT' || target?.isContentEditable) {
      return false;
    }

    const shortcuts = this.shortcuts();
    for (const shortcut of shortcuts) {
      if (this.matchesKey(event, shortcut.key)) {
        // Check condition first
        const conditionMet = !shortcut.condition || shortcut.condition();
        if (!conditionMet) {
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
