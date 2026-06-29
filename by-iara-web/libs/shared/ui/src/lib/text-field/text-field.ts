import {
  Component,
  booleanAttribute,
  forwardRef,
  input,
  numberAttribute,
  signal,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

/**
 * Labelled text input (or textarea via `multiline`) that plugs straight into
 * reactive forms through ControlValueAccessor. Validation messaging stays with
 * the form: pass the resolved message via `error`.
 */
@Component({
  selector: 'byiara-text-field',
  imports: [],
  templateUrl: './text-field.html',
  styleUrl: './text-field.css',
  providers: [
    { provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => TextField), multi: true },
  ],
})
export class TextField implements ControlValueAccessor {
  label = input.required<string>();
  type = input<string>('text');
  autocomplete = input<string>('');
  /** Optional suffix rendered after the label (e.g. a localized "optional"). */
  optionalLabel = input<string>('');
  /** Resolved error message; shown when truthy. */
  error = input<string | null>(null);
  multiline = input(false, { transform: booleanAttribute });
  rows = input(3, { transform: numberAttribute });

  protected readonly value = signal('');
  protected readonly disabled = signal(false);

  private onChange: (value: string) => void = () => {};
  protected onTouched: () => void = () => {};

  writeValue(value: string | null): void {
    this.value.set(value ?? '');
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled.set(isDisabled);
  }

  protected onInput(event: Event): void {
    const target = event.target as HTMLInputElement | HTMLTextAreaElement;
    this.value.set(target.value);
    this.onChange(target.value);
  }
}
