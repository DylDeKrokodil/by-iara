alter table reservation_payments
    add column tip_cents bigint not null default 0;

alter table reservation_payments
    add constraint reservation_payments_tip_non_negative check (tip_cents >= 0);
