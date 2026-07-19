import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { App } from './app';
import { SOCIAL_LINKS } from './brand/brand';
import { BUSINESS_DETAILS } from './legal/business-details';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  it('should render the router outlet', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('router-outlet')).not.toBeNull();
  });

  it('should expose direct email and phone links in the footer', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;

    const emailLink = compiled.querySelector<HTMLAnchorElement>(
      `.footer-contact a[href="mailto:${BUSINESS_DETAILS.email}"]`,
    );
    const phoneLink = compiled.querySelector<HTMLAnchorElement>(
      `.footer-contact a[href="tel:${BUSINESS_DETAILS.phone.replace(/\s/g, '')}"]`,
    );

    expect(emailLink?.textContent).toContain(BUSINESS_DETAILS.email);
    expect(phoneLink?.textContent).toContain(BUSINESS_DETAILS.phone);
  });

  it('should expose configured social links in the footer', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
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
