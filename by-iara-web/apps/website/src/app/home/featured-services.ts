import { Service } from '../services/services-api';

const FEATURED_SERVICE_LIMIT = 3;

export function featuredServices(
  services: ReadonlyArray<Service>,
  locale: string,
): Service[] {
  return services
    .filter(
      (service) =>
        service.featured &&
        Boolean(service.translations[locale]) &&
        service.variants.some((variant) => variant.active),
    )
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .slice(0, FEATURED_SERVICE_LIMIT);
}
