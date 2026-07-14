import {
  getLocalizedPagePath,
  getPublicPageKey,
  localizePublicPageSegments,
} from './supported-locales';

describe('localized public routes', () => {
  it('uses Portuguese paths below /pt', () => {
    expect(getLocalizedPagePath('pt', 'services')).toBe('servicos');
    expect(getLocalizedPagePath('pt', 'book')).toBe('marcar');
  });

  it('uses English paths below /en', () => {
    expect(getLocalizedPagePath('en', 'services')).toBe('services');
    expect(getLocalizedPagePath('en', 'book')).toBe('book');
  });

  it('resolves localized paths back to stable page keys', () => {
    expect(getPublicPageKey('pt', 'servicos')).toBe('services');
    expect(getPublicPageKey('en', 'services')).toBe('services');
    expect(getPublicPageKey('pt', undefined)).toBe('home');
  });

  it('translates known paths while switching locale', () => {
    expect(localizePublicPageSegments('pt', 'en', ['servicos'])).toEqual([
      'services',
    ]);
    expect(localizePublicPageSegments('en', 'pt', ['book'])).toEqual([
      'marcar',
    ]);
  });

  it('preserves non-public paths while switching locale', () => {
    expect(localizePublicPageSegments('pt', 'en', ['design-system'])).toEqual([
      'design-system',
    ]);
  });
});
