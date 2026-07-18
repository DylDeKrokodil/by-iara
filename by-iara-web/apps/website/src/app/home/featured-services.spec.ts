import { Service } from '../services/services-api';
import { featuredServices } from './featured-services';

describe('featuredServices', () => {
  it('includes only services explicitly marked as featured', () => {
    const featured = createService({ id: 'featured', featured: true });
    const regular = createService({ id: 'regular', featured: false });

    expect(featuredServices([regular, featured], 'pt-PT')).toEqual([featured]);
  });

  it('sorts featured services and limits the homepage selection to three', () => {
    const services = [4, 2, 1, 3].map((sortOrder) =>
      createService({ id: String(sortOrder), featured: true, sortOrder }),
    );

    expect(
      featuredServices(services, 'pt-PT').map((service) => service.id),
    ).toEqual(['1', '2', '3']);
  });
});

function createService(overrides: Partial<Service>): Service {
  return {
    id: 'service',
    slug: 'service',
    name: 'Service',
    description: null,
    active: true,
    sortOrder: 0,
    featured: false,
    translations: {
      'pt-PT': {
        slug: 'servico',
        name: 'Serviço',
        description: null,
        treatmentDescription: null,
        suitableFor: null,
        sessionDescription: null,
        faqs: [],
      },
    },
    variants: [
      {
        id: 'variant',
        durationMinutes: 60,
        price: { amountCents: 10000, currency: 'EUR' },
        active: true,
        sortOrder: 0,
      },
    ],
    ...overrides,
  };
}
