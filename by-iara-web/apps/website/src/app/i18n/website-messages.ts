import type { LocaleCode } from './supported-locales';
import { BRAND } from '../brand/brand';

export interface WebsiteMessages {
  readonly app: {
    readonly nav: {
      readonly home: string;
      readonly services: string;
      readonly packs: string;
      readonly bookCta: string;
      readonly openMenu: string;
      readonly closeMenu: string;
    };
    readonly footer: {
      readonly tagline: string;
      readonly navigationLabel: string;
      readonly explore: string;
      readonly home: string;
      readonly services: string;
      readonly packs: string;
      readonly book: string;
      readonly legal: string;
      readonly privacy: string;
      readonly bookingTerms: string;
      readonly legalNotice: string;
      readonly complaintsBook: string;
      readonly opensNewWindow: string;
      readonly visit: string;
      readonly location: string;
      readonly availability: string;
      readonly contact: string;
      readonly emailLabel: string;
      readonly phoneLabel: string;
      readonly social: string;
      readonly socialNavigationLabel: string;
      readonly bookingPrompt: string;
      readonly bookingAction: string;
      readonly copyright: (year: number) => string;
    };
  };
  readonly languageSwitcher: {
    readonly ariaLabel: string;
  };
  readonly home: {
    readonly location: string;
    readonly title: string;
    readonly lede: string;
    readonly primaryAction: string;
    readonly secondaryAction: string;
    readonly actionsLabel: string;
    readonly today: string;
    readonly nextAvailable: (day: string, time: string) => string;
    readonly mediaCredit: string;
    readonly servicesTitle: string;
    readonly servicesLede: string;
    readonly servicesFrom: (price: string) => string;
    readonly servicesDuration: (min: number, max: number) => string;
    readonly servicesAction: string;
    readonly servicesViewAll: string;
    readonly packsTitle: string;
    readonly packsLede: string;
    readonly packsExample: (sessions: number, minutes: number) => string;
    readonly packsPerSession: (price: string) => string;
    readonly packsSaving: (price: string) => string;
    readonly packsAction: string;
    readonly expectTitle: string;
    readonly expectSteps: ReadonlyArray<{
      readonly title: string;
      readonly text: string;
    }>;
    readonly aboutTitle: string;
    readonly aboutParagraphs: readonly string[];
    readonly visitTitle: string;
    readonly visitAddressTitle: string;
    readonly visitAddressText: string;
    readonly visitHoursTitle: string;
    readonly visitHoursText: string;
    readonly closingTitle: string;
    readonly closingText: string;
    readonly closingAction: string;
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
    readonly packsAvailable: string;
  };
  readonly serviceDetail: {
    readonly breadcrumbsLabel: string;
    readonly homeBreadcrumb: string;
    readonly servicesBreadcrumb: string;
    readonly back: string;
    readonly eyebrow: string;
    readonly treatmentTitle: string;
    readonly suitableForTitle: string;
    readonly sessionTitle: string;
    readonly optionsTitle: string;
    readonly locationTitle: string;
    readonly locationText: string;
    readonly faqTitle: string;
    readonly book: string;
    readonly packsTitle: string;
    readonly packsLede: string;
    readonly packSessions: (sessions: number, minutes: number) => string;
    readonly packPerSession: (price: string) => string;
    readonly packSaving: (price: string) => string;
    readonly packValidity: (days: number) => string;
    readonly packBook: string;
    readonly notFoundTitle: string;
    readonly notFoundText: string;
  };
  readonly packs: {
    readonly eyebrow: string;
    readonly title: string;
    readonly lede: string;
    readonly loading: string;
    readonly loadError: string;
    readonly emptyTitle: string;
    readonly emptyText: string;
    readonly exploreServices: string;
    readonly offerSessions: (sessions: number, minutes: number) => string;
    readonly regularValue: (price: string) => string;
    readonly totalPrice: string;
    readonly perSession: (price: string) => string;
    readonly saving: (price: string) => string;
    readonly validity: (days: number) => string;
    readonly book: string;
    readonly howTitle: string;
    readonly steps: ReadonlyArray<{
      readonly title: string;
      readonly text: string;
    }>;
    readonly termsTitle: string;
    readonly terms: readonly string[];
  };
  readonly booking: {
    readonly eyebrow: string;
    readonly back: string;
    readonly loading: string;
    readonly loadError: string;
    readonly noServices: string;
    readonly pageTitle: string;
    readonly bookingSteps: string;
    readonly serviceStep: string;
    readonly timeStep: string;
    readonly detailsStep: string;
    readonly reviewStep: string;
    readonly chooseService: string;
    readonly chooseOption: string;
    readonly paymentChoice: string;
    readonly singleSession: string;
    readonly buyPackLabel: (
      sessions: number,
      minutes: number,
      price: string,
    ) => string;
    readonly usePackLabel: (remaining: number) => string;
    readonly alreadyHavePack: string;
    readonly packAccessHelp: string;
    readonly packConnected: string;
    readonly emailPackLink: string;
    readonly sendingPackLink: string;
    readonly packLinkSent: string;
    readonly packAccessError: string;
    readonly chooseDate: string;
    readonly chooseSlot: string;
    readonly periodMorning: string;
    readonly periodAfternoon: string;
    readonly periodEvening: string;
    readonly slotsLoading: string;
    readonly slotsErrorTitle: string;
    readonly slotsError: string;
    readonly retryAvailability: string;
    readonly calendarPreviousMonth: string;
    readonly calendarNextMonth: string;
    readonly calendarPrevious: string;
    readonly calendarNext: string;
    readonly calendarAvailable: string;
    readonly calendarUnavailable: string;
    readonly noAvailabilityInMonth: (month: string) => string;
    readonly noAvailabilityInMonthHelp: string;
    readonly chooseAnotherTreatment: string;
    readonly contactByEmail: string;
    readonly contactByPhone: (phone: string) => string;
    readonly yourDetails: string;
    readonly name: string;
    readonly email: string;
    readonly phone: string;
    readonly notes: string;
    readonly optional: string;
    readonly required: string;
    readonly invalidEmail: string;
    readonly selectSlotFirst: string;
    readonly previous: string;
    readonly next: string;
    readonly reviewBooking: string;
    readonly summary: string;
    readonly notSelected: string;
    readonly submit: string;
    readonly submitting: string;
    readonly submitError: string;
    readonly slotTakenError: string;
    readonly discountCode: string;
    readonly discountHelp: string;
    readonly applyDiscount: string;
    readonly applyingDiscount: string;
    readonly discountApplied: string;
    readonly removeDiscount: string;
    readonly discountUnavailable: string;
    readonly discountNeedsEmail: string;
    readonly originalPrice: string;
    readonly discount: string;
    readonly totalPrice: string;
    readonly confirmedTitle: string;
    readonly confirmedLede: (name: string) => string;
    readonly confirmedService: string;
    readonly confirmedWhen: string;
    readonly pendingNote: string;
    readonly bookAnother: string;
    readonly paymentNotice: string;
    readonly dataUseNotice: string;
    readonly privacyLink: string;
    readonly termsNotice: string;
    readonly termsLink: string;
  };
}

