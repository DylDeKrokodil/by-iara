create table expenses (
    id uuid primary key default gen_random_uuid(),
    category varchar(40) not null,
    amount_cents bigint not null,
    currency varchar(3) not null,
    incurred_at timestamp with time zone not null,
    vendor varchar(160),
    description varchar(500) not null,
    status varchar(20) not null default 'ACTIVE',
    voided_at timestamp with time zone,
    created_at timestamp with time zone not null default now(),
    updated_at timestamp with time zone not null default now(),
    constraint expenses_amount_positive check (amount_cents > 0),
    constraint expenses_currency_format check (currency ~ '^[A-Z]{3}$'),
    constraint expenses_category_valid check (category in (
        'RENT_UTILITIES', 'SUPPLIES', 'SOFTWARE', 'MARKETING',
        'PAYMENT_FEES', 'INSURANCE_LICENSES', 'TRAVEL', 'CONTRACTORS', 'OTHER'
    )),
    constraint expenses_status_valid check (status in ('ACTIVE', 'VOIDED')),
    constraint expenses_void_consistent check (
        (status = 'ACTIVE' and voided_at is null)
        or (status = 'VOIDED' and voided_at is not null)
    )
);

create index idx_expenses_active_incurred_at
    on expenses(incurred_at desc)
    where status = 'ACTIVE';

create index idx_expenses_currency_incurred_at
    on expenses(currency, incurred_at desc);
