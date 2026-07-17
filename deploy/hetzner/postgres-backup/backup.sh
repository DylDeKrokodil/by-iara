#!/bin/sh
set -eu

interval="${BACKUP_INTERVAL_SECONDS:-86400}"
retention_days="${BACKUP_RETENTION_DAYS:-14}"

case "$interval:$retention_days" in
  *[!0-9:]*|:*|*:) echo "Backup interval and retention must be positive integers" >&2; exit 1 ;;
esac
[ "$interval" -gt 0 ] && [ "$retention_days" -gt 0 ] || {
  echo "Backup interval and retention must be greater than zero" >&2
  exit 1
}

mkdir -p /backups

until pg_isready -q; do
  echo "Waiting for PostgreSQL before starting backups"
  sleep 5
done

while true; do
  timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
  destination="/backups/${PGDATABASE}_${timestamp}.dump"
  temporary="${destination}.tmp"

  echo "Creating PostgreSQL backup ${destination}"
  if pg_dump --format=custom --no-owner --no-privileges --file="$temporary"; then
    chmod 0600 "$temporary"
    mv "$temporary" "$destination"
    find /backups -type f -name "${PGDATABASE}_*.dump" -mtime "+${retention_days}" -delete
    echo "PostgreSQL backup completed"
  else
    rm -f "$temporary"
    echo "PostgreSQL backup failed" >&2
  fi

  sleep "$interval"
done
