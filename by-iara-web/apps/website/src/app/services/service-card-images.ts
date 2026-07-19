export interface ServiceCardImage {
  readonly src: string;
  readonly width: number;
  readonly height: number;
}

const DEFAULT_SERVICE_CARD_IMAGE: ServiceCardImage = {
  src: 'hero/hero-treatment-mixkit-4744.jpg',
  width: 1400,
  height: 933,
};

const SERVICE_CARD_IMAGES: Readonly<Record<string, ServiceCardImage>> = {
  'massagem-relaxante': {
    src: 'services/relaxation-massage.webp',
    width: 1400,
    height: 788,
  },
  'massagem-tecidos-profundos': {
    src: 'services/deep-tissue-massage.webp',
    width: 1400,
    height: 788,
  },
  'massagem-desportiva': {
    src: 'services/sports-massage.webp',
    width: 1400,
    height: 788,
  },
  'massagem-pre-natal': {
    src: 'services/prenatal-massage.webp',
    width: 1400,
    height: 788,
  },
};

export function resolveServiceCardImage(serviceSlug: string): ServiceCardImage {
  return SERVICE_CARD_IMAGES[serviceSlug] ?? DEFAULT_SERVICE_CARD_IMAGE;
}
