create table discounts (
    id uuid primary key default gen_random_uuid(),
    name varchar(160) not null,
    audience varchar(20) not null,
    scope varchar(30) not null,
    value_type varchar(20) not null,
    value_amount bigint not null,
    currency varchar(3),
    starts_at timestamp with time zone not null,
    ends_at timestamp with time zone not null,
    max_unique_clients integer,
    max_uses_per_customer integer not null default 1,
    code_hash varchar(64) not null unique,
    code_hint varchar(40) not null,
    customer_id uuid references customers(id) on delete restrict,
    status varchar(20) not null default 'ACTIVE',
    created_at timestamp with time zone not null default now(),
    updated_at timestamp with time zone not null default now(),
    constraint discounts_audience_valid check (audience in ('PUBLIC', 'PERSONAL')),
    constraint discounts_scope_valid check (scope in ('ALL_SERVICES', 'SELECTED_SERVICES')),
    constraint discounts_value_type_valid check (value_type in ('PERCENTAGE', 'FIXED_AMOUNT')),
    constraint discounts_status_valid check (status in ('ACTIVE', 'PAUSED', 'ARCHIVED')),
    constraint discounts_value_positive check (value_amount > 0),
    constraint discounts_period_valid check (starts_at < ends_at),
    constraint discounts_client_limit_positive check (max_unique_clients is null or max_unique_clients > 0),
    constraint discounts_customer_limit_positive check (max_uses_per_customer > 0),
    constraint discounts_personal_customer check (
        (audience = 'PERSONAL' and customer_id is not null)
        or (audience = 'PUBLIC' and customer_id is null)
    ),
    constraint discounts_fixed_currency check (
        (value_type = 'FIXED_AMOUNT' and currency is not null)
        or value_type = 'PERCENTAGE'
    )
);

create index idx_discounts_status_period on discounts(status, starts_at, ends_at);
create index idx_discounts_customer on discounts(customer_id);

create table discount_services (
    discount_id uuid not null references discounts(id) on delete cascade,
    service_id uuid not null references services(id) on delete restrict,
    primary key (discount_id, service_id)
);

create index idx_discount_services_service on discount_services(service_id);

create table reservation_discounts (
    id uuid primary key default gen_random_uuid(),
    reservation_id uuid not null unique references reservations(id) on delete restrict,
    discount_id uuid references discounts(id) on delete set null,
    customer_id uuid not null references customers(id) on delete restrict,
    discount_name varchar(160) not null,
    code_hint varchar(40) not null,
    value_type varchar(20) not null,
    value_amount bigint not null,
    original_price_cents bigint not null,
    discount_amount_cents bigint not null,
    final_price_cents bigint not null,
    currency varchar(3) not null,
    status varchar(20) not null default 'RESERVED',
    reserved_at timestamp with time zone not null default now(),
    consumed_at timestamp with time zone,
    released_at timestamp with time zone,
    updated_at timestamp with time zone not null default now(),
    constraint reservation_discounts_value_type_valid check (value_type in ('PERCENTAGE', 'FIXED_AMOUNT')),
    constraint reservation_discounts_status_valid check (status in ('RESERVED', 'CONSUMED', 'RELEASED')),
    constraint reservation_discounts_amounts_valid check (
        original_price_cents >= 0
        and discount_amount_cents >= 0
        and final_price_cents >= 0
        and original_price_cents - discount_amount_cents = final_price_cents
    )
);

create index idx_reservation_discounts_discount on reservation_discounts(discount_id, status);
create index idx_reservation_discounts_customer on reservation_discounts(customer_id, status);
