export type LocaleCode = 'pt-PT' | 'en-US';
export type LocalePath = 'pt' | 'en';
export type PublicPagePath = '' | 'services';

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

export function isLocalePath(path: string | undefined): path is LocalePath {
  return SUPPORTED_LOCALES.some((locale) => locale.path === path);
}

export function getLocaleByPath(
  path: string | undefined,
): SupportedLocale | undefined {
  return SUPPORTED_LOCALES.find((locale) => locale.path === path);
}
