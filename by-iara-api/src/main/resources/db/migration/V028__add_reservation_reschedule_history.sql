create table reservation_reschedules (
    id uuid primary key default gen_random_uuid(),
    reservation_id uuid not null references reservations(id) on delete cascade,
    previous_starts_at timestamp with time zone not null,
    previous_ends_at timestamp with time zone not null,
    new_starts_at timestamp with time zone not null,
    new_ends_at timestamp with time zone not null,
    created_at timestamp with time zone not null default now(),
    constraint reservation_reschedules_time_changed
        check (previous_starts_at <> new_starts_at),
    constraint reservation_reschedules_new_time_range
        check (new_starts_at < new_ends_at)
);

create index idx_reservation_reschedules_reservation_created
    on reservation_reschedules(reservation_id, created_at desc);
