create extension if not exists pgcrypto;

create table admin_users (
    id uuid primary key default gen_random_uuid(),
    email varchar(255) not null unique,
    password_hash varchar(255) not null,
    role varchar(40) not null,
    active boolean not null default true,
    created_at timestamp with time zone not null default now(),
    updated_at timestamp with time zone not null default now()
);

create index idx_admin_users_active_email on admin_users(active, email);

insert into admin_users (email, password_hash, role, active)
values (
    'admin@by-iara.local',
    '$2a$10$GvjQhG4FYVRi1DVLyk4yFOBWL7fnAdKnOz6knMVTtygHQ0lkBdxcG',
    'ADMIN',
    true
);
