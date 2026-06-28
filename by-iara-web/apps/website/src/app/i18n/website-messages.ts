import type { LocaleCode } from './supported-locales';

export interface WebsiteMessages {
  readonly app: {
    readonly nav: {
      readonly home: string;
      readonly services: string;
    };
    readonly footer: string;
  };
  readonly languageSwitcher: {
    readonly ariaLabel: string;
  };
  readonly home: {
    readonly eyebrow: string;
    readonly title: string;
    readonly lede: string;
    readonly primaryAction: string;
    readonly secondaryAction: string;
    readonly primaryActionsLabel: string;
    readonly featuredEyebrow: string;
    readonly featuredTitle: string;
    readonly featuredLede: string;
    readonly featuredBadge: string;
    readonly variantsTitle: string;
    readonly bookAction: string;
    readonly viewAllServices: string;
    readonly featuredServicesError: string;
    readonly bookingComingSoon: (
      serviceName: string,
      durationMinutes: number,
    ) => string;
  };
  readonly services: {
    readonly eyebrow: string;
    readonly title: string;
    readonly lede: string;
    readonly loadError: string;
    readonly loading: string;
    readonly empty: string;
    readonly variantsTitle: string;
    readonly bookAction: string;
    readonly bookingComingSoon: (
      serviceName: string,
      durationMinutes: number,
    ) => string;
  };
}

export const WEBSITE_MESSAGES: Record<LocaleCode, WebsiteMessages> = {
  'pt-PT': {
    app: {
      nav: {
        home: 'Início',
        services: 'Serviços',
      },
      footer: '© 2026 By Iara. Todos os direitos reservados.',
    },
    languageSwitcher: {
      ariaLabel: 'Escolher idioma',
    },
    home: {
      eyebrow: 'By Iara',
      title: 'Marcações de massagens, pensadas para crescer.',
      lede:
        'O website público usa este tema partilhado para páginas de serviços, disponibilidade e pedidos de reserva.',
      primaryAction: 'Começar reserva',
      secondaryAction: 'Ver serviços',
      primaryActionsLabel: 'Ações principais',
      featuredEyebrow: 'Destaques',
      featuredTitle: 'Tratamentos em destaque',
      featuredLede:
        'Uma seleção das experiências restauradoras preferidas dos clientes.',
      featuredBadge: 'Destaque',
      variantsTitle: 'Opções e preços',
      bookAction: 'Reservar',
      viewAllServices: 'Ver todos os serviços',
      featuredServicesError:
        'Não foi possível carregar os serviços em destaque.',
      bookingComingSoon: (serviceName, durationMinutes) =>
        `A marcação para "${serviceName}" (${durationMinutes} min) estará disponível em breve!`,
    },
    services: {
      eyebrow: 'O nosso menu',
      title: 'Serviços e tratamentos',
      lede:
        'Descubra a nossa seleção de massagens terapêuticas e relaxantes, pensadas para restaurar equilíbrio e harmonia.',
      loadError:
        'Não foi possível carregar o catálogo de serviços. Tente novamente mais tarde.',
      loading: 'A carregar o catálogo...',
      empty: 'Não existem serviços disponíveis para reserva neste momento.',
      variantsTitle: 'Opções e preços',
      bookAction: 'Reservar',
      bookingComingSoon: (serviceName, durationMinutes) =>
        `A marcação para "${serviceName}" (${durationMinutes} min) estará disponível em breve!`,
    },
  },
  'en-US': {
    app: {
      nav: {
        home: 'Home',
        services: 'Services',
      },
      footer: '© 2026 By Iara. All rights reserved.',
    },
    languageSwitcher: {
      ariaLabel: 'Choose language',
    },
    home: {
      eyebrow: 'By Iara',
      title: 'Massage bookings, built with room to grow.',
      lede:
        'The public website will use this shared theme for service pages, availability, and reservation requests.',
      primaryAction: 'Start booking',
      secondaryAction: 'View services',
      primaryActionsLabel: 'Primary actions',
      featuredEyebrow: 'Highlights',
      featuredTitle: 'Featured treatments',
      featuredLede:
        'A selection of our client-favorite restorative experiences.',
      featuredBadge: 'Featured',
      variantsTitle: 'Options and prices',
      bookAction: 'Book',
      viewAllServices: 'View all services',
      featuredServicesError: 'Could not load featured services.',
      bookingComingSoon: (serviceName, durationMinutes) =>
        `Booking for "${serviceName}" (${durationMinutes} min) is coming soon!`,
    },
    services: {
      eyebrow: 'Our menu',
      title: 'Services and treatments',
      lede:
        'Discover our range of therapeutic and relaxing massages designed to restore balance and harmony.',
      loadError:
        'Could not load the services catalog. Please try again later.',
      loading: 'Loading our catalog...',
      empty: 'No services are currently available for booking.',
      variantsTitle: 'Options and prices',
      bookAction: 'Book',
      bookingComingSoon: (serviceName, durationMinutes) =>
        `Booking for "${serviceName}" (${durationMinutes} min) is coming soon!`,
    },
  },
};
