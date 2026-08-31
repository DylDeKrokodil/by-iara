import { Component, booleanAttribute, input, output } from '@angular/core';

/**
 * A single option in a native radio group. Unlike Checkbox this is not a
 * ControlValueAccessor: one radio doesn't own the group's value, the group
 * does. Wire several to one FormControl via `checked`/`checkedChange`, e.g.
 * `[checked]="form.value.payment === 'studio'"` and
 * `(checkedChange)="form.patchValue({ payment: $event })"`.
 */
@Component({
  selector: 'byiara-radio',
  imports: [],
  templateUrl: './radio.html',
  styleUrl: './radio.css',
})
export class Radio {
  label = input.required<string>();
  name = input.required<string>();
  value = input.required<string>();
  checked = input(false, { transform: booleanAttribute });
  disabled = input(false, { transform: booleanAttribute });

  checkedChange = output<string>();

  protected onInput(): void {
    this.checkedChange.emit(this.value());
  }
}
