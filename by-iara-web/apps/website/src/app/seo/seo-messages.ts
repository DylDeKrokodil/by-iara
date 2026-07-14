import type { LocaleCode } from '../i18n/supported-locales';

export type StaticSeoPage = 'home' | 'services' | 'book';

interface SeoCopy {
  readonly title: string;
  readonly description: string;
}

export const SEO_MESSAGES: Record<
  LocaleCode,
  Record<StaticSeoPage, SeoCopy> & { readonly notFound: SeoCopy }
> = {
  'pt-PT': {
    home: {
      title: 'Massagem terapêutica em Almada | By Iara',
      description:
        'Massagens terapêuticas e relaxantes em Almada, num estúdio tranquilo com atendimento individual e marcação online.',
    },
    services: {
      title: 'Massagens e tratamentos em Almada | By Iara',
      description:
        'Conheça os tratamentos, durações e preços disponíveis no estúdio By Iara em Almada.',
    },
    book: {
      title: 'Marcar uma sessão | By Iara',
      description:
        'Escolha o tratamento e marque a sua sessão de massagem no estúdio By Iara em Almada.',
    },
    notFound: {
      title: 'Página não encontrada | By Iara',
      description: 'A página ou o serviço que procura não está disponível.',
    },
  },
  'en-US': {
    home: {
      title: 'Therapeutic massage in Almada | By Iara',
      description:
        'Therapeutic and relaxing massage in Almada, in a calm private studio with individual care and online booking.',
    },
    services: {
      title: 'Massage treatments in Almada | By Iara',
      description:
        'Explore the treatments, durations, and prices available at the By Iara studio in Almada.',
    },
    book: {
      title: 'Book a massage session | By Iara',
      description:
        'Choose a treatment and book your massage session at the By Iara studio in Almada.',
    },
    notFound: {
      title: 'Page not found | By Iara',
      description: 'The page or service you requested is unavailable.',
    },
  },
};
