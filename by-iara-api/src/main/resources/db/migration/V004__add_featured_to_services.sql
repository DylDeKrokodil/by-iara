alter table services add column featured boolean not null default false;
create index idx_services_featured on services(featured);
