alter table discounts drop constraint discounts_personal_customer;

alter table discounts
    add constraint discounts_personal_customer check (
        (audience = 'PERSONAL' and customer_id is not null)
        or (audience in ('PUBLIC', 'AUTOMATIC') and customer_id is null)
    );
