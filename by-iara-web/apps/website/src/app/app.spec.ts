import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { App } from './app';
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
});
