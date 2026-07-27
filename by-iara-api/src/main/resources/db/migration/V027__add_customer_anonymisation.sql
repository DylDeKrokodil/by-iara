alter table customers
    add column anonymized_at timestamp with time zone;

create index idx_customers_active_email
    on customers (lower(email) varchar_pattern_ops)
    where anonymized_at is null;

create table customer_anonymization_events (
    id uuid primary key default gen_random_uuid(),
    customer_id uuid not null unique references customers(id) on delete restrict,
    performed_by varchar(255) not null,
    scope_version integer not null default 1,
    anonymized_at timestamp with time zone not null
);

create index idx_customer_anonymization_events_date
    on customer_anonymization_events(anonymized_at);
