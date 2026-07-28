import type { LocaleCode } from '../i18n/supported-locales';
import { BRAND } from '../brand/brand';

export type StaticSeoPage =
  | 'home'
  | 'services'
  | 'packs'
  | 'book'
  | 'privacy'
  | 'bookingTerms'
  | 'legalNotice';

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
      title: `Massagens em Almada | ${BRAND.name}`,
      description: `Conheça as massagens, durações e preços disponíveis no estúdio ${BRAND.name} em Almada.`,
    },
    packs: {
      title: `Packs de massagem em Almada | ${BRAND.name}`,
      description:
        'Poupe ao reservar várias sessões de massagem em Almada. Compare os packs disponíveis, o valor por sessão e a validade.',
    },
    book: {
      title: `Marcar uma sessão | ${BRAND.name}`,
      description: `Escolha o tratamento e marque a sua sessão de massagem no estúdio ${BRAND.name} em Almada.`,
    },
    privacy: {
      title: `Política de privacidade | ${BRAND.name}`,
      description:
        'Informação sobre o tratamento de dados pessoais em pedidos de marcação e na utilização do website.',
    },
    bookingTerms: {
      title: `Termos de marcação | ${BRAND.name}`,
      description:
        'Condições dos pedidos, confirmações, pagamentos presenciais, cancelamentos e reagendamentos.',
    },
    legalNotice: {
      title: `Informação legal | ${BRAND.name}`,
      description:
        'Identificação legal, contactos e informação ao consumidor do prestador do serviço.',
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
      title: `Massages in Almada | ${BRAND.name}`,
      description: `Explore the massages, durations, and prices available at the ${BRAND.name} studio in Almada.`,
    },
    packs: {
      title: `Massage session packs in Almada | ${BRAND.name}`,
      description:
        'Save when you reserve several massage sessions in Almada. Compare available packs, the price per session, and validity.',
    },
    book: {
      title: `Book a massage session | ${BRAND.name}`,
      description: `Choose a treatment and book your massage session at the ${BRAND.name} studio in Almada.`,
    },
    privacy: {
      title: `Privacy policy | ${BRAND.name}`,
      description:
        'How personal data is handled when booking an appointment or using this website.',
    },
    bookingTerms: {
      title: `Booking terms | ${BRAND.name}`,
      description:
        'Terms for booking requests, confirmations, in-person payments, cancellations, and rescheduling.',
    },
    legalNotice: {
      title: `Legal information | ${BRAND.name}`,
      description:
        'Legal identity, contact, and consumer information for the service provider.',
    },
    notFound: {
      title: `Page not found | ${BRAND.name}`,
      description: 'The page or service you requested is unavailable.',
    },
  },
};
