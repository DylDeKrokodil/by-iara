import {
  getLocalizedPagePath,
  getPublicPageKey,
  localizePublicPageSegments,
} from './supported-locales';

describe('localized public routes', () => {
  it('uses Portuguese paths below /pt', () => {
    expect(getLocalizedPagePath('pt', 'services')).toBe('servicos');
    expect(getLocalizedPagePath('pt', 'book')).toBe('marcar');
    expect(getLocalizedPagePath('pt', 'privacy')).toBe('privacidade');
    expect(getLocalizedPagePath('pt', 'bookingTerms')).toBe(
      'termos-de-marcacao',
    );
  });

  it('uses English paths below /en', () => {
    expect(getLocalizedPagePath('en', 'services')).toBe('services');
    expect(getLocalizedPagePath('en', 'book')).toBe('book');
    expect(getLocalizedPagePath('en', 'legalNotice')).toBe('legal-information');
  });

  it('resolves localized paths back to stable page keys', () => {
    expect(getPublicPageKey('pt', 'servicos')).toBe('services');
    expect(getPublicPageKey('en', 'services')).toBe('services');
    expect(getPublicPageKey('pt', undefined)).toBe('home');
    expect(getPublicPageKey('en', 'privacy')).toBe('privacy');
  });

  it('translates known paths while switching locale', () => {
    expect(localizePublicPageSegments('pt', 'en', ['servicos'])).toEqual([
      'services',
    ]);
    expect(localizePublicPageSegments('en', 'pt', ['book'])).toEqual([
      'marcar',
    ]);
    expect(
      localizePublicPageSegments('pt', 'en', ['termos-de-marcacao']),
    ).toEqual(['booking-terms']);
  });

  it('preserves non-public paths while switching locale', () => {
    expect(localizePublicPageSegments('pt', 'en', ['design-system'])).toEqual([
      'design-system',
    ]);
  });
});
