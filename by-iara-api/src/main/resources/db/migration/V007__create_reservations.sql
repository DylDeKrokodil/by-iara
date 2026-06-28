create table customers (
    id uuid primary key default gen_random_uuid(),
    name varchar(160) not null,
    email varchar(255) not null unique,
    phone varchar(40),
    created_at timestamp with time zone not null default now(),
    updated_at timestamp with time zone not null default now()
);

create table reservations (
    id uuid primary key default gen_random_uuid(),
    customer_id uuid not null references customers(id),
    -- Soft links for reporting only. Catalog edits recreate variants, so these are
    -- nullable and detach on delete; the snapshot columns below are the source of truth.
    service_id uuid references services(id) on delete set null,
    service_variant_id uuid references service_variants(id) on delete set null,
    -- Snapshot of the booked service at reservation time.
    service_name varchar(160) not null,
    duration_minutes integer not null,
    price_cents bigint not null,
    currency varchar(3) not null default 'EUR',
    starts_at timestamp with time zone not null,
    ends_at timestamp with time zone not null,
    status varchar(20) not null default 'PENDING',
    notes text,
    created_at timestamp with time zone not null default now(),
    updated_at timestamp with time zone not null default now(),
    constraint reservations_time_range check (starts_at < ends_at),
    constraint reservations_duration_positive check (duration_minutes > 0),
    constraint reservations_price_non_negative check (price_cents >= 0),
    constraint reservations_status_valid
        check (status in ('PENDING', 'CONFIRMED', 'REJECTED', 'CANCELLED', 'COMPLETED'))
);

create index idx_reservations_status on reservations(status);
create index idx_reservations_starts_at on reservations(starts_at);
create index idx_reservations_customer on reservations(customer_id);
