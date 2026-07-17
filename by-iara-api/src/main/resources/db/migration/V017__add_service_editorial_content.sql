alter table service_translations
    add column treatment_description text,
    add column suitable_for text,
    add column session_description text;

create table service_faqs (
    id uuid primary key default gen_random_uuid(),
    service_id uuid not null,
    locale varchar(10) not null,
    question text not null,
    answer text not null,
    sort_order integer not null default 0,
    created_at timestamp with time zone not null default now(),
    updated_at timestamp with time zone not null default now(),
    constraint fk_service_faq_translation
        foreign key (service_id, locale)
        references service_translations(service_id, locale)
        on delete cascade,
    constraint service_faq_question_not_blank check (length(trim(question)) > 0),
    constraint service_faq_answer_not_blank check (length(trim(answer)) > 0)
);

create index idx_service_faqs_translation
    on service_faqs(service_id, locale, sort_order);

-- Enrich the local Docker demo service when it already exists. The exact slug
-- keeps this migration from modifying unrelated services in other environments.
update service_translations
set treatment_description = 'A massagem relaxante combina movimentos lentos, contínuos e envolventes para ajudar o corpo a libertar tensão e entrar num ritmo mais tranquilo.',
    suitable_for = 'Indicada para quem sente stress, cansaço, tensão muscular ligeira ou simplesmente procura um momento de pausa e descanso.',
    session_description = 'Começamos com uma conversa breve sobre como se sente e as áreas que merecem mais atenção. A pressão é ajustada ao seu conforto e a sessão decorre num ambiente calmo e privado.'
where locale = 'pt-PT'
  and slug = 'massagem-relaxante';

update service_translations
set treatment_description = 'A relaxing massage combines slow, flowing and comforting movements to help the body release tension and settle into a calmer rhythm.',
    suitable_for = 'Suitable for anyone experiencing stress, tiredness, mild muscular tension, or simply looking for an unhurried moment of rest.',
    session_description = 'We begin with a short conversation about how you feel and which areas need attention. Pressure is adjusted to your comfort and the session takes place in a calm, private setting.'
where locale = 'en-US'
  and slug = 'relaxing-massage';

insert into service_faqs (service_id, locale, question, answer, sort_order)
select service_id, locale,
       'Preciso de levar alguma coisa?',
       'Não. Todo o material necessário para a sessão é disponibilizado no estúdio.',
       0
from service_translations
where locale = 'pt-PT' and slug = 'massagem-relaxante';

insert into service_faqs (service_id, locale, question, answer, sort_order)
select service_id, locale,
       'Posso escolher a intensidade da massagem?',
       'Sim. A pressão é combinada consigo e pode ser ajustada em qualquer momento da sessão.',
       1
from service_translations
where locale = 'pt-PT' and slug = 'massagem-relaxante';

insert into service_faqs (service_id, locale, question, answer, sort_order)
select service_id, locale,
       'Do I need to bring anything?',
       'No. Everything needed for your session is provided at the studio.',
       0
from service_translations
where locale = 'en-US' and slug = 'relaxing-massage';

insert into service_faqs (service_id, locale, question, answer, sort_order)
select service_id, locale,
       'Can I choose the massage pressure?',
       'Yes. We agree the pressure together and it can be adjusted at any point during the session.',
       1
from service_translations
where locale = 'en-US' and slug = 'relaxing-massage';
