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

export type ServiceLocale = 'pt-PT' | 'en-US';

export interface ServiceTranslation {
  slug: string;
  name: string;
  description: string | null;
}

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
}

export interface VariantInput {
  durationMinutes: number;
  priceCents: number;
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
    'pt-PT': Pick<ServiceTranslation, 'name' | 'description'>;
    'en-US'?: Pick<ServiceTranslation, 'name' | 'description'>;
  };
  variants: VariantInput[];
}

export function formatMoney(money: Money): string {
  return new Intl.NumberFormat('nl-NL', {
    style: 'currency',
    currency: money.currency,
  }).format(money.amountCents / 100);
}
