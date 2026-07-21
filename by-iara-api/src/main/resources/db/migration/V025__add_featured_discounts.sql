alter table discounts
    add column public_code varchar(100),
    add column featured boolean not null default false;

alter table discounts
    add constraint discounts_public_display check (
        (audience = 'PUBLIC')
        or (public_code is null and featured = false)
    );

create unique index uq_discounts_single_featured
    on discounts (featured)
    where featured = true;

create index idx_discounts_featured_period
    on discounts (featured, status, starts_at, ends_at);
