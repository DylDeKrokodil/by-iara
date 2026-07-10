import { Component, forwardRef, input, signal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

export type SwitchLabelPosition = 'stacked' | 'inline';

/**
 * Checkbox-backed toggle (role="switch"). `labelPosition` picks the layout:
 * `stacked` puts a label + description block before a larger track (a
 * settings row); `inline` puts a compact track before a single line of text.
 */
@Component({
  selector: 'byiara-switch',
  imports: [],
  templateUrl: './switch.html',
  styleUrl: './switch.css',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => Switch),
      multi: true,
    },
  ],
})
export class Switch implements ControlValueAccessor {
  label = input<string>('');
  description = input<string | null>(null);
  labelPosition = input<SwitchLabelPosition>('inline');

  protected readonly value = signal(false);
  protected readonly disabled = signal(false);

  private onChange: (value: boolean) => void = () => {};
  protected onTouched: () => void = () => {};

  writeValue(value: boolean | null): void {
    this.value.set(value ?? false);
  }

  registerOnChange(fn: (value: boolean) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled.set(isDisabled);
  }

  protected onInput(event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.value.set(checked);
    this.onChange(checked);
  }
}
