insert into application_settings (setting_key, setting_value)
values ('max_daily_bookings', '3')
on conflict (setting_key) do nothing;

create table reservation_day_locks (
    booking_date date primary key,
    created_at timestamp with time zone not null default now()
);
