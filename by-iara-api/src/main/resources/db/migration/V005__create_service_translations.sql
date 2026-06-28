create table service_translations (
    service_id uuid not null references services(id) on delete cascade,
    locale varchar(10) not null,
    name varchar(160) not null,
    description text,
    created_at timestamp with time zone not null default now(),
    updated_at timestamp with time zone not null default now(),
    primary key (service_id, locale)
);

create index idx_service_translations_locale on service_translations(locale);

insert into service_translations (service_id, locale, name, description)
select id, 'en-US', name, description
from services;
