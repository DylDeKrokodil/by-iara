alter table reservations
    add column rejection_reason_code varchar(40),
    add column rejection_message varchar(1000),
    add column decided_at timestamp with time zone;

alter table reservations
    add constraint reservations_rejection_reason_valid
        check (
            rejection_reason_code is null or rejection_reason_code in (
                'TIME_UNAVAILABLE',
                'SERVICE_UNAVAILABLE',
                'OUTSIDE_BUSINESS_HOURS',
                'UNABLE_TO_ACCOMMODATE',
                'OTHER'
            )
        );

