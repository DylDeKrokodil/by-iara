export interface BusinessDetails {
  readonly legalName: string;
  readonly legalForm: string;
  readonly taxId: string;
  readonly registeredAddress: readonly string[];
  readonly email: string;
  readonly privacyEmail: string;
  readonly phone: string;
  readonly commercialRegistry: string;
  readonly registrationNumber: string;
  readonly shareCapital: string;
  readonly inPersonPaymentMethods: readonly InPersonPaymentMethod[];
  readonly bookingRetention: string;
  readonly adrEntityName: string;
  readonly adrEntityUrl: string;
}

export type InPersonPaymentMethod = 'cash' | 'mbWay' | 'bankTransfer';

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
  legalName: '',
  legalForm: '',
  taxId: '',
  registeredAddress: [],
  email: '',
  privacyEmail: '',
  phone: '',
  commercialRegistry: '',
  registrationNumber: '',
  shareCapital: '',
  inPersonPaymentMethods: ['cash', 'mbWay', 'bankTransfer'],
  bookingRetention: '',
  adrEntityName: '',
  adrEntityUrl: '',
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
  'bookingRetention',
] as const satisfies readonly BusinessDetailKey[];

export function isBusinessDetailMissing(key: BusinessDetailKey): boolean {
  const value = BUSINESS_DETAILS[key];
  return typeof value === 'string'
    ? value.trim().length === 0
    : value.length === 0;
}
