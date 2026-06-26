create table services (
    id uuid primary key default gen_random_uuid(),
    slug varchar(140) not null unique,
    name varchar(160) not null,
    description text,
    active boolean not null default true,
    sort_order integer not null default 0,
    created_at timestamp with time zone not null default now(),
    updated_at timestamp with time zone not null default now()
);

create table service_variants (
    id uuid primary key default gen_random_uuid(),
    service_id uuid not null references services(id) on delete cascade,
    duration_minutes integer not null,
    price_cents bigint not null,
    currency varchar(3) not null default 'EUR',
    active boolean not null default true,
    sort_order integer not null default 0,
    created_at timestamp with time zone not null default now(),
    updated_at timestamp with time zone not null default now(),
    constraint service_variants_service_duration_unique unique (service_id, duration_minutes),
    constraint service_variants_duration_positive check (duration_minutes > 0),
    constraint service_variants_price_non_negative check (price_cents >= 0)
);

create index idx_services_active on services(active);
create index idx_service_variants_service on service_variants(service_id);
