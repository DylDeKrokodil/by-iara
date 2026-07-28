import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { App } from './app';
import { SOCIAL_LINKS } from './brand/brand';
import { BUSINESS_DETAILS, getWhatsAppHref } from './legal/business-details';

describe('App', () => {
  async function createApp() {
    const fixture = TestBed.createComponent(App);
    TestBed.inject(HttpTestingController)
      .expectOne('/api/discounts/featured')
      .flush(null);
    await fixture.whenStable();
    return fixture;
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
      ],
    }).compileComponents();
  });

  afterEach(() => {
    TestBed.inject(HttpTestingController).verify();
  });

  it('should render the router outlet', async () => {
    const fixture = await createApp();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('router-outlet')).not.toBeNull();
  });

  it('should expose direct email and WhatsApp links in the footer', async () => {
    const fixture = await createApp();
    const compiled = fixture.nativeElement as HTMLElement;

    const emailLink = compiled.querySelector<HTMLAnchorElement>(
      `.footer-contact a[href="mailto:${BUSINESS_DETAILS.email}"]`,
    );
    const phoneLink = compiled.querySelector<HTMLAnchorElement>(
      `.footer-contact a[href="${getWhatsAppHref(BUSINESS_DETAILS.phone)}"]`,
    );

    expect(emailLink?.textContent).toContain(BUSINESS_DETAILS.email);
    expect(phoneLink?.textContent).toContain(BUSINESS_DETAILS.phone);
    expect(phoneLink?.target).toBe('_blank');
    expect(phoneLink?.rel).toContain('noopener');
  });

  it('should expose configured social links in the footer', async () => {
    const fixture = await createApp();
    const compiled = fixture.nativeElement as HTMLElement;

    for (const social of SOCIAL_LINKS) {
      const link = compiled.querySelector<HTMLAnchorElement>(
        `.footer-socials a[href="${social.url}"]`,
      );

      expect(link?.textContent).toContain(social.handle);
      expect(link?.textContent).not.toContain('opens in a new window');
      expect(link?.querySelector('svg')).not.toBeNull();
      expect(link?.target).toBe('_blank');
      expect(link?.rel).toContain('noopener');
    }
  });
});
