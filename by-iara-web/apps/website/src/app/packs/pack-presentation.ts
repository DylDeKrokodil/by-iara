import type {
  PackOffer,
  Service,
  ServiceVariant,
} from '../services/services-api';

export interface PackPresentation {
  readonly service: Service;
  readonly offer: PackOffer;
  readonly variant: ServiceVariant;
  readonly regularTotalCents: number;
  readonly savingCents: number;
  readonly perSessionCents: number;
}

export function packPresentations(
  services: readonly Service[],
): PackPresentation[] {
  return services.flatMap((service) =>
    [...(service.packOffers ?? [])]
      .filter((offer) => offer.active)
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .flatMap((offer) => {
        const variant = service.variants.find(
          (candidate) =>
            candidate.active &&
            candidate.durationMinutes === offer.durationMinutes,
        );
        if (!variant || offer.sessionCount < 1) return [];

        const regularTotalCents =
          variant.price.amountCents * offer.sessionCount;
        return [
          {
            service,
            offer,
            variant,
            regularTotalCents,
            savingCents: Math.max(
              0,
              regularTotalCents - offer.price.amountCents,
            ),
            perSessionCents: Math.round(
              offer.price.amountCents / offer.sessionCount,
            ),
          },
        ];
      }),
  );
}

export function servicePackPresentations(service: Service): PackPresentation[] {
  return packPresentations([service]);
}
