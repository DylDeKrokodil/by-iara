export interface Money {
  amountCents: number;
  currency: string;
}

export interface ServiceVariant {
  id: string;
  durationMinutes: number;
  price: Money;
  active: boolean;
  sortOrder: number;
}

export interface PackOffer {
  id: string;
  durationMinutes: number;
  sessionCount: number;
  price: Money;
  validityDays: number | null;
  active: boolean;
  sortOrder: number;
}

export type ServiceLocale = 'pt-PT' | 'en-US';

export interface ServiceFaq {
  question: string;
  answer: string;
}

export interface ServiceTranslation {
  slug: string;
  name: string;
  description: string | null;
  treatmentDescription: string | null;
  suitableFor: string | null;
  sessionDescription: string | null;
  faqs: ServiceFaq[];
}

export type ServiceTranslationInput = Pick<
  ServiceTranslation,
  | 'name'
  | 'description'
  | 'treatmentDescription'
  | 'suitableFor'
  | 'sessionDescription'
  | 'faqs'
> & {
  slug?: string;
};

export interface Service {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  active: boolean;
  sortOrder: number;
  featured: boolean;
  translations?: Partial<Record<ServiceLocale, ServiceTranslation>>;
  variants: ServiceVariant[];
  packOffers: PackOffer[];
}

export interface VariantInput {
  durationMinutes: number;
  priceCents: number;
  active?: boolean;
  sortOrder?: number;
}

export interface PackOfferInput {
  durationMinutes: number;
  sessionCount: number;
  priceCents: number;
  validityDays?: number | null;
  active?: boolean;
  sortOrder?: number;
}

export interface ServiceInput {
  name: string;
  description?: string | null;
  active?: boolean;
  sortOrder?: number;
  featured?: boolean;
  translations: {
    'pt-PT': ServiceTranslationInput;
    'en-US'?: ServiceTranslationInput;
  };
  variants: VariantInput[];
  packOffers: PackOfferInput[];
}

export type ServiceSort = 'DISPLAY_ORDER' | 'NAME' | 'DURATION' | 'PRICE';
export type SortDirection = 'ASC' | 'DESC';

export interface ServiceListParams {
  active?: boolean;
  query?: string;
  sort?: ServiceSort;
  direction?: SortDirection;
}

export function formatMoney(money: Money): string {
  return new Intl.NumberFormat('nl-NL', {
    style: 'currency',
    currency: money.currency,
  }).format(money.amountCents / 100);
}
