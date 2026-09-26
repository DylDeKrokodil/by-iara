alter table reservations
    add column tip_cents bigint not null default 0;

alter table reservations
    add constraint reservations_tip_non_negative check (tip_cents >= 0);
