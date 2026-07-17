alter table reservations drop constraint reservations_status_valid;

alter table reservations
    add constraint reservations_status_valid
        check (status in ('PENDING', 'CONFIRMED', 'REJECTED', 'CANCELLED', 'COMPLETED', 'NO_SHOW'));

create table reservation_payments (
    id uuid primary key default gen_random_uuid(),
    reservation_id uuid not null references reservations(id) on delete restrict,
    amount_cents bigint not null,
    currency varchar(3) not null,
    method varchar(30) not null,
    status varchar(20) not null default 'PAID',
    paid_at timestamp with time zone not null,
    reference varchar(255),
    created_at timestamp with time zone not null default now(),
    updated_at timestamp with time zone not null default now(),
    constraint reservation_payments_amount_positive check (amount_cents > 0),
    constraint reservation_payments_method_valid
        check (method in ('CASH', 'CARD', 'BANK_TRANSFER', 'OTHER')),
    constraint reservation_payments_status_valid
        check (status in ('PAID', 'REFUNDED', 'VOIDED'))
);

create index idx_reservation_payments_reservation on reservation_payments(reservation_id);
create index idx_reservation_payments_paid_at on reservation_payments(paid_at);
