-- Historic builds generated public booking slots in Europe/Brussels. Preserve the
-- wall-clock time customers selected while moving upcoming active bookings to Lisbon.
update reservations
set
    starts_at = (starts_at at time zone 'Europe/Brussels') at time zone 'Europe/Lisbon',
    ends_at = (ends_at at time zone 'Europe/Brussels') at time zone 'Europe/Lisbon',
    updated_at = now()
where status in ('PENDING', 'CONFIRMED')
  and starts_at > now();

update reservation_reminders reminder
set
    reservation_starts_at = reservation.starts_at,
    updated_at = now()
from reservations reservation
where reservation.id = reminder.reservation_id
  and reminder.reservation_starts_at <> reservation.starts_at;
