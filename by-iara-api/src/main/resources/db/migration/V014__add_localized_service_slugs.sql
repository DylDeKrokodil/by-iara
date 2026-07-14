alter table service_translations
    add column slug varchar(140);

with localized_slugs as (
    select
        translation.service_id,
        translation.locale,
        case
            when translation.locale = 'en-US' then
                coalesce(
                    nullif(trim(both '-' from lower(regexp_replace(translation.name, '[^a-zA-Z0-9]+', '-', 'g'))), ''),
                    'service'
                )
            else service.slug
        end as base_slug
    from service_translations translation
    join services service on service.id = translation.service_id
), unique_localized_slugs as (
    select
        service_id,
        locale,
        base_slug,
        row_number() over (
            partition by lower(locale), lower(base_slug)
            order by service_id
        ) as duplicate_number
    from localized_slugs
)
update service_translations translation
set slug = case
    when localized.duplicate_number = 1 then localized.base_slug
    else localized.base_slug || '-' || localized.duplicate_number
end
from unique_localized_slugs localized
where translation.service_id = localized.service_id
  and translation.locale = localized.locale;

alter table service_translations
    alter column slug set not null;

create unique index uq_service_translations_locale_slug
    on service_translations (lower(locale), lower(slug));
