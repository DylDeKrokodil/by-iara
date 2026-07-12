create table calendar_feed_tokens (
    id uuid primary key default gen_random_uuid(),
    admin_user_id uuid not null references admin_users(id) on delete cascade,
    token_hash varchar(64) not null unique,
    revoked_at timestamp with time zone,
    created_at timestamp with time zone not null default now()
);

create index idx_calendar_feed_tokens_admin_user on calendar_feed_tokens(admin_user_id);

create unique index idx_calendar_feed_tokens_admin_user_active
    on calendar_feed_tokens(admin_user_id)
    where revoked_at is null;
