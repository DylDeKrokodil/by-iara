create table admin_login_attempts (
    id bigserial primary key,
    scope varchar(40) not null,
    key_hash varchar(64) not null,
    failed_at timestamp with time zone not null default now(),
    constraint ck_admin_login_attempts_scope
        check (scope in ('CLIENT', 'CLIENT_EMAIL'))
);

create index idx_admin_login_attempts_lookup
    on admin_login_attempts (scope, key_hash, failed_at);

create index idx_admin_login_attempts_cleanup
    on admin_login_attempts (failed_at);
