import { RESPONSE_INIT } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { DEFAULT_LOCALE } from '../i18n/supported-locales';
import { LanguageService } from '../i18n/language.service';
import { WEBSITE_MESSAGES } from '../i18n/website-messages';
import { BUSINESS_DETAILS } from '../legal/business-details';
import { NotFound } from './not-found';

describe('NotFound', () => {
  let fixture: ComponentFixture<NotFound>;
  let responseInit: { status?: number };

  beforeEach(async () => {
    responseInit = {};

    await TestBed.configureTestingModule({
      imports: [NotFound],
      providers: [
        provideRouter([]),
        { provide: RESPONSE_INIT, useValue: responseInit },
        {
          provide: LanguageService,
          useValue: {
            messages: () => WEBSITE_MESSAGES[DEFAULT_LOCALE.locale],
            localizedLink: (page = 'home') =>
              page === 'services' ? ['/pt/massagens'] : ['/pt'],
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(NotFound);
    fixture.detectChanges();
  });

  it('sets the SSR response status to 404', () => {
    expect(responseInit.status).toBe(404);
  });

  it('renders general recovery copy and useful routes', () => {
    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelector('h1')?.textContent).toContain(
      'Página não encontrada',
    );
    expect(element.textContent).not.toContain('Serviço não encontrado');
    expect(
      element.querySelector<HTMLAnchorElement>('a[href="/pt"]'),
    ).not.toBeNull();
    expect(
      element.querySelector<HTMLAnchorElement>('a[href="/pt/massagens"]'),
    ).not.toBeNull();
    expect(
      element.querySelector<HTMLAnchorElement>(
        `a[href="mailto:${BUSINESS_DETAILS.email}"]`,
      ),
    ).not.toBeNull();
  });
});
