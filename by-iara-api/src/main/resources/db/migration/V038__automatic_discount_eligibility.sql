alter table discounts alter column max_uses_per_customer drop not null;
alter table discounts add column first_time_customers_only boolean not null default false;
update discounts set max_uses_per_customer = null where audience = 'AUTOMATIC';
alter table discounts drop constraint discounts_automatic_scope_valid;
alter table discounts add constraint discounts_automatic_scope_valid check (
    audience <> 'AUTOMATIC' or (scope = 'SELECTED_SERVICES' and customer_id is null
    and max_unique_clients is null and public_code is null)
);

alter table discounts drop constraint discounts_public_display;
alter table discounts add constraint discounts_public_display check (
    audience = 'PUBLIC' or (audience = 'AUTOMATIC' and public_code is null)
    or (public_code is null and featured = false)
);
create function discount_customer_identity(email text) returns text
language sql immutable strict parallel safe as $$
    select case when split_part(lower(trim(email)), '@', 2) in ('gmail.com', 'googlemail.com')
        then replace(split_part(split_part(lower(trim(email)), '@', 1), '+', 1), '.', '') || '@gmail.com'
        else split_part(split_part(lower(trim(email)), '@', 1), '+', 1) || '@' || split_part(lower(trim(email)), '@', 2)
    end
$$;
create index idx_customers_discount_identity on customers (discount_customer_identity(email));
