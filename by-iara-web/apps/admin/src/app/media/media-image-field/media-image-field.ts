import {
  booleanAttribute,
  Component,
  computed,
  input,
  output,
} from '@angular/core';
import { Button, FileUploadButton } from '@by-iara/shared-ui';

@Component({
  selector: 'byiara-media-image-field',
  imports: [Button, FileUploadButton],
  templateUrl: './media-image-field.html',
  styleUrl: './media-image-field.css',
})
export class MediaImageField {
  label = input.required<string>();
  metaLabel = input('16:9');
  imageUrl = input<string | null>(null);
  imageAlt = input('Image preview');
  helperText = input<string | null>(null);
  error = input<string | null>(null);
  processing = input(false, { transform: booleanAttribute });
  disabled = input(false, { transform: booleanAttribute });
  inputId = input.required<string>();

  libraryRequested = output<void>();
  fileSelected = output<Event>();
  removeRequested = output<void>();

  protected readonly helperId = computed(() => `${this.inputId()}-help`);
  protected readonly errorId = computed(() => `${this.inputId()}-error`);
  protected readonly describedBy = computed(
    () =>
      [
        this.helperText() ? this.helperId() : null,
        this.error() ? this.errorId() : null,
      ]
        .filter(Boolean)
        .join(' ') || null,
  );
}
