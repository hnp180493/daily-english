import { Component, ChangeDetectionStrategy, input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-source-text',
  imports: [CommonModule],
  templateUrl: './source-text.html',
  styleUrl: './source-text.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SourceTextComponent {
  text = input<string>('');
  highlighted = input<string[]>([]);

  formattedText = computed(() => {
    let formatted = this.text();
    this.highlighted().forEach(sentence => {
      formatted = formatted.replace(sentence, `<mark>${sentence}</mark>`);
    });
    return formatted;
  });
}
