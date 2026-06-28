create table refresh_tokens (
    id uuid primary key default gen_random_uuid(),
    admin_user_id uuid not null references admin_users(id) on delete cascade,
    token_hash varchar(64) not null unique,
    expires_at timestamp with time zone not null,
    revoked_at timestamp with time zone,
    created_at timestamp with time zone not null default now()
);

create index idx_refresh_tokens_admin_user on refresh_tokens(admin_user_id);
