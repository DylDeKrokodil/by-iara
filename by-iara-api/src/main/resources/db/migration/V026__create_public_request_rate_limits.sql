create table public_request_rate_limits (
    scope varchar(40) not null,
    key_hash varchar(64) not null,
    window_started_at timestamp with time zone not null,
    request_count integer not null,
    updated_at timestamp with time zone not null default now(),
    primary key (scope, key_hash),
    constraint public_request_rate_limits_count_positive check (request_count > 0)
);

create index public_request_rate_limits_updated_at_idx
    on public_request_rate_limits (updated_at);
