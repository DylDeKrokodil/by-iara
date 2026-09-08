interface PromotionEligibility {
  firstTimeCustomersOnly?: boolean;
  maxUsesPerCustomer?: number | null;
}

const messages = {
  en: {
    firstTime: 'First-time customers only.',
    once: 'Once per customer.',
    check: 'Eligibility checked using your email during booking.',
    checking: 'Checking your booking price…',
    failed:
      'We could not check your price. Please try again before continuing.',
    unavailable:
      'The advertised offer is unavailable for this booking. Your eligible price is shown below.',
    changed:
      'Your booking price has changed. Please review the updated price before submitting again.',
    retry: 'Check price again',
    off: 'off',
    book: 'Book a session',
  },
  pt: {
    firstTime: 'Apenas para novos clientes.',
    once: 'Uma utilização por cliente.',
    check: 'Elegibilidade verificada através do seu email durante a marcação.',
    checking: 'A verificar o preço da sua marcação…',
    failed:
      'Não foi possível verificar o preço. Tente novamente antes de continuar.',
    unavailable:
      'A oferta apresentada não está disponível para esta marcação. O seu preço elegível está indicado abaixo.',
    changed:
      'O preço da sua marcação mudou. Reveja o preço atualizado antes de enviar novamente.',
    retry: 'Verificar preço novamente',
    off: 'de desconto',
    book: 'Marcar sessão',
  },
};

export function promotionMessages(locale: 'pt' | 'en') {
  return messages[locale];
}

export function promotionDisclaimer(
  promotion: PromotionEligibility | undefined,
  locale: 'pt' | 'en',
): string {
  if (!promotion) return '';
  const copy = messages[locale];
  const rules = [
    promotion.firstTimeCustomersOnly ? copy.firstTime : '',
    promotion.maxUsesPerCustomer === 1 ? copy.once : '',
  ].filter(Boolean);
  return rules.length ? [...rules, copy.check].join(' ') : '';
}
