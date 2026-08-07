import {
  Component,
  ElementRef,
  EventEmitter,
  OnDestroy,
  Output,
  ViewChild,
  inject,
  signal,
} from '@angular/core';
import { catchError, forkJoin, map, of } from 'rxjs';
import { Button, FileUploadButton } from '@by-iara/shared-ui';
import { MediaApi } from '../media-api';
import { formatMediaBytes } from '../media-format';
import { MediaAsset, MediaAssetView } from '../media.models';

@Component({
  selector: 'byiara-media-picker',
  imports: [Button, FileUploadButton],
  templateUrl: './media-picker.html',
  styleUrl: './media-picker.css',
})
export class MediaPicker implements OnDestroy {
  private readonly api = inject(MediaApi);

  @ViewChild('dialog') private dialog?: ElementRef<HTMLDialogElement>;
  @Output() readonly selected = new EventEmitter<MediaAsset>();

  protected readonly images = signal<MediaAssetView[]>([]);
  protected readonly loading = signal(false);
  protected readonly uploading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly formatBytes = formatMediaBytes;

  open(): void {
    this.dialog?.nativeElement.showModal();
    this.load();
  }

  close(): void {
    this.dialog?.nativeElement.close();
  }

  protected choose(image: MediaAssetView): void {
    this.selected.emit(image);
    this.close();
  }

  protected upload(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    this.uploading.set(true);
    this.error.set(null);
    this.api.upload(file).subscribe({
      next: () => {
        this.uploading.set(false);
        this.load();
      },
      error: () => {
        this.uploading.set(false);
        this.error.set('Could not upload this image.');
      },
    });
  }

  ngOnDestroy(): void {
    this.revokePreviews();
  }

  private load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.api.list().subscribe({
      next: (images) => {
        this.revokePreviews();
        if (!images.length) {
          this.images.set([]);
          this.loading.set(false);
          return;
        }
        forkJoin(
          images.map((image) =>
            this.api.download(image.url).pipe(
              map((blob) => ({
                ...image,
                previewUrl: URL.createObjectURL(blob),
              })),
              catchError(() => of({ ...image, previewUrl: null })),
            ),
          ),
        ).subscribe((loaded) => {
          this.images.set(loaded);
          this.loading.set(false);
        });
      },
      error: () => {
        this.error.set('Could not load the image library.');
        this.loading.set(false);
      },
    });
  }

  private revokePreviews(): void {
    this.images().forEach((image) => {
      if (image.previewUrl) URL.revokeObjectURL(image.previewUrl);
    });
  }
}
