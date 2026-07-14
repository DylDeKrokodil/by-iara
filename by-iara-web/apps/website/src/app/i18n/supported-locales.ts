export type LocaleCode = 'pt-PT' | 'en-US';
export type LocalePath = 'pt' | 'en';
export type PublicPageKey = 'home' | 'services' | 'book';

export interface SupportedLocale {
  readonly locale: LocaleCode;
  readonly path: LocalePath;
  readonly shortLabel: string;
  readonly nativeName: string;
}

export const SUPPORTED_LOCALES = [
  {
    locale: 'pt-PT',
    path: 'pt',
    shortLabel: 'PT',
    nativeName: 'Português',
  },
  {
    locale: 'en-US',
    path: 'en',
    shortLabel: 'EN',
    nativeName: 'English',
  },
] as const satisfies readonly SupportedLocale[];

export const DEFAULT_LOCALE_PATH: LocalePath = 'pt';
export const DEFAULT_LOCALE = SUPPORTED_LOCALES[0];

export const LOCALIZED_PAGE_PATHS = {
  pt: {
    home: '',
    services: 'servicos',
    book: 'marcar',
  },
  en: {
    home: '',
    services: 'services',
    book: 'book',
  },
} as const satisfies Record<LocalePath, Record<PublicPageKey, string>>;

export function getLocalizedPagePath(
  locale: LocalePath,
  page: PublicPageKey,
): string {
  return LOCALIZED_PAGE_PATHS[locale][page];
}

export function getPublicPageKey(
  locale: LocalePath,
  pagePath: string | undefined,
): PublicPageKey | undefined {
  const normalizedPath = pagePath ?? '';
  return (
    Object.entries(LOCALIZED_PAGE_PATHS[locale]) as Array<
      [PublicPageKey, string]
    >
  ).find(([, localizedPath]) => localizedPath === normalizedPath)?.[0];
}

export function localizePublicPageSegments(
  currentLocale: LocalePath,
  targetLocale: LocalePath,
  segments: readonly string[],
): readonly string[] {
  const page = getPublicPageKey(currentLocale, segments[0]);
  if (!page) {
    return segments;
  }

  const targetPagePath = getLocalizedPagePath(targetLocale, page);
  return targetPagePath
    ? [targetPagePath, ...segments.slice(1)]
    : segments.slice(1);
}

export function isLocalePath(path: string | undefined): path is LocalePath {
  return SUPPORTED_LOCALES.some((locale) => locale.path === path);
}

export function getLocaleByPath(
  path: string | undefined,
): SupportedLocale | undefined {
  return SUPPORTED_LOCALES.find((locale) => locale.path === path);
}
