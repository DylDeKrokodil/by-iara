create table application_settings (
    setting_key varchar(120) primary key,
    setting_value varchar(500) not null,
    updated_at timestamp with time zone not null default now()
);

insert into application_settings (setting_key, setting_value)
values ('appointment_buffer_minutes', '15');
