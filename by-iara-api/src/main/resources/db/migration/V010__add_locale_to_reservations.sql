alter table reservations
    add column locale varchar(5) not null default 'en';
