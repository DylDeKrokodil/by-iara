import {
  Directive,
  ElementRef,
  inject,
  Input,
  OnChanges,
  OnDestroy,
} from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { SecurityContext } from '@angular/core';
import { Subscription } from 'rxjs';
import { MediaApi } from '../../media/media-api';
import { contentImageAdminUrl } from '../guide-content';

/** Renders sanitized guide HTML and fetches draft images with the admin token. */
@Directive({ selector: '[byiaraGuideAuthenticatedContent]' })
export class GuideAuthenticatedContent implements OnChanges, OnDestroy {
  @Input({ alias: 'byiaraGuideAuthenticatedContent' }) html = '';

  private readonly element: ElementRef<HTMLElement> = inject(ElementRef);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly mediaApi = inject(MediaApi);
  private readonly requests: Subscription[] = [];
  private readonly objectUrls: string[] = [];

  ngOnChanges(): void {
    this.clearImages();
    this.element.nativeElement.innerHTML =
      this.sanitizer.sanitize(SecurityContext.HTML, this.html) ?? '';

    this.element.nativeElement
      .querySelectorAll<HTMLImageElement>('img[src]')
      .forEach((image) => {
        const adminUrl = contentImageAdminUrl(image.getAttribute('src') ?? '');
        if (!adminUrl) return;
        image.removeAttribute('src');
        this.requests.push(
          this.mediaApi.download(adminUrl).subscribe({
            next: (blob) => {
              const url = URL.createObjectURL(blob);
              this.objectUrls.push(url);
              image.src = url;
            },
            error: () => {
              const status = document.createElement('span');
              status.setAttribute('role', 'status');
              status.textContent = `Image preview unavailable: ${image.alt || 'guide image'}`;
              image.replaceWith(status);
            },
          }),
        );
      });
  }

  ngOnDestroy(): void {
    this.clearImages();
  }

  private clearImages(): void {
    this.requests.splice(0).forEach((request) => request.unsubscribe());
    this.objectUrls.splice(0).forEach((url) => URL.revokeObjectURL(url));
  }
}
