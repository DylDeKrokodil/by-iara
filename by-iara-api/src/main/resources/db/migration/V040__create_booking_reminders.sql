insert into application_settings (setting_key, setting_value)
values
    ('booking_reminder_enabled', 'false'),
    ('booking_reminder_hours_before', '24')
on conflict (setting_key) do nothing;

create table reservation_reminders (
    reservation_id uuid primary key references reservations(id) on delete cascade,
    reservation_starts_at timestamp with time zone not null,
    status varchar(20) not null default 'PENDING',
    attempt_count integer not null default 0,
    next_attempt_at timestamp with time zone not null default now(),
    claimed_at timestamp with time zone,
    sent_at timestamp with time zone,
    last_error text,
    created_at timestamp with time zone not null default now(),
    updated_at timestamp with time zone not null default now(),
    constraint reservation_reminders_status_valid
        check (status in ('PENDING', 'PROCESSING', 'SENT', 'FAILED', 'SKIPPED')),
    constraint reservation_reminders_attempt_count_valid check (attempt_count >= 0)
);

create index idx_reservation_reminders_dispatch
    on reservation_reminders(status, next_attempt_at, reservation_starts_at);

-- Existing future confirmations become eligible if an admin enables reminders.
insert into reservation_reminders (reservation_id, reservation_starts_at)
select id, starts_at
from reservations
where status = 'CONFIRMED' and starts_at > now()
on conflict (reservation_id) do nothing;
