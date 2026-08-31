import { DOCUMENT } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { SITE_ORIGIN } from '../seo/site-origin';
import { WebShareService } from './web-share.service';

describe('WebShareService', () => {
  let service: WebShareService;
  let document: Document;
  let browserNavigator: Navigator;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        { provide: SITE_ORIGIN, useValue: 'https://iaragouveia.com' },
      ],
    });
    service = TestBed.inject(WebShareService);
    document = TestBed.inject(DOCUMENT);
    if (!document.defaultView) throw new Error('Browser window unavailable');
    browserNavigator = document.defaultView.navigator;
  });

  afterEach(() => {
    Object.defineProperty(browserNavigator, 'share', {
      configurable: true,
      value: undefined,
    });
    Object.defineProperty(browserNavigator, 'clipboard', {
      configurable: true,
      value: undefined,
    });
  });

  it('uses the native share sheet when it is available', async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(browserNavigator, 'share', {
      configurable: true,
      value: share,
    });

    const result = await service.share({
      title: 'Guide title',
      text: 'Guide summary',
      url: 'https://example.com/guides/article',
    });

    expect(result).toBe('shared');
    expect(share).toHaveBeenCalledWith({
      title: 'Guide title',
      text: 'Guide summary',
      url: 'https://example.com/guides/article',
    });
  });

  it('reports native sharing as unavailable without copying', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(browserNavigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });

    const result = await service.share({
      title: 'Guide title',
      url: 'https://example.com/guides/article',
    });

    expect(result).toBe('unavailable');
    expect(writeText).not.toHaveBeenCalled();
  });

  it('does not copy the link when the native share sheet is cancelled', async () => {
    const share = vi
      .fn()
      .mockRejectedValue(new DOMException('Cancelled', 'AbortError'));
    const writeText = vi.fn();
    Object.defineProperty(browserNavigator, 'share', {
      configurable: true,
      value: share,
    });
    Object.defineProperty(browserNavigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });

    const result = await service.share({
      title: 'Guide title',
      url: 'https://example.com/guides/article',
    });

    expect(result).toBe('cancelled');
    expect(writeText).not.toHaveBeenCalled();
  });

  it('builds an encoded Facebook share link', () => {
    const content = {
      title: 'A guide & more',
      text: 'Useful details',
      url: 'https://example.com/guides/article?ref=share',
    };

    expect(service.platformLink('facebook', content)).toBe(
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
        content.url,
      )}`,
    );
  });

  it('uses the public canonical URL when no URL is supplied', () => {
    const canonical = document.createElement('link');
    canonical.rel = 'canonical';
    canonical.href =
      'https://iaragouveia.com/pt/guias/como-preparar-massagem';
    document.head.prepend(canonical);

    expect(
      service.platformLink('facebook', { title: 'Guide title' }),
    ).toBe(
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
        canonical.href,
      )}`,
    );

    canonical.remove();
  });

  it('detects whether the browser has a native share sheet', () => {
    expect(service.nativeShareAvailable()).toBe(false);

    Object.defineProperty(browserNavigator, 'share', {
      configurable: true,
      value: vi.fn(),
    });

    expect(service.nativeShareAvailable()).toBe(true);
  });
});
