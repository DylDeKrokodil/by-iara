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

export interface Service {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  active: boolean;
  sortOrder: number;
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
  variants: VariantInput[];
}

export function formatMoney(money: Money): string {
  return new Intl.NumberFormat('nl-NL', {
    style: 'currency',
    currency: money.currency,
  }).format(money.amountCents / 100);
}
