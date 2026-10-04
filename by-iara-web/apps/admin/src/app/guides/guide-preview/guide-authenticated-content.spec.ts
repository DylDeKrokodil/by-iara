import { ElementRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { MediaApi } from '../../media/media-api';
import { GuideAuthenticatedContent } from './guide-authenticated-content';

describe('GuideAuthenticatedContent', () => {
  it('loads a draft image through the admin API while sanitizing HTML', () => {
    const host = document.createElement('div');
    const download = vi.fn(() => of(new Blob(['image'], { type: 'image/png' })));
    const objectUrl = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:guide-preview');
    const revoke = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
    TestBed.configureTestingModule({
      providers: [
        { provide: ElementRef, useValue: new ElementRef(host) },
        { provide: MediaApi, useValue: { download } },
      ],
    });

    const directive = TestBed.runInInjectionContext(
      () => new GuideAuthenticatedContent(),
    );
    directive.html = '<h2>Draft</h2><img src="/api/guides/images/content/11111111-1111-1111-1111-111111111111/22222222-2222-2222-2222-222222222222" alt="Room"><script>alert(1)</script>';
    directive.ngOnChanges();

    expect(download).toHaveBeenCalledWith(
      '/api/admin/guides/11111111-1111-1111-1111-111111111111/content-images/22222222-2222-2222-2222-222222222222',
    );
    expect(host.querySelector('img')?.getAttribute('src')).toBe('blob:guide-preview');
    expect(host.querySelector('script')).toBeNull();
    directive.ngOnDestroy();
    expect(revoke).toHaveBeenCalledWith('blob:guide-preview');
    objectUrl.mockRestore();
    revoke.mockRestore();
  });
});
