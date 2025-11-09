import { Component, ChangeDetectionStrategy, input, forwardRef, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NG_VALUE_ACCESSOR, ControlValueAccessor } from '@angular/forms';

@Component({
  selector: 'app-translation-input',
  imports: [CommonModule, FormsModule],
  templateUrl: './translation-input.html',
  styleUrl: './translation-input.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => TranslationInputComponent),
      multi: true
    }
  ]
})
export class TranslationInputComponent implements ControlValueAccessor {
  placeholder = input<string>('Enter your English translation here...');
  isDisabled = signal<boolean>(false);
  
  value = signal<string>('');
  onChange: any = () => {};
  onTouched: any = () => {};

  writeValue(value: string): void {
    this.value.set(value || '');
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.isDisabled.set(isDisabled);
  }

  onInputChange(value: string): void {
    this.value.set(value);
    this.onChange(value);
    this.onTouched();
  }
}
