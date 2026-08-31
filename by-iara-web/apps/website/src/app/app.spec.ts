import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { App } from './app';
import { SOCIAL_LINKS } from './brand/brand';
import { BUSINESS_DETAILS } from './legal/business-details';

describe('App', () => {
  async function createApp(hasGuides = false) {
    const fixture = TestBed.createComponent(App);
    const http = TestBed.inject(HttpTestingController);
    http.expectOne('/api/discounts/featured').flush(null);
    http.expectOne('/api/guides/availability').flush(hasGuides);
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

  it('should hide guide links from both navbars when no guides are published', async () => {
    const fixture = await createApp();
    const compiled = fixture.nativeElement as HTMLElement;

    expect(
      compiled.querySelector('.header-nav a[href="/pt/guias"]'),
    ).toBeNull();
    expect(
      compiled.querySelector('.mobile-menu-nav a[href="/pt/guias"]'),
    ).toBeNull();
  });

  it('should show guide links in both navbars when a guide is published', async () => {
    const fixture = await createApp(true);
    const compiled = fixture.nativeElement as HTMLElement;

    expect(
      compiled.querySelector('.header-nav a[href="/pt/guias"]'),
    ).not.toBeNull();
    expect(
      compiled.querySelector('.mobile-menu-nav a[href="/pt/guias"]'),
    ).not.toBeNull();
  });

  it('should expose a direct email link in the footer without a phone link', async () => {
    const fixture = await createApp();
    const compiled = fixture.nativeElement as HTMLElement;

    const emailLink = compiled.querySelector<HTMLAnchorElement>(
      `.footer-contact a[href="mailto:${BUSINESS_DETAILS.email}"]`,
    );
    expect(emailLink?.textContent).toContain(BUSINESS_DETAILS.email);
    expect(
      compiled.querySelector('.footer-contact a[href^="https://wa.me/"]'),
    ).toBeNull();
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
