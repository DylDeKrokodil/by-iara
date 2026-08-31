import {
  booleanAttribute,
  Component,
  computed,
  input,
  output,
} from '@angular/core';
import { ButtonSize, ButtonVariant } from '../button/button';
import { Spinner } from '../spinner/spinner';

/**
 * File input that uses the same visual language as the shared button.
 * The native change event is forwarded so consumers can inspect and reset
 * the input after handling a selection.
 */
@Component({
  selector: 'byiara-file-upload-button',
  imports: [Spinner],
  templateUrl: './file-upload-button.html',
  styleUrl: './file-upload-button.css',
})
export class FileUploadButton {
  variant = input<ButtonVariant>('primary');
  size = input<ButtonSize>('md');
  accept = input<string | null>(null);
  disabled = input(false, { transform: booleanAttribute });
  loading = input(false, { transform: booleanAttribute });
  inputId = input<string | null>(null);
  ariaDescribedBy = input<string | null>(null);

  readonly fileSelected = output<Event>();

  protected readonly classes = computed(() => {
    const classes = ['btn', `btn-${this.variant()}`];
    if (this.size() === 'sm') {
      classes.push('btn-sm');
    }
    if (this.disabled() || this.loading()) {
      classes.push('is-disabled');
    }
    return classes.join(' ');
  });
}
