alter table discounts drop constraint discounts_audience_valid;

alter table discounts
    add constraint discounts_audience_valid
    check (audience in ('PUBLIC', 'PERSONAL', 'AUTOMATIC'));

alter table discounts
    add constraint discounts_automatic_scope_valid
    check (audience <> 'AUTOMATIC' or (
        scope = 'SELECTED_SERVICES'
        and customer_id is null
        and max_unique_clients is null
        and featured = false
        and public_code is null
    ));

create index idx_discounts_automatic_period
    on discounts (audience, status, starts_at, ends_at)
    where audience = 'AUTOMATIC';
