import { DatePipe } from '@angular/common';
import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { catchError, forkJoin, map, of } from 'rxjs';
import { Alert, EmptyState, PageHeader } from '@by-iara/shared-ui';
import { MediaApi } from '../media-api';
import { formatMediaBytes, mediaUsageLabel } from '../media-format';
import { MediaAssetView } from '../media.models';

@Component({
  selector: 'byiara-media-library',
  imports: [Alert, DatePipe, EmptyState, PageHeader],
  templateUrl: './media-library.html',
  styleUrl: './media-library.css',
})
export class MediaLibrary implements OnInit, OnDestroy {
  private readonly api = inject(MediaApi);

  protected readonly images = signal<MediaAssetView[]>([]);
  protected readonly loading = signal(true);
  protected readonly uploading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly formatBytes = formatMediaBytes;
  protected readonly usageLabel = mediaUsageLabel;

  ngOnInit(): void {
    this.load();
  }

  ngOnDestroy(): void {
    this.revokePreviews();
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

  private load(): void {
    this.loading.set(true);
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
              map((blob) => ({ ...image, previewUrl: URL.createObjectURL(blob) })),
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
