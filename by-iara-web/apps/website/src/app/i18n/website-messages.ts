import type { LocaleCode } from './supported-locales';

export interface WebsiteMessages {
  readonly app: {
    readonly nav: {
      readonly home: string;
      readonly services: string;
      readonly bookCta: string;
      readonly openMenu: string;
      readonly closeMenu: string;
    };
    readonly footer: string;
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
  };
  readonly serviceDetail: {
    readonly back: string;
    readonly eyebrow: string;
    readonly optionsTitle: string;
    readonly book: string;
    readonly notFoundTitle: string;
    readonly notFoundText: string;
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
    readonly chooseDate: string;
    readonly chooseSlot: string;
    readonly periodMorning: string;
    readonly periodAfternoon: string;
    readonly periodEvening: string;
    readonly slotsLoading: string;
    readonly slotsError: string;
    readonly noSlots: string;
    readonly noSlotsForDate: string;
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
    readonly confirmedTitle: string;
    readonly confirmedLede: (name: string) => string;
    readonly confirmedService: string;
    readonly confirmedWhen: string;
    readonly pendingNote: string;
    readonly bookAnother: string;
  };
}

export const WEBSITE_MESSAGES: Record<LocaleCode, WebsiteMessages> = {
  'pt-PT': {
    app: {
      nav: {
        home: 'Início',
        services: 'Serviços',
        bookCta: 'Marca agora',
        openMenu: 'Abrir menu',
        closeMenu: 'Fechar menu',
      },
      footer: '© 2026 By Iara. Todos os direitos reservados.',
    },
    languageSwitcher: {
      ariaLabel: 'Escolher idioma',
    },
    home: {
      location: 'Massagem terapêutica em Almada',
      title: 'By Iara',
      lede: 'Um espaço de pausa para reservar com calma, chegar com confiança e sair com o corpo mais leve.',
      primaryAction: 'Marcar sessão',
      secondaryAction: 'Explorar serviços',
      actionsLabel: 'Ações da página inicial',
      today: 'hoje',
      nextAvailable: (day, time) => `Próxima vaga: ${day}, ${time}`,
      mediaCredit: 'Vídeo via Mixkit',
      servicesTitle: 'Tratamentos',
      servicesLede:
        'Do alívio profundo ao puro relaxamento — escolha o ritmo do seu corpo.',
      servicesFrom: (price) => `desde ${price}`,
      servicesDuration: (min, max) =>
        min === max ? `${min} min` : `${min}–${max} min`,
      servicesAction: 'Reservar',
      servicesViewAll: 'Ver todos os serviços',
      expectTitle: 'O que esperar',
      expectSteps: [
        {
          title: 'Reserve online',
          text: 'Escolha o tratamento e o horário que lhe convém, em poucos toques.',
        },
        {
          title: 'Chegue com calma',
          text: 'Sem salas de espera — o espaço é seu. Chegue uns minutos antes e respire.',
        },
        {
          title: 'A sessão',
          text: 'Conversamos primeiro sobre o que o seu corpo precisa. Depois, é só entregar-se.',
        },
        {
          title: 'Depois',
          text: 'Tempo para voltar a si, sem pressa, e sugestões para prolongar o efeito em casa.',
        },
      ],
      aboutTitle: 'Olá, sou a Iara.',
      aboutParagraphs: [
        'Trabalho com massagem terapêutica porque acredito que o corpo guarda aquilo que a cabeça não consegue largar. Cada sessão começa por ouvir — o que dói, o que pesa, o que precisa de espaço.',
        'O estúdio é pequeno de propósito: uma pessoa de cada vez, sem pressa, com atenção inteira. É esse o luxo que quero oferecer.',
      ],
      visitTitle: 'Em Almada, à sua espera',
      visitAddressTitle: 'Onde',
      visitAddressText:
        'O estúdio fica em Almada. A morada exata é partilhada na confirmação da sua marcação.',
      visitHoursTitle: 'Quando',
      visitHoursText:
        'As sessões são sempre com marcação prévia — veja os horários livres ao reservar.',
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
    },
    serviceDetail: {
      back: 'Voltar aos serviços',
      eyebrow: 'Tratamento',
      optionsTitle: 'Duração e preço',
      book: 'Marcar',
      notFoundTitle: 'Serviço não encontrado',
      notFoundText:
        'Este serviço não está disponível neste idioma ou deixou de estar publicado.',
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
      chooseDate: 'Escolha uma data',
      chooseSlot: 'Escolha um horário',
      periodMorning: 'Manhã',
      periodAfternoon: 'Tarde',
      periodEvening: 'Noite',
      slotsLoading: 'A carregar horários...',
      slotsError: 'Não foi possível carregar a disponibilidade.',
      noSlots: 'Sem horários disponíveis nas próximas semanas.',
      noSlotsForDate: 'Sem horários disponíveis para esta data.',
      yourDetails: 'Os seus dados',
      name: 'Nome',
      email: 'Email',
      phone: 'Telefone',
      notes: 'Notas',
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
      confirmedTitle: 'Reserva pedida!',
      confirmedLede: (name) =>
        `Obrigado, ${name}. Confirmaremos a sua marcação por email em breve.`,
      confirmedService: 'Serviço',
      confirmedWhen: 'Quando',
      pendingNote: 'O seu pedido está pendente de confirmação.',
      bookAnother: 'Fazer outra reserva',
    },
  },
  'en-US': {
    app: {
      nav: {
        home: 'Home',
        services: 'Services',
        bookCta: 'Book now',
        openMenu: 'Open menu',
        closeMenu: 'Close menu',
      },
      footer: '© 2026 By Iara. All rights reserved.',
    },
    languageSwitcher: {
      ariaLabel: 'Choose language',
    },
    home: {
      location: 'Therapeutic massage in Almada',
      title: 'By Iara',
      lede: 'A place to pause, book calmly, arrive with trust, and leave with your body feeling lighter.',
      primaryAction: 'Book a session',
      secondaryAction: 'Explore services',
      actionsLabel: 'Home page actions',
      today: 'today',
      nextAvailable: (day, time) => `Next opening: ${day}, ${time}`,
      mediaCredit: 'Video via Mixkit',
      servicesTitle: 'Treatments',
      servicesLede:
        "From deep relief to pure relaxation — choose your body's pace.",
      servicesFrom: (price) => `from ${price}`,
      servicesDuration: (min, max) =>
        min === max ? `${min} min` : `${min}–${max} min`,
      servicesAction: 'Book',
      servicesViewAll: 'See all services',
      expectTitle: 'What to expect',
      expectSteps: [
        {
          title: 'Book online',
          text: 'Pick a treatment and a time that suits you, in a few taps.',
        },
        {
          title: 'Arrive slowly',
          text: 'No waiting rooms — the space is yours. Come a few minutes early and breathe.',
        },
        {
          title: 'The session',
          text: 'We start by talking about what your body needs. Then simply let go.',
        },
        {
          title: 'Afterwards',
          text: 'Time to come back to yourself, unhurried, with tips to carry the calm home.',
        },
      ],
      aboutTitle: "Hello, I'm Iara.",
      aboutParagraphs: [
        'I work with therapeutic massage because I believe the body holds what the mind cannot let go of. Every session starts with listening — what hurts, what weighs, what needs room.',
        'The studio is small on purpose: one person at a time, unhurried, with full attention. That is the luxury I want to offer.',
      ],
      visitTitle: 'In Almada, waiting for you',
      visitAddressTitle: 'Where',
      visitAddressText:
        'The studio is in Almada. The exact address is shared when your booking is confirmed.',
      visitHoursTitle: 'When',
      visitHoursText:
        'Sessions are by appointment only — see open times as you book.',
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
    },
    serviceDetail: {
      back: 'Back to services',
      eyebrow: 'Treatment',
      optionsTitle: 'Duration and price',
      book: 'Book',
      notFoundTitle: 'Service not found',
      notFoundText:
        'This service is unavailable in this language or is no longer published.',
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
      chooseDate: 'Choose a date',
      chooseSlot: 'Choose a time',
      periodMorning: 'Morning',
      periodAfternoon: 'Afternoon',
      periodEvening: 'Evening',
      slotsLoading: 'Loading available times...',
      slotsError: 'Could not load availability.',
      noSlots: 'No times available in the next weeks.',
      noSlotsForDate: 'No times available for this date.',
      yourDetails: 'Your details',
      name: 'Name',
      email: 'Email',
      phone: 'Phone',
      notes: 'Notes',
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
      confirmedTitle: 'Booking requested!',
      confirmedLede: (name) =>
        `Thanks, ${name}. We'll confirm your appointment by email shortly.`,
      confirmedService: 'Service',
      confirmedWhen: 'When',
      pendingNote: 'Your request is pending confirmation.',
      bookAnother: 'Book another',
    },
  },
};
