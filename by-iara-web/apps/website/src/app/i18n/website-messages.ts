import type { LocaleCode } from './supported-locales';

export interface WebsiteMessages {
  readonly app: {
    readonly nav: {
      readonly home: string;
      readonly services: string;
      readonly book: string;
    };
    readonly footer: string;
  };
  readonly languageSwitcher: {
    readonly ariaLabel: string;
  };
  readonly home: {
    readonly heroTitle: string;
    readonly heroLede: string;
    readonly primaryAction: string;
    readonly secondaryAction: string;
    readonly primaryActionsLabel: string;
    readonly featuredTitle: string;
    readonly featuredLede: string;
    readonly featuredBadge: string;
    readonly variantsTitle: string;
    readonly bookAction: string;
    readonly viewAllServices: string;
    readonly featuredServicesError: string;
    readonly experienceTitle: string;
    readonly experienceBody: string;
    readonly pillars: readonly { readonly title: string; readonly body: string }[];
    readonly ctaTitle: string;
    readonly ctaBody: string;
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
        book: 'Marcações',
      },
      footer: '© 2026 By Iara. Todos os direitos reservados.',
    },
    languageSwitcher: {
      ariaLabel: 'Escolher idioma',
    },
    home: {
      heroTitle: 'O seu momento de pausa, em boas mãos.',
      heroLede:
        'Massagens terapêuticas e relaxantes, adaptadas ao seu corpo, num espaço calmo pensado para restaurar o equilíbrio.',
      primaryAction: 'Marcar sessão',
      secondaryAction: 'Ver tratamentos',
      primaryActionsLabel: 'Ações principais',
      featuredTitle: 'Tratamentos em destaque',
      featuredLede:
        'Uma seleção das experiências restauradoras preferidas de quem nos visita.',
      featuredBadge: 'Destaque',
      variantsTitle: 'Opções e preços',
      bookAction: 'Reservar',
      viewAllServices: 'Ver todos os tratamentos',
      featuredServicesError:
        'Não foi possível carregar os serviços em destaque.',
      experienceTitle: 'Cuidado pensado à sua medida.',
      experienceBody:
        'Cada sessão começa por ouvir o que o seu corpo precisa. Ajustamos a pressão, o ritmo e o foco para que saia mais leve do que entrou.',
      pillars: [
        {
          title: 'Pressão à sua medida',
          body: 'Da mais suave à mais profunda, ajustada a cada momento da sessão.',
        },
        {
          title: 'Um espaço que acalma',
          body: 'Luz suave, silêncio e aromas pensados para desligar do dia.',
        },
        {
          title: 'Foco terapêutico',
          body: 'Técnicas que aliviam a tensão e devolvem mobilidade ao corpo.',
        },
      ],
      ctaTitle: 'Está na hora de abrandar.',
      ctaBody:
        'Escolha o tratamento e o horário que lhe dão jeito. Tratamos do resto.',
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
    },
    booking: {
      eyebrow: 'Reserva',
      back: 'Voltar ao início',
      loading: 'A carregar...',
      loadError: 'Não foi possível carregar os serviços. Tente novamente.',
      noServices: 'Não existem serviços disponíveis para reserva neste momento.',
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
        book: 'Booking',
      },
      footer: '© 2026 By Iara. All rights reserved.',
    },
    languageSwitcher: {
      ariaLabel: 'Choose language',
    },
    home: {
      heroTitle: 'Your moment of pause, in good hands.',
      heroLede:
        'Therapeutic and relaxing massages, tailored to your body, in a calm space made to restore balance.',
      primaryAction: 'Book a session',
      secondaryAction: 'View treatments',
      primaryActionsLabel: 'Primary actions',
      featuredTitle: 'Featured treatments',
      featuredLede:
        'A selection of the restorative experiences our visitors love most.',
      featuredBadge: 'Featured',
      variantsTitle: 'Options and prices',
      bookAction: 'Book',
      viewAllServices: 'View all treatments',
      featuredServicesError: 'Could not load featured services.',
      experienceTitle: 'Care shaped around you.',
      experienceBody:
        'Every session starts by listening to what your body needs. We adjust the pressure, pace and focus so you leave lighter than you arrived.',
      pillars: [
        {
          title: 'Pressure to your measure',
          body: 'From the gentlest to the deepest, adjusted throughout the session.',
        },
        {
          title: 'A space that calms',
          body: 'Soft light, quiet and scents made to switch off from the day.',
        },
        {
          title: 'Therapeutic focus',
          body: 'Techniques that release tension and restore the body’s mobility.',
        },
      ],
      ctaTitle: 'It’s time to slow down.',
      ctaBody:
        'Pick the treatment and time that suit you. We’ll take care of the rest.',
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
      slotTakenError: 'That time is no longer available. Please choose another.',
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
