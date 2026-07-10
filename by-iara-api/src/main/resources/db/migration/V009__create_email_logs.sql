create table email_logs (
    id uuid primary key default gen_random_uuid(),
    -- Soft link for reporting only, same reasoning as reservations.service_id.
    reservation_id uuid references reservations(id) on delete set null,
    recipient varchar(255) not null,
    email_type varchar(40) not null,
    status varchar(20) not null,
    error_message text,
    created_at timestamp with time zone not null default now(),
    constraint email_logs_status_valid check (status in ('SENT', 'FAILED'))
);

create index idx_email_logs_reservation on email_logs(reservation_id);
