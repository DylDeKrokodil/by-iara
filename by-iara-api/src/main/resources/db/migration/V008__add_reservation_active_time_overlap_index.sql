create index if not exists idx_reservations_active_time_overlap
    on reservations(starts_at, ends_at)
    where status in ('PENDING', 'CONFIRMED');
