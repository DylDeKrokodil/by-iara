-- V041 intentionally targeted future instants. During the timezone cutover, an
-- appointment in the Brussels/Lisbon offset gap may already look past by instant
-- even though the Lisbon wall-clock time selected by the customer is still ahead.
update reservations
set
    starts_at = (starts_at at time zone 'Europe/Brussels') at time zone 'Europe/Lisbon',
    ends_at = (ends_at at time zone 'Europe/Brussels') at time zone 'Europe/Lisbon',
    updated_at = now()
where status in ('PENDING', 'CONFIRMED')
  and starts_at <= now()
  and (starts_at at time zone 'Europe/Brussels') > (now() at time zone 'Europe/Lisbon');

update reservation_reminders reminder
set
    reservation_starts_at = reservation.starts_at,
    updated_at = now()
from reservations reservation
where reservation.id = reminder.reservation_id
  and reminder.reservation_starts_at <> reservation.starts_at;
