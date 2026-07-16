import { Component, ElementRef, ViewChild, input, output } from '@angular/core';
import { Button } from '../button/button';

@Component({
  selector: 'byiara-confirmation-modal',
  standalone: true,
  imports: [Button],
  templateUrl: './confirmation-modal.html',
  styleUrl: './confirmation-modal.css',
})
export class ConfirmationModal {
  title = input<string>('Confirm Action');
  message = input<string>('Are you sure you want to proceed?');
  confirmText = input<string>('Confirm');
  cancelText = input<string>('Cancel');
  variant = input<'primary' | 'danger'>('primary');

  confirmed = output<void>();
  cancelled = output<void>();

  @ViewChild('dialog') private dialogRef!: ElementRef<HTMLDialogElement>;

  public open(): void {
    const dialog = this.dialogRef.nativeElement;
    dialog.showModal();

    // Fallback for light-dismiss on browsers without native closedby support (Safari)
    if (!('closedBy' in HTMLDialogElement.prototype)) {
      dialog.onclick = (event) => {
        if (event.target !== dialog) return;

        const rect = dialog.getBoundingClientRect();
        const isDialogContent = (
          rect.top <= event.clientY &&
          event.clientY <= rect.bottom &&
          rect.left <= event.clientX &&
          event.clientX <= rect.right
        );

        if (!isDialogContent) {
          this.close();
        }
      };
    }
  }

  public close(): void {
    this.dialogRef.nativeElement.close();
    this.cancelled.emit();
  }

  protected onConfirm(): void {
    this.dialogRef.nativeElement.close();
    this.confirmed.emit();
  }
}
