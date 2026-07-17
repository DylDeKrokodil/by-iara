import type { LocaleCode } from '../i18n/supported-locales';

export type LegalDocumentKey = 'legalNotice' | 'privacy' | 'bookingTerms';

export interface LegalLink {
  readonly label: string;
  readonly href: string;
}

export interface LegalSection {
  readonly title: string;
  readonly paragraphs?: readonly string[];
  readonly items?: readonly string[];
  readonly links?: readonly LegalLink[];
}

export interface LegalPageContent {
  readonly eyebrow: string;
  readonly title: string;
  readonly intro: string;
  readonly updatedLabel: string;
  readonly updatedDate: string;
  readonly incompleteTitle: string;
  readonly incompleteText: string;
  readonly missingValue: string;
  readonly sections: readonly LegalSection[];
}

const UPDATED_DATE = '17 July 2026';

export const LEGAL_CONTENT: Record<
  LocaleCode,
  Record<LegalDocumentKey, LegalPageContent>
> = {
  'pt-PT': {
    legalNotice: {
      eyebrow: 'Informação do prestador',
      title: 'Informação legal',
      intro:
        'Identificação do prestador responsável por este website e pelos serviços disponibilizados.',
      updatedLabel: 'Última atualização',
      updatedDate: '17 de julho de 2026',
      incompleteTitle: 'Informação a completar antes da publicação',
      incompleteText:
        'Os dados legais abaixo estão intencionalmente em branco durante o desenvolvimento. Devem ser preenchidos e validados antes de o website ser disponibilizado ao público.',
      missingValue: 'A preencher antes da publicação',
      sections: [
        {
          title: 'Prestador do serviço',
          paragraphs: [
            'Os dados oficiais do prestador, incluindo o nome, a forma jurídica, o NIF, a morada e os contactos, constam abaixo.',
          ],
        },
        {
          title: 'Serviço e marcações',
          paragraphs: [
            'O website apresenta serviços de massagem e permite enviar pedidos de marcação. O envio de um pedido não confirma automaticamente a marcação. A marcação apenas fica confirmada quando o cliente recebe uma confirmação por email.',
            'Não são recebidos pagamentos através deste website. O pagamento é efetuado presencialmente no local da sessão, pelos meios indicados nas condições de marcação.',
          ],
        },
        {
          title: 'Livro de Reclamações',
          paragraphs: [
            'Os consumidores podem apresentar uma reclamação através do Livro de Reclamações Eletrónico.',
          ],
          links: [
            {
              label: 'Aceder ao Livro de Reclamações Eletrónico',
              href: 'https://www.livroreclamacoes.pt/Inicio/',
            },
          ],
        },
        {
          title: 'Resolução alternativa de litígios',
          paragraphs: [
            'Em caso de litígio de consumo, o consumidor pode recorrer à entidade de resolução alternativa de litígios indicada nos dados abaixo, competente para contratos celebrados e executados na Área Metropolitana de Lisboa.',
          ],
        },
        {
          title: 'Conteúdo e responsabilidade',
          paragraphs: [
            'O conteúdo do website tem natureza informativa e pode ser atualizado. Nada neste website substitui aconselhamento, diagnóstico ou tratamento prestado por um profissional de saúde devidamente habilitado.',
            'Os direitos legais dos consumidores não são limitados por esta informação.',
          ],
        },
      ],
    },
    privacy: {
      eyebrow: 'Proteção de dados',
      title: 'Política de privacidade',
      intro:
        'Esta política explica como são tratados os dados pessoais quando visita o website ou pede uma marcação.',
      updatedLabel: 'Última atualização',
      updatedDate: '17 de julho de 2026',
      incompleteTitle: 'Informação de privacidade a completar',
      incompleteText:
        'O período operacional de conservação dos dados ainda deve ser definido antes da publicação.',
      missingValue: 'A preencher antes da publicação',
      sections: [
        {
          title: 'Responsável pelo tratamento',
          paragraphs: [
            'O prestador identificado na secção abaixo é o responsável pelo tratamento dos dados pessoais recolhidos através deste website.',
          ],
        },
        {
          title: 'Dados que tratamos',
          items: [
            'Dados de identificação e contacto: nome, email e, quando fornecido, número de telefone.',
            'Dados da marcação: serviço, duração, preço, data, hora, estado da marcação e notas logísticas opcionais.',
            'Comunicações relacionadas com o pedido, confirmação, alteração ou cancelamento da marcação.',
            'Dados técnicos e de segurança necessários ao funcionamento e proteção do serviço, como endereço IP, data, hora, pedidos ao servidor e informação básica do navegador.',
            'Dados de pagamento e faturação registados presencialmente, quando aplicável. O website não recolhe dados de cartões.',
          ],
        },
        {
          title: 'Finalidades e fundamentos jurídicos',
          items: [
            'Receber, analisar e confirmar pedidos de marcação e prestar o serviço solicitado: diligências pré-contratuais e execução do contrato.',
            'Enviar mensagens operacionais sobre a marcação: diligências pré-contratuais e execução do contrato.',
            'Emitir e conservar documentos contabilísticos ou responder a autoridades: cumprimento de obrigações legais.',
            'Proteger o website, prevenir abuso, manter registos técnicos e defender direitos em caso de conflito: interesses legítimos do responsável, depois de ponderados os direitos do titular.',
          ],
          paragraphs: [
            'Os dados de marcação não são utilizados para marketing sem um consentimento separado, específico e opcional.',
          ],
        },
        {
          title: 'Notas e dados de saúde',
          paragraphs: [
            'O campo de notas destina-se apenas a informação logística. Não deve incluir sintomas, diagnósticos, lesões, gravidez, medicação ou outros dados de saúde. Caso seja necessário discutir segurança ou contraindicações, utilize o contacto indicado após a confirmação da marcação.',
          ],
        },
        {
          title: 'Dados obrigatórios e opcionais',
          paragraphs: [
            'O nome e o email são necessários para processar e responder ao pedido. Sem estes dados não é possível concluir a marcação. O telefone e as notas são opcionais.',
          ],
        },
        {
          title: 'Destinatários e prestadores',
          paragraphs: [
            'Os dados podem ser tratados por fornecedores de alojamento, base de dados, envio de email, manutenção informática e calendário que atuem por conta do responsável, bem como por contabilistas, consultores ou autoridades quando necessário ou legalmente exigido.',
            'Os fornecedores que atuem como subcontratantes devem estar vinculados por contrato e apenas podem tratar dados segundo instruções documentadas.',
          ],
        },
        {
          title: 'Transferências internacionais',
          paragraphs: [
            'Se um fornecedor tratar dados fora do Espaço Económico Europeu, a transferência apenas será realizada com um mecanismo legal aplicável, como uma decisão de adequação ou cláusulas contratuais-tipo, e com salvaguardas complementares quando necessárias.',
          ],
        },
        {
          title: 'Conservação',
          paragraphs: [
            'Os dados pessoais associados a pedidos e marcações são conservados durante 2 anos após a realização, cancelamento ou última interação relevante e são depois eliminados ou anonimizados, salvo quando devam ser conservados por mais tempo para cumprir uma obrigação legal ou exercer ou defender direitos.',
            'Os registos e documentos contabilísticos legalmente exigidos são conservados durante 10 anos. Este prazo não implica a conservação de todos os dados operacionais da marcação durante o mesmo período.',
          ],
        },
        {
          title: 'Direitos do titular',
          items: [
            'Pedir acesso, retificação ou apagamento dos dados.',
            'Pedir a limitação do tratamento ou opor-se ao tratamento quando aplicável.',
            'Receber os dados num formato portátil quando os requisitos legais estejam preenchidos.',
            'Retirar consentimento a qualquer momento para tratamentos baseados em consentimento, sem afetar o tratamento anterior.',
            'Apresentar reclamação à Comissão Nacional de Proteção de Dados (CNPD).',
          ],
          links: [
            {
              label: 'Contactar a CNPD',
              href: 'https://www.cnpd.pt/cidadaos/participacoes/',
            },
          ],
        },
        {
          title: 'Cookies e tecnologias semelhantes',
          paragraphs: [
            'O website público não utiliza atualmente cookies de analítica, publicidade ou personalização. Podem ser utilizados mecanismos estritamente necessários à segurança e ao funcionamento de áreas autenticadas. Se forem adicionadas tecnologias opcionais, esta política será atualizada e será solicitado consentimento antes da sua utilização.',
          ],
        },
        {
          title: 'Segurança e alterações',
          paragraphs: [
            'São aplicadas medidas técnicas e organizativas adequadas ao risco, incluindo controlo de acessos e proteção das comunicações. Nenhum sistema é totalmente isento de risco.',
            'Esta política pode ser atualizada quando o serviço, os fornecedores ou os requisitos legais mudarem. A data apresentada no topo identifica a versão em vigor.',
          ],
        },
      ],
    },
    bookingTerms: {
      eyebrow: 'Condições do serviço',
      title: 'Termos de marcação',
      intro:
        'Estas condições explicam como funciona o pedido, a confirmação, o pagamento presencial e o cancelamento de uma sessão.',
      updatedLabel: 'Última atualização',
      updatedDate: '17 de julho de 2026',
      incompleteTitle: 'Dados do prestador a completar',
      incompleteText:
        'Os dados de identificação e contacto assinalados abaixo devem ser completados antes da publicação.',
      missingValue: 'A preencher antes da publicação',
      sections: [
        {
          title: 'Identificação e âmbito',
          paragraphs: [
            'Estas condições aplicam-se aos pedidos de marcação enviados através deste website ao prestador identificado na informação legal.',
          ],
        },
        {
          title: 'Pedido e confirmação',
          paragraphs: [
            'As sessões realizam-se apenas por marcação. Os pedidos podem ser feitos através do website, WhatsApp ou redes sociais.',
            'A escolha de um serviço e horário e o envio do formulário constituem apenas um pedido. Não existe confirmação automática nem é recebido qualquer pagamento no website.',
            'A marcação só fica confirmada após confirmação da terapeuta, enviada por email quando o pedido é feito no website. Se o horário já não estiver disponível, o pedido pode ser recusado ou pode ser proposta uma alternativa.',
          ],
        },
        {
          title: 'Serviços, preços e pagamento',
          paragraphs: [
            'A descrição, duração e preço aplicáveis são os apresentados antes do envio do pedido. Os preços apresentados ao consumidor incluem os impostos legalmente aplicáveis, salvo indicação clara em contrário permitida por lei.',
            'O pagamento é devido no final de cada sessão e é efetuado presencialmente por MB WAY, transferência bancária ou numerário. Não são solicitados nem tratados dados de cartão através deste website.',
          ],
        },
        {
          title: 'Cancelamento e reagendamento',
          paragraphs: [
            'Os pedidos de cancelamento ou reagendamento devem ser comunicados com pelo menos 24 horas de antecedência. Quando esse prazo é respeitado, não é cobrado qualquer valor.',
            'O primeiro cancelamento comunicado com menos de 24 horas de antecedência não tem penalização. Em caso de cancelamentos tardios repetidos, pode ser exigido um sinal de €15 para futuras marcações, deduzido ao preço da sessão no dia da marcação.',
            'Antes de receber a confirmação, o cliente pode retirar o pedido sem qualquer custo. Mantêm-se sempre os direitos imperativos conferidos pela legislação portuguesa de defesa do consumidor.',
          ],
        },
        {
          title: 'Atrasos e comparência',
          paragraphs: [
            'O cliente deve chegar à hora marcada. Em caso de atraso, a sessão termina à hora inicialmente prevista para não prejudicar as marcações seguintes, e o preço total da sessão continua devido.',
            'Se a sessão não puder ser realizada em segurança no tempo restante, a terapeuta pode recusá-la ou adaptá-la.',
          ],
        },
        {
          title: 'Pacotes de sessões',
          paragraphs: [
            'Quando forem adquiridos pacotes, o pagamento integral é devido na primeira sessão. Os pacotes são pessoais, intransmissíveis e válidos por 6 meses a partir da primeira sessão.',
            'Os pacotes não são reembolsáveis, sem prejuízo dos direitos imperativos do consumidor. Um cancelamento com menos de 24 horas de antecedência ou a falta sem aviso implica que a sessão correspondente seja considerada utilizada e deduzida do pacote.',
          ],
        },
        {
          title: 'Saúde, segurança e adequação do serviço',
          paragraphs: [
            'O cliente deve fornecer informação verdadeira e completa sobre qualquer circunstância relevante para a realização segura da sessão e comunicar qualquer alteração antes ou durante a sessão. Para proteger a sua privacidade, não deve introduzir dados de saúde no campo de notas do website; após a confirmação, deve telefonar para comunicar qualquer questão de saúde relevante.',
            'Os serviços destinam-se ao relaxamento, bem-estar e conforto físico e não substituem aconselhamento, avaliação, diagnóstico, fisioterapia ou qualquer outro tratamento de saúde.',
            'Ao comparecer e aceitar iniciar a sessão, o cliente consente na massagem selecionada e nas adaptações acordadas com a terapeuta. Pode pedir que a sessão seja interrompida ou adaptada a qualquer momento em caso de dor ou desconforto.',
            'A terapeuta pode recusar, interromper ou adaptar uma sessão quando exista um motivo razoável de segurança.',
          ],
        },
        {
          title: 'Recusa de futuras marcações',
          paragraphs: [
            'A terapeuta pode recusar futuras marcações em caso de faltas, atrasos ou cancelamentos tardios repetidos, ou de incumprimento reiterado destes termos.',
          ],
        },
        {
          title: 'Comunicações',
          paragraphs: [
            'As mensagens enviadas para processar, confirmar, alterar ou cancelar a marcação são comunicações operacionais do serviço, não comunicações de marketing.',
          ],
        },
        {
          title: 'Reclamações e litígios',
          paragraphs: [
            'As reclamações podem ser dirigidas ao prestador através dos contactos indicados na informação legal ou apresentadas no Livro de Reclamações Eletrónico. Quando exista vinculação a uma entidade de resolução alternativa de litígios, os respetivos dados constam da informação legal.',
          ],
          links: [
            {
              label: 'Aceder ao Livro de Reclamações Eletrónico',
              href: 'https://www.livroreclamacoes.pt/Inicio/',
            },
          ],
        },
        {
          title: 'Lei aplicável',
          paragraphs: [
            'Aplicam-se a lei portuguesa e os direitos imperativos dos consumidores. Nada nestas condições exclui ou limita direitos que não possam ser legalmente excluídos ou limitados.',
          ],
        },
      ],
    },
  },
  'en-US': {
    legalNotice: {
      eyebrow: 'Provider information',
      title: 'Legal information',
      intro:
        'Identification of the provider responsible for this website and the services offered through it.',
      updatedLabel: 'Last updated',
      updatedDate: UPDATED_DATE,
      incompleteTitle: 'Information to complete before publication',
      incompleteText:
        'The legal details below are intentionally blank during development. They must be completed and validated before the website is made public.',
      missingValue: 'Complete before publication',
      sections: [
        {
          title: 'Service provider',
          paragraphs: [
            'The provider’s official name, legal form, tax number, registered address, and contact information appear below.',
          ],
        },
        {
          title: 'Service and bookings',
          paragraphs: [
            'The website presents massage services and allows visitors to submit booking requests. Submitting a request does not automatically confirm an appointment. A booking is only confirmed when the customer receives a confirmation email.',
            'No payments are accepted through this website. Payment is made in person at the appointment location using the methods stated in the booking terms.',
          ],
        },
        {
          title: 'Electronic Complaints Book',
          paragraphs: [
            'Consumers may submit a complaint through Portugal’s Electronic Complaints Book.',
          ],
          links: [
            {
              label: 'Open the Electronic Complaints Book',
              href: 'https://www.livroreclamacoes.pt/Inicio/',
            },
          ],
        },
        {
          title: 'Alternative dispute resolution',
          paragraphs: [
            'In the event of a consumer dispute, the customer may contact the alternative dispute resolution body identified below, which covers contracts concluded and performed in the Lisbon Metropolitan Area.',
          ],
        },
        {
          title: 'Content and responsibility',
          paragraphs: [
            'Website content is informational and may be updated. Nothing on this website replaces advice, diagnosis, or treatment from a suitably qualified healthcare professional.',
            'This information does not limit consumers’ statutory rights.',
          ],
        },
      ],
    },
    privacy: {
      eyebrow: 'Data protection',
      title: 'Privacy policy',
      intro:
        'This policy explains how personal data is handled when you visit the website or request an appointment.',
      updatedLabel: 'Last updated',
      updatedDate: UPDATED_DATE,
      incompleteTitle: 'Privacy information to complete',
      incompleteText:
        'The operational data-retention period must still be defined before publication.',
      missingValue: 'Complete before publication',
      sections: [
        {
          title: 'Data controller',
          paragraphs: [
            'The provider identified below is the controller of personal data collected through this website.',
          ],
        },
        {
          title: 'Data we process',
          items: [
            'Identity and contact data: name, email address and, when provided, telephone number.',
            'Booking data: service, duration, price, date, time, booking status, and optional logistical notes.',
            'Communications relating to a booking request, confirmation, change, or cancellation.',
            'Technical and security data needed to operate and protect the service, such as IP address, date, time, server requests, and basic browser information.',
            'In-person payment and invoicing records where applicable. The website does not collect card details.',
          ],
        },
        {
          title: 'Purposes and legal bases',
          items: [
            'Receiving, assessing, and confirming booking requests and providing the requested service: steps before entering into a contract and performance of a contract.',
            'Sending operational booking messages: steps before entering into a contract and performance of a contract.',
            'Issuing and retaining accounting records or responding to authorities: compliance with legal obligations.',
            'Protecting the website, preventing misuse, maintaining technical logs, and defending legal claims: the controller’s legitimate interests, balanced against the individual’s rights.',
          ],
          paragraphs: [
            'Booking data is not used for marketing without separate, specific, and optional consent.',
          ],
        },
        {
          title: 'Notes and health data',
          paragraphs: [
            'The notes field is for logistical information only. Do not include symptoms, diagnoses, injuries, pregnancy, medication, or other health information. If safety or contraindications need to be discussed, use the contact channel provided after the booking is confirmed.',
          ],
        },
        {
          title: 'Required and optional data',
          paragraphs: [
            'A name and email address are necessary to process and answer a request. A booking cannot be completed without them. The telephone number and notes are optional.',
          ],
        },
        {
          title: 'Recipients and service providers',
          paragraphs: [
            'Data may be processed by hosting, database, email delivery, IT maintenance, and calendar providers acting for the controller, and by accountants, advisers, or authorities when necessary or legally required.',
            'Providers acting as processors must be bound by contract and may only process data on documented instructions.',
          ],
        },
        {
          title: 'International transfers',
          paragraphs: [
            'If a provider processes data outside the European Economic Area, the transfer will only occur under an applicable legal mechanism, such as an adequacy decision or Standard Contractual Clauses, with supplementary safeguards where necessary.',
          ],
        },
        {
          title: 'Retention',
          paragraphs: [
            'Personal data associated with booking requests and appointments is retained for 2 years after completion, cancellation, or the last relevant interaction and is then deleted or anonymised, unless longer retention is necessary to meet a legal obligation or establish, exercise, or defend legal claims.',
            'Legally required accounting records and supporting documents are retained for 10 years. This does not mean that all operational booking data is kept for the same period.',
          ],
        },
        {
          title: 'Your rights',
          items: [
            'Request access to, correction of, or deletion of personal data.',
            'Request restricted processing or object to processing where applicable.',
            'Receive portable data when the legal requirements are met.',
            'Withdraw consent at any time for processing based on consent, without affecting earlier processing.',
            'Lodge a complaint with Portugal’s Comissão Nacional de Proteção de Dados (CNPD).',
          ],
          links: [
            {
              label: 'Contact the CNPD',
              href: 'https://www.cnpd.pt/cidadaos/participacoes/',
            },
          ],
        },
        {
          title: 'Cookies and similar technologies',
          paragraphs: [
            'The public website does not currently use analytics, advertising, or personalisation cookies. Mechanisms strictly necessary for security and authenticated areas may be used. If optional technologies are added, this policy will be updated and consent will be requested before they are used.',
          ],
        },
        {
          title: 'Security and changes',
          paragraphs: [
            'Technical and organisational measures appropriate to the risk are used, including access controls and protected communications. No system is completely risk-free.',
            'This policy may be updated when the service, suppliers, or legal requirements change. The date at the top identifies the current version.',
          ],
        },
      ],
    },
    bookingTerms: {
      eyebrow: 'Service conditions',
      title: 'Booking terms',
      intro:
        'These terms explain how a request, confirmation, in-person payment, and cancellation of an appointment work.',
      updatedLabel: 'Last updated',
      updatedDate: UPDATED_DATE,
      incompleteTitle: 'Provider details to complete',
      incompleteText:
        'The identification and contact details marked below must be completed before publication.',
      missingValue: 'Complete before publication',
      sections: [
        {
          title: 'Identity and scope',
          paragraphs: [
            'These terms apply to booking requests submitted through this website to the provider identified in the legal information.',
          ],
        },
        {
          title: 'Request and confirmation',
          paragraphs: [
            'Sessions are available by appointment only. Requests may be made through the website, WhatsApp, or social media.',
            'Selecting a service and time and submitting the form only creates a request. There is no automatic confirmation and no payment is taken on the website.',
            'A booking is only confirmed after confirmation from the therapist, sent by email for requests made on the website. If the time is no longer available, the request may be declined or an alternative may be offered.',
          ],
        },
        {
          title: 'Services, prices, and payment',
          paragraphs: [
            'The applicable description, duration, and price are those shown before the request is submitted. Consumer prices include legally applicable taxes unless otherwise clearly stated where permitted by law.',
            'Payment is due at the end of each session and is made in person by MB WAY, bank transfer, or cash. No card details are requested or processed through this website.',
          ],
        },
        {
          title: 'Cancellation and rescheduling',
          paragraphs: [
            'Cancellation or rescheduling requests must be communicated at least 24 hours in advance. No amount is charged when this notice period is met.',
            'The first cancellation made with less than 24 hours’ notice carries no penalty. If late cancellations are repeated, a €15 deposit may be required for future bookings and will be deducted from the session price on the appointment day.',
            'Before receiving confirmation, the customer may withdraw the request at no cost. All mandatory Portuguese consumer rights continue to apply.',
          ],
        },
        {
          title: 'Late arrival and attendance',
          paragraphs: [
            'Customers should arrive at the scheduled time. If a customer is late, the session will still end at the originally scheduled time to avoid delaying later appointments, and the full session price remains due.',
            'If the session cannot be performed safely in the remaining time, the therapist may decline or adapt it.',
          ],
        },
        {
          title: 'Session packages',
          paragraphs: [
            'When a package is purchased, full payment is due at the first session. Packages are personal, non-transferable, and valid for 6 months from the first session.',
            'Packages are non-refundable, without limiting mandatory consumer rights. A cancellation with less than 24 hours’ notice or a failure to attend without notice means the corresponding session is treated as used and deducted from the package.',
          ],
        },
        {
          title: 'Health, safety, and suitability',
          paragraphs: [
            'Customers should provide truthful and complete information about anything relevant to performing the session safely and report any change before or during the session. To protect their privacy, customers must not enter health information in the website notes field; after confirmation, they should call to discuss any relevant health concern.',
            'The services are intended for relaxation, well-being, and physical comfort and do not replace medical advice, assessment, diagnosis, physiotherapy, or any other healthcare treatment.',
            'By attending and agreeing to begin the session, the customer consents to the selected massage and any adaptations agreed with the therapist. The customer may ask for the session to stop or be adapted at any time if they experience pain or discomfort.',
            'The therapist may decline, stop, or adapt a session where there is a reasonable safety concern.',
          ],
        },
        {
          title: 'Refusal of future bookings',
          paragraphs: [
            'The therapist may refuse future bookings following repeated no-shows, late arrivals, late cancellations, or repeated failure to comply with these terms.',
          ],
        },
        {
          title: 'Communications',
          paragraphs: [
            'Messages used to process, confirm, change, or cancel a booking are operational service messages, not marketing communications.',
          ],
        },
        {
          title: 'Complaints and disputes',
          paragraphs: [
            'Complaints may be sent to the provider using the legal-information contact details or submitted through Portugal’s Electronic Complaints Book. If the provider is bound to an alternative dispute resolution body, its details appear in the legal information.',
          ],
          links: [
            {
              label: 'Open the Electronic Complaints Book',
              href: 'https://www.livroreclamacoes.pt/Inicio/',
            },
          ],
        },
        {
          title: 'Applicable law',
          paragraphs: [
            'Portuguese law and mandatory consumer rights apply. Nothing in these terms excludes or limits rights that cannot legally be excluded or limited.',
          ],
        },
      ],
    },
  },
};
