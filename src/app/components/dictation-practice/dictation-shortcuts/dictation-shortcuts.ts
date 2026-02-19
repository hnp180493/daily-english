import { CommonModule } from '@angular/common';
import { Component, Input, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-dictation-shortcuts',
  imports: [CommonModule],
  templateUrl: './dictation-shortcuts.html',
  styleUrl: './dictation-shortcuts.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DictationShortcuts {
  @Input() showShortcutTips!: boolean;
  @Input() playPauseKey!: string;
  @Input() replayKey!: string;

  getKeyLabel(keyString: string): string {
    const keyMap: { [key: string]: string } = {
      'ctrl+space': 'Ctrl + Space',
      'ctrl+r': 'Ctrl + R',
      'ctrl+p': 'Ctrl + P',
      'space': 'Space',
      'backtick': '`',
      'enter': 'Enter'
    };
    return keyMap[keyString] || keyString;
  }
}
