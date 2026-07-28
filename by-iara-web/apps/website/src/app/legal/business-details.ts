import type { LocaleCode } from '../i18n/supported-locales';

export type LegalForm = 'selfEmployed';
export type BookingRetention = 'twoYears';

export interface BusinessDetails {
  readonly legalName: string;
  readonly legalForm: LegalForm | '';
  readonly taxId: string;
  readonly registeredAddress: readonly string[];
  readonly email: string;
  readonly privacyEmail: string;
  readonly phone: string;
  readonly inPersonPaymentMethods: readonly InPersonPaymentMethod[];
  readonly bookingRetention: BookingRetention | '';
  readonly adrEntityName: string;
  readonly adrEntityUrl: string;
}

export type InPersonPaymentMethod = 'cash' | 'mbWay' | 'bankTransfer';

const LEGAL_FORM_LABELS: Record<LocaleCode, Record<LegalForm, string>> = {
  'pt-PT': { selfEmployed: 'Trabalhadora independente' },
  'en-US': { selfEmployed: 'Self-employed professional' },
};

const BOOKING_RETENTION_LABELS: Record<
  LocaleCode,
  Record<BookingRetention, string>
> = {
  'pt-PT': { twoYears: '2 anos' },
  'en-US': { twoYears: '2 years' },
};

export function getLegalFormLabel(
  locale: LocaleCode,
  legalForm: BusinessDetails['legalForm'],
): string {
  return legalForm ? LEGAL_FORM_LABELS[locale][legalForm] : '';
}

export function getBookingRetentionLabel(
  locale: LocaleCode,
  retention: BusinessDetails['bookingRetention'],
): string {
  return retention ? BOOKING_RETENTION_LABELS[locale][retention] : '';
}

export function getWhatsAppHref(phone: string): string | undefined {
  const digits = phone.replace(/\D/g, '');
  return digits ? `https://wa.me/${digits}` : undefined;
}

export const BOOKING_POLICY = {
  cancellationNoticeHours: 24,
  firstLateCancellationHasPenalty: false,
  repeatedLateCancellationDepositCents: 1500,
  packageValidityMonths: 6,
} as const;

/**
 * TODO(legal-launch): Complete every blank field before publishing the legal
 * pages. The tracked launch checklist lives at docs/LEGAL_COMPLIANCE_TODO.md.
 * Keeping these values centralized prevents company and policy details from
 * drifting between the Portuguese and English pages.
 */
export const BUSINESS_DETAILS: BusinessDetails = {
  legalName: 'Iara Gouveia',
  legalForm: 'selfEmployed',
  taxId: '255649642',
  registeredAddress: ['Rua Vila do Seixal 5'],
  email: 'info@iaragouveia.com',
  privacyEmail: 'info@iaragouveia.com',
  phone: '+351 934 596 852',
  inPersonPaymentMethods: ['cash', 'mbWay', 'bankTransfer'],
  bookingRetention: 'twoYears',
  adrEntityName: 'Centro de Arbitragem de Conflitos de Consumo de Lisboa',
  adrEntityUrl: 'https://www.centroarbitragemlisboa.pt/',
};

export const COMPLAINTS_BOOK_URL = 'https://www.livroreclamacoes.pt/Inicio/';

export type BusinessDetailKey = keyof BusinessDetails;

export const REQUIRED_LEGAL_DETAIL_KEYS = [
  'legalName',
  'legalForm',
  'taxId',
  'registeredAddress',
  'email',
  'phone',
  'inPersonPaymentMethods',
] as const satisfies readonly BusinessDetailKey[];

export function isBusinessDetailMissing(key: BusinessDetailKey): boolean {
  const value = BUSINESS_DETAILS[key];
  return typeof value === 'string'
    ? value.trim().length === 0
    : value.length === 0;
}
