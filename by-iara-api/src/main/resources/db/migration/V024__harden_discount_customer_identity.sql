alter table reservation_discounts add column customer_identity_key varchar(255);

update reservation_discounts rd
set customer_identity_key = case
    when split_part(lower(trim(c.email)), '@', 2) in ('gmail.com', 'googlemail.com') then
        replace(split_part(split_part(lower(trim(c.email)), '@', 1), '+', 1), '.', '') || '@gmail.com'
    else
        split_part(split_part(lower(trim(c.email)), '@', 1), '+', 1) || '@' ||
        split_part(lower(trim(c.email)), '@', 2)
end
from customers c
where c.id = rd.customer_id;

alter table reservation_discounts alter column customer_identity_key set not null;

create index idx_reservation_discounts_identity
    on reservation_discounts(discount_id, customer_identity_key, status);
