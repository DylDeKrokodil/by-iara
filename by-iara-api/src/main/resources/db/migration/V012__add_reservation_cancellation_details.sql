alter table reservations
    add column cancellation_reason_code varchar(40),
    add column cancellation_message varchar(1000);

alter table reservations
    add constraint reservations_cancellation_reason_valid
        check (
            cancellation_reason_code is null or cancellation_reason_code in (
                'SCHEDULE_CHANGE',
                'PRACTITIONER_UNAVAILABLE',
                'BUSINESS_CLOSURE',
                'CUSTOMER_REQUEST',
                'OTHER'
            )
        );