export const WEBSITE_MESSAGES: Record<LocaleCode, WebsiteMessages> = {
  'pt-PT': {
    app: {
      nav: {
        home: 'Início',
        services: 'Serviços',
        packs: 'Packs',
        bookCta: 'Marcar agora',
        openMenu: 'Abrir menu',
        closeMenu: 'Fechar menu',
      },
      footer: {
        tagline:
          'Massagem terapêutica e relaxante, com tempo, cuidado e atenção inteira.',
        navigationLabel: 'Navegação do rodapé',
        explore: 'Explorar',
        home: 'Início',
        services: 'Serviços',
        packs: 'Packs',
        book: 'Marcar sessão',
        legal: 'Legal',
        privacy: 'Privacidade',
        bookingTerms: 'Termos de marcação',
        legalNotice: 'Informação legal',
        complaintsBook: 'Livro de Reclamações',
        opensNewWindow: 'abre numa nova janela',
        visit: 'Visitar',
        location: 'Almada, Portugal',
        availability: 'Atendimento apenas por marcação',
        contact: 'Contacto',
        emailLabel: 'Email',
        phoneLabel: 'Telemóvel',
        social: 'Redes sociais',
        socialNavigationLabel: 'Redes sociais',
        bookingPrompt: 'O seu momento de pausa começa aqui.',
        bookingAction: 'Ver horários',
        copyright: (year) =>
          `© ${year} ${BRAND.name}. Todos os direitos reservados.`,
      },
    },
    languageSwitcher: {
      ariaLabel: 'Escolher idioma',
    },
    home: {
      location: BRAND.name,
      title: 'Massagem terapêutica em Almada',
      lede: 'Um espaço de pausa para reservar com calma, chegar com confiança e sair com o corpo mais leve.',
      primaryAction: 'Marcar sessão',
      secondaryAction: 'Explorar serviços',
      actionsLabel: 'Ações da página inicial',
      today: 'hoje',
      nextAvailable: (day, time) => `Próxima vaga: ${day}, ${time}`,
      mediaCredit: 'Vídeo via Mixkit',
      servicesTitle: 'Tratamentos',
      servicesLede:
        'Do alívio profundo ao puro relaxamento, escolha o ritmo do seu corpo.',
      servicesFrom: (price) => `desde ${price}`,
      servicesDuration: (min, max) =>
        min === max ? `${min} min` : `${min} a ${max} min`,
      servicesAction: 'Reservar',
      servicesViewAll: 'Ver todos os serviços',
      packsTitle: 'Mais tempo para cuidar de si',
      packsLede:
        'Escolha um pack para manter a sua rotina de bem-estar e beneficiar de um valor mais leve por sessão.',
      packsExample: (sessions, minutes) =>
        `${sessions} sessões de ${minutes} min`,
      packsPerSession: (price) => `${price} por sessão`,
      packsSaving: (price) => `Poupe ${price}`,
      packsAction: 'Descobrir os packs',
      expectTitle: 'O que esperar',
      expectSteps: [
        {
          title: 'Marque a sua sessão',
          text: 'Escolha a massagem e o horário que melhor se adaptam à sua agenda. A marcação é rápida e simples.',
        },
        {
          title: 'Boas-vindas',
          text: 'Será recebido num ambiente calmo e relaxante. Recomendamos que chegue alguns minutos mais cedo para se instalar com tranquilidade.',
        },
        {
          title: 'A sua massagem',
          text: 'Antes de começar, reservamos um momento para compreender as suas necessidades e adaptar a massagem a si.',
        },
        {
          title: 'Depois da sessão',
          text: 'Antes de sair, aproveite o tempo de que precisar. Se necessário, receberá algumas recomendações para ajudar a prolongar os benefícios da sua massagem.',
        },
      ],
      aboutTitle: 'Olá, sou a Iara!',
      aboutParagraphs: [
        'Sou estudante do quarto ano de Fisioterapia, com um forte interesse pela saúde, pelo bem-estar e pela reabilitação física.',
        'Acredito que todas as pessoas merecem um momento para cuidar de si. É por isso que ofereço tratamentos de massagem personalizados num ambiente calmo e acolhedor, onde cada cliente pode relaxar, aliviar tensões e sentir-se no seu melhor.',
        'Estou constantemente a aprender e a desenvolver as minhas competências para prestar um serviço de alta qualidade, com dedicação, cuidado e atenção aos detalhes. Espero proporcionar a cada cliente um momento de bem-estar em cada sessão.',
      ],
      visitTitle: 'Em Almada, à sua espera',
      visitAddressTitle: 'Onde',
      visitAddressText:
        'As sessões decorrem num espaço calmo e relaxante em Almada. A morada exata é partilhada na confirmação da sua marcação.',
      visitHoursTitle: 'Quando',
      visitHoursText:
        'As sessões são sempre com marcação prévia. Veja os horários livres ao reservar.',
      closingTitle: 'Reserve o seu momento de pausa',
      closingText:
        'O primeiro passo para um corpo mais leve demora menos de um minuto.',
      closingAction: 'Marcar sessão',
    },
    services: {
      eyebrow: 'O nosso menu',
      title: 'Serviços e tratamentos',
      lede: 'Descubra a nossa seleção de massagens terapêuticas e relaxantes, pensadas para restaurar equilíbrio e harmonia.',
      loadError:
        'Não foi possível carregar o catálogo de serviços. Tente novamente mais tarde.',
      loading: 'A carregar o catálogo...',
      empty: 'Não existem serviços disponíveis para reserva neste momento.',
      variantsTitle: 'Opções e preços',
      bookAction: 'Reservar',
      packsAvailable: 'Packs de sessões disponíveis',
    },
    serviceDetail: {
      breadcrumbsLabel: 'Navegação estrutural',
      homeBreadcrumb: 'Início',
      servicesBreadcrumb: 'Serviços',
      back: 'Voltar aos serviços',
      eyebrow: 'Tratamento',
      treatmentTitle: 'Sobre este tratamento',
      suitableForTitle: 'Para quem é indicado?',
      sessionTitle: 'O que acontece durante a sessão?',
      optionsTitle: 'Duração e preço',
      locationTitle: 'Onde decorre',
      locationText:
        'A sessão decorre num espaço calmo e relaxante em Almada. A morada exata é partilhada na confirmação da marcação.',
      faqTitle: 'Perguntas frequentes',
      book: 'Marcar',
      packsTitle: 'Transforme esta pausa numa rotina',
      packsLede:
        'Reserve a primeira sessão agora e pague o valor total do pack depois dessa sessão.',
      packSessions: (sessions, minutes) => `${sessions} × ${minutes} min`,
      packPerSession: (price) => `${price} por sessão`,
      packSaving: (price) => `Poupe ${price}`,
      packValidity: (days) => `Válido durante ${days} dias`,
      packBook: 'Escolher este pack',
      notFoundTitle: 'Serviço não encontrado',
      notFoundText:
        'Este serviço não está disponível neste idioma ou deixou de estar publicado.',
    },
    packs: {
      eyebrow: 'Continuidade e cuidado',
      title: 'Packs para fazer da pausa um hábito',
      lede: 'Reserve várias sessões do mesmo tratamento por um valor especial. A primeira marcação é feita já; o pack completo é pago depois dessa sessão.',
      loading: 'A carregar os packs disponíveis...',
      loadError: 'Não foi possível carregar os packs. Tente novamente.',
      emptyTitle: 'Ainda não existem packs disponíveis',
      emptyText:
        'Pode continuar a marcar sessões individuais ou voltar mais tarde para conhecer novas opções.',
      exploreServices: 'Explorar serviços',
      offerSessions: (sessions, minutes) =>
        `${sessions} sessões · ${minutes} min`,
      regularValue: (price) => `Valor em sessões individuais: ${price}`,
      totalPrice: 'Valor do pack',
      perSession: (price) => `${price} por sessão`,
      saving: (price) => `Poupe ${price}`,
      validity: (days) => `Utilize em até ${days} dias`,
      book: 'Marcar primeira sessão',
      howTitle: 'Como funciona',
      steps: [
        {
          title: 'Escolha o pack',
          text: 'Compare as opções por tratamento, duração e número de sessões.',
        },
        {
          title: 'Marque a primeira sessão',
          text: 'Escolha uma data e envie o pedido de reserva como habitualmente.',
        },
        {
          title: 'Pague e continue por email',
          text: 'Depois da primeira sessão, paga o pack completo. Para as seguintes, recebe um link seguro no email usado na compra.',
        },
      ],
      termsTitle: 'Antes de escolher',
      terms: [
        'Cada pack pertence a um tratamento e duração específicos.',
        'Quando aplicável, a validade começa na data da primeira sessão e aparece em cada opção.',
        'Cancelamentos e reagendamentos seguem os termos de marcação.',
      ],
    },
    booking: {
      eyebrow: 'Reserva',
      back: 'Voltar ao início',
      loading: 'A carregar...',
      loadError: 'Não foi possível carregar os serviços. Tente novamente.',
      noServices:
        'Não existem serviços disponíveis para reserva neste momento.',
      pageTitle: 'Marcar uma sessão',
      bookingSteps: 'Passos da reserva',
      serviceStep: 'Serviço',
      timeStep: 'Data e hora',
      detailsStep: 'Dados',
      reviewStep: 'Revisão',
      chooseService: 'Escolha o serviço',
      chooseOption: 'Escolha uma opção',
      paymentChoice: 'Como pretende reservar?',
      singleSession: 'Sessão individual',
      buyPackLabel: (sessions, minutes, price) =>
        `Comprar pack de ${sessions} × ${minutes} min · ${price}`,
      usePackLabel: (remaining) =>
        `Usar o meu pack · ${remaining} ${remaining === 1 ? 'sessão restante' : 'sessões restantes'}`,
      alreadyHavePack: 'Já tem um pack?',
      packAccessHelp:
        'Introduza o email usado na compra e enviaremos um link seguro para aceder às suas sessões.',
      packConnected: 'O seu pack está ligado a este pedido de reserva.',
      emailPackLink: 'Enviar link seguro por email',
      sendingPackLink: 'A enviar...',
      packLinkSent:
        'Se existir um pack ativo para este email, receberá um link dentro de momentos.',
      packAccessError: 'Não foi possível enviar o link. Tente novamente.',
      chooseDate: 'Escolha uma data',
      chooseSlot: 'Escolha um horário',
      periodMorning: 'Manhã',
      periodAfternoon: 'Tarde',
      periodEvening: 'Noite',
      slotsLoading: 'A carregar horários...',
      slotsErrorTitle: 'Não foi possível consultar os horários',
      slotsError:
        'A ligação pode ter falhado. Tente novamente ou escolha outro tratamento.',
      retryAvailability: 'Tentar novamente',
      calendarPreviousMonth: 'Ver mês anterior',
      calendarNextMonth: 'Ver mês seguinte',
      calendarPrevious: 'Anterior',
      calendarNext: 'Seguinte',
      calendarAvailable: 'Disponível',
      calendarUnavailable: 'Indisponível',
      noAvailabilityInMonth: (month) => `Sem disponibilidade em ${month}`,
      noAvailabilityInMonthHelp:
        'Consulte o mês seguinte ou contacte a Iara diretamente.',
      chooseAnotherTreatment: 'Escolher outro tratamento',
      contactByEmail: 'Enviar email',
      contactByPhone: (phone) => `Ligar para ${phone}`,
      yourDetails: 'Os seus dados',
      name: 'Nome',
      email: 'Email',
      phone: 'Telefone',
      notes: 'Notas logísticas (não inclua dados de saúde)',
      optional: '(opcional)',
      required: 'Obrigatório',
      invalidEmail: 'Introduza um email válido',
      selectSlotFirst: 'Escolha primeiro um horário.',
      previous: 'Voltar',
      next: 'Continuar',
      reviewBooking: 'Rever reserva',
      summary: 'Resumo',
      notSelected: 'Por escolher',
      submit: 'Pedir reserva',
      submitting: 'A enviar...',
      submitError: 'Ocorreu um erro. Tente novamente.',
      slotTakenError: 'Esse horário já não está disponível. Escolha outro.',
      discountCode: 'Código de desconto',
      discountHelp:
        'Introduza o código para ver o desconto antes de pedir a reserva.',
      applyDiscount: 'Aplicar',
      applyingDiscount: 'A aplicar...',
      discountApplied: 'Desconto aplicado',
      removeDiscount: 'Remover',
      discountUnavailable:
        'Este código de desconto é inválido ou não está disponível.',
      discountNeedsEmail: 'Introduza um email válido para aplicar o desconto.',
      originalPrice: 'Preço original',
      discount: 'Desconto',
      totalPrice: 'Total',
      confirmedTitle: 'Reserva pedida!',
      confirmedLede: (name) =>
        `Obrigado, ${name}. Confirmaremos a sua marcação por email em breve.`,
      confirmedService: 'Serviço',
      confirmedWhen: 'Quando',
      pendingNote: 'O seu pedido está pendente de confirmação.',
      bookAnother: 'Fazer outra reserva',
      paymentNotice:
        'Não é feito qualquer pagamento online. O pagamento é presencial por numerário, MB WAY ou transferência bancária.',
      dataUseNotice:
        'Utilizamos os seus dados apenas para tratar e comunicar sobre este pedido.',
      privacyLink: 'Política de privacidade',
      termsNotice: 'Ao pedir a reserva, confirma que leu os',
      termsLink: 'Termos de marcação',
    },
  },
  'en-US': {
    app: {
      nav: {
        home: 'Home',
        services: 'Services',
        packs: 'Packs',
        bookCta: 'Book now',
        openMenu: 'Open menu',
        closeMenu: 'Close menu',
      },
      footer: {
        tagline:
          'Therapeutic and relaxing massage, with time, care, and full attention.',
        navigationLabel: 'Footer navigation',
        explore: 'Explore',
        home: 'Home',
        services: 'Services',
        packs: 'Packs',
        book: 'Book a session',
        legal: 'Legal',
        privacy: 'Privacy',
        bookingTerms: 'Booking terms',
        legalNotice: 'Legal information',
        complaintsBook: 'Complaints Book',
        opensNewWindow: 'opens in a new window',
        visit: 'Visit',
        location: 'Almada, Portugal',
        availability: 'By appointment only',
        contact: 'Contact',
        emailLabel: 'Email',
        phoneLabel: 'Mobile',
        social: 'Social',
        socialNavigationLabel: 'Social media',
        bookingPrompt: 'Your moment of pause starts here.',
        bookingAction: 'See availability',
        copyright: (year) => `© ${year} ${BRAND.name}. All rights reserved.`,
      },
    },
    languageSwitcher: {
      ariaLabel: 'Choose language',
    },
    home: {
      location: BRAND.name,
      title: 'Therapeutic massage in Almada',
      lede: 'A place to pause, book calmly, arrive with trust, and leave with your body feeling lighter.',
      primaryAction: 'Book a session',
      secondaryAction: 'Explore services',
      actionsLabel: 'Home page actions',
      today: 'today',
      nextAvailable: (day, time) => `Next opening: ${day}, ${time}`,
      mediaCredit: 'Video via Mixkit',
      servicesTitle: 'Treatments',
      servicesLede:
        "From deep relief to pure relaxation, choose your body's pace.",
      servicesFrom: (price) => `from ${price}`,
      servicesDuration: (min, max) =>
        min === max ? `${min} min` : `${min} to ${max} min`,
      servicesAction: 'Book',
      servicesViewAll: 'See all services',
      packsTitle: 'More time to care for yourself',
      packsLede:
        'Choose a pack to make wellbeing part of your routine, with a gentler price for each session.',
      packsExample: (sessions, minutes) =>
        `${sessions} × ${minutes} min sessions`,
      packsPerSession: (price) => `${price} per session`,
      packsSaving: (price) => `Save ${price}`,
      packsAction: 'Discover session packs',
      expectTitle: 'What to expect',
      expectSteps: [
        {
          title: 'Book your session',
          text: 'Choose the massage and time that best suits your schedule. Booking is quick and easy.',
        },
        {
          title: 'Welcome',
          text: "You'll be welcomed into a calm and relaxing environment. We recommend arriving a few minutes early to settle in.",
        },
        {
          title: 'Your massage',
          text: "Before the session begins, we'll take a moment to understand your needs and tailor the massage to you.",
        },
        {
          title: 'After your session',
          text: "Take your time before heading off, and if needed, you'll receive a few recommendations to help extend the benefits of your massage.",
        },
      ],
      aboutTitle: "Hi, I'm Iara!",
      aboutParagraphs: [
        "I'm a fourth-year Physical Therapy student with a strong interest in health, well-being, and physical rehabilitation.",
        "I believe everyone deserves a moment to take care of themselves. That's why I offer personalised massage treatments in a calm and welcoming environment, where every client can relax, relieve tension, and feel their best.",
        "I'm constantly learning and developing my skills to provide a high-quality service with dedication, care, and attention to detail. I hope to provide every client with a moment of well-being during each session.",
      ],
      visitTitle: 'In Almada, waiting for you',
      visitAddressTitle: 'Where',
      visitAddressText:
        'Sessions take place in a calm and relaxing space in Almada. The exact address is shared when your booking is confirmed.',
      visitHoursTitle: 'When',
      visitHoursText:
        'Sessions are by appointment only. See open times as you book.',
      closingTitle: 'Reserve your moment of pause',
      closingText:
        'The first step towards a lighter body takes less than a minute.',
      closingAction: 'Book a session',
    },
    services: {
      eyebrow: 'Our menu',
      title: 'Services and treatments',
      lede: 'Discover our range of therapeutic and relaxing massages designed to restore balance and harmony.',
      loadError: 'Could not load the services catalog. Please try again later.',
      loading: 'Loading our catalog...',
      empty: 'No services are currently available for booking.',
      variantsTitle: 'Options and prices',
      bookAction: 'Book',
      packsAvailable: 'Session packs available',
    },
    serviceDetail: {
      breadcrumbsLabel: 'Breadcrumbs',
      homeBreadcrumb: 'Home',
      servicesBreadcrumb: 'Services',
      back: 'Back to services',
      eyebrow: 'Treatment',
      treatmentTitle: 'About this treatment',
      suitableForTitle: 'Who is it suitable for?',
      sessionTitle: 'What happens during the session?',
      optionsTitle: 'Duration and price',
      locationTitle: 'Where it takes place',
      locationText:
        'Your session takes place in a calm and relaxing space in Almada. The exact address is shared with your booking confirmation.',
      faqTitle: 'Frequently asked questions',
      book: 'Book',
      packsTitle: 'Turn this pause into a routine',
      packsLede:
        'Book the first session now and pay the full pack price after that session.',
      packSessions: (sessions, minutes) => `${sessions} × ${minutes} min`,
      packPerSession: (price) => `${price} per session`,
      packSaving: (price) => `Save ${price}`,
      packValidity: (days) => `Valid for ${days} days`,
      packBook: 'Choose this pack',
      notFoundTitle: 'Service not found',
      notFoundText:
        'This service is unavailable in this language or is no longer published.',
    },
    packs: {
      eyebrow: 'Continuity and care',
      title: 'Packs that make pausing a habit',
      lede: 'Reserve several sessions of the same treatment at a special price. Book your first visit now, then pay for the complete pack after that session.',
      loading: 'Loading available packs...',
      loadError: 'We could not load the packs. Please try again.',
      emptyTitle: 'No packs are available yet',
      emptyText:
        'You can still book individual sessions or return later to discover new options.',
      exploreServices: 'Explore services',
      offerSessions: (sessions, minutes) =>
        `${sessions} sessions · ${minutes} min`,
      regularValue: (price) => `Individual session value: ${price}`,
      totalPrice: 'Pack price',
      perSession: (price) => `${price} per session`,
      saving: (price) => `Save ${price}`,
      validity: (days) => `Use within ${days} days`,
      book: 'Book first session',
      howTitle: 'How it works',
      steps: [
        {
          title: 'Choose your pack',
          text: 'Compare options by treatment, duration, and number of sessions.',
        },
        {
          title: 'Book the first session',
          text: 'Choose a date and submit your booking request as usual.',
        },
        {
          title: 'Pay and continue by email',
          text: 'After the first session, pay for the complete pack. For later visits, use the secure link sent to the email used for purchase.',
        },
      ],
      termsTitle: 'Before you choose',
      terms: [
        'Each pack is tied to one treatment and session duration.',
        'Where applicable, validity starts on the first session date and is shown on each option.',
        'Cancellations and rescheduling follow the booking terms.',
      ],
    },
    booking: {
      eyebrow: 'Booking',
      back: 'Back to home',
      loading: 'Loading...',
      loadError: 'Could not load services. Please try again.',
      noServices: 'No services are currently available for booking.',
      pageTitle: 'Book a session',
      bookingSteps: 'Booking steps',
      serviceStep: 'Service',
      timeStep: 'Date and time',
      detailsStep: 'Details',
      reviewStep: 'Review',
      chooseService: 'Choose a service',
      chooseOption: 'Choose an option',
      paymentChoice: 'How would you like to book?',
      singleSession: 'Single session',
      buyPackLabel: (sessions, minutes, price) =>
        `Buy ${sessions} × ${minutes} min pack · ${price}`,
      usePackLabel: (remaining) =>
        `Use my pack · ${remaining} ${remaining === 1 ? 'session' : 'sessions'} remaining`,
      alreadyHavePack: 'Already have a pack?',
      packAccessHelp:
        'Enter the email used for your purchase and we will send you a secure link to access your sessions.',
      packConnected: 'Your pack is connected to this booking request.',
      emailPackLink: 'Email me a secure link',
      sendingPackLink: 'Sending...',
      packLinkSent:
        'If an active pack exists for this email, a link will arrive shortly.',
      packAccessError: 'We could not send the link. Please try again.',
      chooseDate: 'Choose a date',
      chooseSlot: 'Choose a time',
      periodMorning: 'Morning',
      periodAfternoon: 'Afternoon',
      periodEvening: 'Evening',
      slotsLoading: 'Loading available times...',
      slotsErrorTitle: 'We could not check the available times',
      slotsError:
        'The connection may have failed. Try again or choose another treatment.',
      retryAvailability: 'Try again',
      calendarPreviousMonth: 'View previous month',
      calendarNextMonth: 'View next month',
      calendarPrevious: 'Previous',
      calendarNext: 'Next',
      calendarAvailable: 'Available',
      calendarUnavailable: 'Unavailable',
      noAvailabilityInMonth: (month) => `No availability in ${month}`,
      noAvailabilityInMonthHelp:
        'View the next month or contact Iara directly.',
      chooseAnotherTreatment: 'Choose another treatment',
      contactByEmail: 'Send an email',
      contactByPhone: (phone) => `Call ${phone}`,
      yourDetails: 'Your details',
      name: 'Name',
      email: 'Email',
      phone: 'Phone',
      notes: 'Logistical notes (do not include health information)',
      optional: '(optional)',
      required: 'Required',
      invalidEmail: 'Enter a valid email',
      selectSlotFirst: 'Please pick a time first.',
      previous: 'Back',
      next: 'Continue',
      reviewBooking: 'Review booking',
      summary: 'Summary',
      notSelected: 'Not selected',
      submit: 'Request booking',
      submitting: 'Sending...',
      submitError: 'Something went wrong. Please try again.',
      slotTakenError:
        'That time is no longer available. Please choose another.',
      discountCode: 'Discount code',
      discountHelp:
        'Enter your code to see the discount before requesting the booking.',
      applyDiscount: 'Apply',
      applyingDiscount: 'Applying...',
      discountApplied: 'Discount applied',
      removeDiscount: 'Remove',
      discountUnavailable: 'This discount code is invalid or unavailable.',
      discountNeedsEmail: 'Enter a valid email address to apply the discount.',
      originalPrice: 'Original price',
      discount: 'Discount',
      totalPrice: 'Total',
      confirmedTitle: 'Booking requested!',
      confirmedLede: (name) =>
        `Thanks, ${name}. We'll confirm your appointment by email shortly.`,
      confirmedService: 'Service',
      confirmedWhen: 'When',
      pendingNote: 'Your request is pending confirmation.',
      bookAnother: 'Book another',
      paymentNotice:
        'No payment is taken online. Payment is made in person by cash, MB WAY, or bank transfer.',
      dataUseNotice:
        'We use your details only to process and communicate about this request.',
      privacyLink: 'Privacy policy',
      termsNotice:
        'By requesting the booking, you confirm that you have read the',
      termsLink: 'Booking terms',
    },
  },
};
