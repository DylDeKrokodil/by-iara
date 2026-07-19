create table pack_offers (
    id uuid primary key default gen_random_uuid(),
    service_id uuid not null references services(id) on delete cascade,
    duration_minutes integer not null,
    session_count integer not null,
    price_cents bigint not null,
    currency varchar(3) not null default 'EUR',
    validity_days integer,
    active boolean not null default true,
    sort_order integer not null default 0,
    created_at timestamp with time zone not null default now(),
    updated_at timestamp with time zone not null default now(),
    constraint pack_offers_duration_positive check (duration_minutes > 0),
    constraint pack_offers_sessions_multiple check (session_count > 1),
    constraint pack_offers_price_positive check (price_cents > 0),
    constraint pack_offers_validity_positive check (validity_days is null or validity_days > 0),
    constraint pack_offers_service_duration_sessions_unique
        unique (service_id, duration_minutes, session_count)
);

create index idx_pack_offers_service on pack_offers(service_id);
create index idx_pack_offers_public on pack_offers(service_id, duration_minutes)
    where active = true;

create table customer_packs (
    id uuid primary key default gen_random_uuid(),
    customer_id uuid not null references customers(id) on delete restrict,
    pack_offer_id uuid references pack_offers(id) on delete set null,
    originating_reservation_id uuid not null unique references reservations(id) on delete restrict,
    status varchar(30) not null default 'PENDING_PAYMENT',
    service_id uuid references services(id) on delete set null,
    service_name varchar(160) not null,
    duration_minutes integer not null,
    total_sessions integer not null,
    validity_days integer,
    price_cents bigint not null,
    currency varchar(3) not null,
    activated_at timestamp with time zone,
    expires_at timestamp with time zone,
    created_at timestamp with time zone not null default now(),
    updated_at timestamp with time zone not null default now(),
    constraint customer_packs_status_valid
        check (status in ('PENDING_PAYMENT', 'ACTIVE', 'EXHAUSTED', 'EXPIRED', 'CANCELLED')),
    constraint customer_packs_duration_positive check (duration_minutes > 0),
    constraint customer_packs_sessions_multiple check (total_sessions > 1),
    constraint customer_packs_validity_positive check (validity_days is null or validity_days > 0),
    constraint customer_packs_price_positive check (price_cents > 0)
);

create index idx_customer_packs_customer on customer_packs(customer_id);
create index idx_customer_packs_usable on customer_packs(customer_id, service_id, duration_minutes)
    where status = 'ACTIVE';

create table pack_redemptions (
    id uuid primary key default gen_random_uuid(),
    customer_pack_id uuid not null references customer_packs(id) on delete restrict,
    reservation_id uuid not null unique references reservations(id) on delete restrict,
    status varchar(20) not null default 'RESERVED',
    reserved_at timestamp with time zone not null default now(),
    consumed_at timestamp with time zone,
    released_at timestamp with time zone,
    created_at timestamp with time zone not null default now(),
    updated_at timestamp with time zone not null default now(),
    constraint pack_redemptions_status_valid
        check (status in ('RESERVED', 'CONSUMED', 'RELEASED', 'FORFEITED'))
);

create index idx_pack_redemptions_pack on pack_redemptions(customer_pack_id);

-- Both email links and the browser sessions obtained by exchanging them are
-- opaque random secrets. Only their SHA-256 hashes are persisted.
create table customer_access_tokens (
    id uuid primary key default gen_random_uuid(),
    customer_id uuid not null references customers(id) on delete cascade,
    token_hash varchar(64) not null unique,
    token_type varchar(20) not null,
    expires_at timestamp with time zone not null,
    used_at timestamp with time zone,
    created_at timestamp with time zone not null default now(),
    constraint customer_access_tokens_type_valid check (token_type in ('MAGIC_LINK', 'SESSION'))
);

create index idx_customer_access_tokens_customer on customer_access_tokens(customer_id);
create index idx_customer_access_tokens_expiry on customer_access_tokens(expires_at);
