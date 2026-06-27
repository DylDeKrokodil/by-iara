create table availability_rules (
    id uuid primary key default gen_random_uuid(),
    day_of_week integer not null,
    start_time time without time zone not null,
    end_time time without time zone not null,
    created_at timestamp with time zone not null default now(),
    updated_at timestamp with time zone not null default now(),
    constraint availability_rules_day_of_week_range check (day_of_week between 1 and 7),
    constraint availability_rules_time_range check (start_time < end_time),
    constraint availability_rules_unique_shift unique (day_of_week, start_time, end_time)
);

create table availability_blocks (
    id uuid primary key default gen_random_uuid(),
    start_time timestamp with time zone not null,
    end_time timestamp with time zone not null,
    reason varchar(255),
    created_at timestamp with time zone not null default now(),
    updated_at timestamp with time zone not null default now(),
    constraint availability_blocks_time_range check (start_time < end_time)
);

create index idx_availability_rules_day on availability_rules(day_of_week);
create index idx_availability_blocks_range on availability_blocks(start_time, end_time);
