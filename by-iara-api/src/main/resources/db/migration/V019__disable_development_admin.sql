-- The original bootstrap account is documented publicly and must never remain
-- usable in production. Local Docker explicitly re-enables it after migrations.
update refresh_tokens
set revoked_at = now()
where admin_user_id in (
    select id from admin_users where email = 'admin@by-iara.local'
)
and revoked_at is null;

update admin_users
set active = false,
    updated_at = now()
where email = 'admin@by-iara.local';
