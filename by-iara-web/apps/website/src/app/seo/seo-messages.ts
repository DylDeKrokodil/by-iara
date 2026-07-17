import type { LocaleCode } from '../i18n/supported-locales';
import { BRAND } from '../brand/brand';

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
      title: `Massagem terapêutica em Almada | ${BRAND.name}`,
      description:
        'Massagens terapêuticas e relaxantes em Almada, num estúdio tranquilo com atendimento individual e marcação online.',
    },
    services: {
      title: `Massagens e tratamentos em Almada | ${BRAND.name}`,
      description:
        `Conheça os tratamentos, durações e preços disponíveis no estúdio ${BRAND.name} em Almada.`,
    },
    book: {
      title: `Marcar uma sessão | ${BRAND.name}`,
      description:
        `Escolha o tratamento e marque a sua sessão de massagem no estúdio ${BRAND.name} em Almada.`,
    },
    notFound: {
      title: `Página não encontrada | ${BRAND.name}`,
      description: 'A página ou o serviço que procura não está disponível.',
    },
  },
  'en-US': {
    home: {
      title: `Therapeutic massage in Almada | ${BRAND.name}`,
      description:
        'Therapeutic and relaxing massage in Almada, in a calm private studio with individual care and online booking.',
    },
    services: {
      title: `Massage treatments in Almada | ${BRAND.name}`,
      description:
        `Explore the treatments, durations, and prices available at the ${BRAND.name} studio in Almada.`,
    },
    book: {
      title: `Book a massage session | ${BRAND.name}`,
      description:
        `Choose a treatment and book your massage session at the ${BRAND.name} studio in Almada.`,
    },
    notFound: {
      title: `Page not found | ${BRAND.name}`,
      description: 'The page or service you requested is unavailable.',
    },
  },
};
