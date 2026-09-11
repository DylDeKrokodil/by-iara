insert into application_settings (setting_key, setting_value)
values ('minimum_booking_notice_hours', '0')
on conflict (setting_key) do nothing;
