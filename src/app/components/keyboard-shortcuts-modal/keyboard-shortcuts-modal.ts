import { ChangeDetectionStrategy, Component, HostListener, inject, signal } from '@angular/core';
import { TranslationService } from '../../services/translation.service';

interface ShortcutRow {
  keys: string[];
  labelKey: string;
}

interface ShortcutGroup {
  titleKey: string;
  rows: ShortcutRow[];
}

/**
 * Global cheatsheet listing every keyboard shortcut in the app.
 * Opens with `?` or `Ctrl + /` (ignored while typing), closes with Esc.
 */
@Component({
  selector: 'app-keyboard-shortcuts-modal',
  templateUrl: './keyboard-shortcuts-modal.html',
  styleUrl: './keyboard-shortcuts-modal.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KeyboardShortcutsModalComponent {
  protected translate = inject(TranslationService);
  protected open = signal(false);

  // Keep in sync with exercise-detail, dictation-practice (DEFAULT settings) and flashcard-study handlers.
  protected readonly groups: ShortcutGroup[] = [
    {
      titleKey: 'shortcuts.group.global',
      rows: [
        { keys: ['?'], labelKey: 'shortcuts.open' },
        { keys: ['Ctrl', '/'], labelKey: 'shortcuts.open' },
        { keys: ['Esc'], labelKey: 'shortcuts.close_modal' },
      ],
    },
    {
      titleKey: 'shortcuts.group.today',
      rows: [
        { keys: ['Space'], labelKey: 'shortcuts.reveal' },
        { keys: ['1', '2', '3', '4'], labelKey: 'shortcuts.rate' },
        { keys: ['Enter'], labelKey: 'shortcuts.submit_next' },
      ],
    },
    {
      titleKey: 'reader.title',
      rows: [
        { keys: ['S'], labelKey: 'reader.save' },
        { keys: ['K'], labelKey: 'reader.mark_known' },
        { keys: ['Esc'], labelKey: 'shortcuts.close_modal' },
      ],
    },
    {
      titleKey: 'shortcuts.group.translation',
      rows: [
        { keys: ['Enter'], labelKey: 'shortcuts.submit_next' },
        { keys: ['R'], labelKey: 'shortcuts.retry' },
      ],
    },
    {
      titleKey: 'shortcuts.group.dictation',
      rows: [
        { keys: ['`'], labelKey: 'shortcuts.play_pause' },
        { keys: ['Ctrl', 'Space'], labelKey: 'shortcuts.replay' },
        { keys: ['Enter'], labelKey: 'shortcuts.submit' },
      ],
    },
    {
      titleKey: 'shortcuts.group.flashcards',
      rows: [
        { keys: ['Space'], labelKey: 'shortcuts.reveal' },
        { keys: ['1', '2', '3', '4'], labelKey: 'shortcuts.rate' },
      ],
    },
  ];

  @HostListener('document:keydown', ['$event'])
  onKeydown(event: KeyboardEvent): void {
    if (this.open() && event.key === 'Escape') {
      this.close();
      return;
    }
    const isToggle = event.key === '?' || ((event.ctrlKey || event.metaKey) && event.key === '/');
    if (!isToggle || isTyping(event.target)) return;
    event.preventDefault();
    this.open.update((v) => !v);
  }

  close(): void {
    this.open.set(false);
  }
}

function isTyping(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el) return false;
  return el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable;
}
