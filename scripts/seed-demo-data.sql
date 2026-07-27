\set ON_ERROR_STOP on

begin;

-- This seed is intentionally safe to rerun. It only removes records carrying
-- the deterministic demo IDs, email domain, slugs, or description prefix below.
delete from reservation_discounts
where id in (
    select md5('demo-reservation-discount-' || n)::uuid
    from generate_series(1, 180) as n
);

delete from discount_services
where discount_id in (
    select md5('demo-discount-' || n)::uuid
    from generate_series(1, 10) as n
);

delete from discounts
where id in (
    select md5('demo-discount-' || n)::uuid
    from generate_series(1, 10) as n
);

delete from pack_redemptions
where id in (
    select md5('demo-pack-redemption-' || n)::uuid
    from generate_series(1, 20) as n
);

delete from customer_packs
where id in (
    select md5('demo-customer-pack-' || n)::uuid
    from generate_series(1, 20) as n
);

delete from pack_offers
where id in (
    select md5('demo-pack-offer-' || n)::uuid
    from generate_series(1, 10) as n
);

delete from customer_access_tokens
where customer_id in (
    select id from customers where email like 'demo+%@example.com'
);

delete from reservation_payments
where reservation_id in (
    select id
    from reservations
    where id in (
        select md5('demo-reservation-' || n)::uuid
        from generate_series(1, 180) as n
    )
);

delete from email_logs
where reservation_id in (
    select md5('demo-reservation-' || n)::uuid
    from generate_series(1, 180) as n
);

delete from reservations
where id in (
    select md5('demo-reservation-' || n)::uuid
    from generate_series(1, 180) as n
);

delete from expenses where description like '[DEMO]%';
delete from customers where email like 'demo+%@example.com';
delete from services where slug like 'demo-%';

with service_seed(id, slug, name, description, featured, sort_order) as (
    values
        (
            md5('demo-service-relaxing')::uuid,
            'demo-massagem-relaxante',
            'Massagem Relaxante',
            'Movimentos suaves e contínuos para aliviar tensão e promover descanso.',
            true,
            10
        ),
        (
            md5('demo-service-deep-tissue')::uuid,
            'demo-massagem-tecido-profundo',
            'Massagem de Tecido Profundo',
            'Trabalho focado para zonas de tensão muscular persistente.',
            false,
            20
        ),
        (
            md5('demo-service-lymphatic')::uuid,
            'demo-drenagem-linfatica',
            'Drenagem Linfática',
            'Técnica leve e ritmada orientada para conforto e bem-estar.',
            false,
            30
        ),
        (
            md5('demo-service-prenatal')::uuid,
            'demo-massagem-pre-natal',
            'Massagem Pré-natal',
            'Sessão adaptada para conforto durante a gravidez.',
            false,
            40
        )
)
insert into services (id, slug, name, description, active, featured, sort_order)
select id, slug, name, description, true, featured, sort_order
from service_seed;

with variant_seed(id, service_id, duration_minutes, price_cents, sort_order) as (
    values
        (md5('demo-variant-relaxing-60')::uuid, md5('demo-service-relaxing')::uuid, 60, 5000::bigint, 10),
        (md5('demo-variant-relaxing-90')::uuid, md5('demo-service-relaxing')::uuid, 90, 7000::bigint, 20),
        (md5('demo-variant-deep-tissue-60')::uuid, md5('demo-service-deep-tissue')::uuid, 60, 6000::bigint, 10),
        (md5('demo-variant-deep-tissue-90')::uuid, md5('demo-service-deep-tissue')::uuid, 90, 8000::bigint, 20),
        (md5('demo-variant-lymphatic-60')::uuid, md5('demo-service-lymphatic')::uuid, 60, 5500::bigint, 10),
        (md5('demo-variant-lymphatic-90')::uuid, md5('demo-service-lymphatic')::uuid, 90, 7500::bigint, 20),
        (md5('demo-variant-prenatal-60')::uuid, md5('demo-service-prenatal')::uuid, 60, 5500::bigint, 10),
        (md5('demo-variant-prenatal-90')::uuid, md5('demo-service-prenatal')::uuid, 90, 7500::bigint, 20)
)
insert into service_variants (
    id, service_id, duration_minutes, price_cents, currency, active, sort_order
)
select id, service_id, duration_minutes, price_cents, 'EUR', true, sort_order
from variant_seed;

with translation_seed(
    service_id, locale, slug, name, description,
    treatment_description, suitable_for, session_description
) as (
    values
        (
            md5('demo-service-relaxing')::uuid, 'pt-PT', 'demo-massagem-relaxante',
            'Massagem Relaxante', 'Uma pausa tranquila para corpo e mente.',
            'Movimentos lentos e envolventes ajudam a libertar tensão.',
            'Stress, cansaço ou tensão muscular ligeira.',
            'A pressão é ajustada ao conforto do cliente.'
        ),
        (
            md5('demo-service-relaxing')::uuid, 'en-US', 'demo-relaxing-massage',
            'Relaxing Massage', 'A calm pause for body and mind.',
            'Slow, flowing movements help release everyday tension.',
            'Stress, tiredness, or mild muscular tension.',
            'Pressure is adjusted to the customer’s comfort.'
        ),
        (
            md5('demo-service-deep-tissue')::uuid, 'pt-PT', 'demo-massagem-tecido-profundo',
            'Massagem de Tecido Profundo', 'Trabalho localizado sobre tensão persistente.',
            'Técnicas firmes e progressivas focam zonas específicas.',
            'Tensão muscular acumulada e preferência por pressão firme.',
            'A sessão começa com uma breve avaliação de conforto.'
        ),
        (
            md5('demo-service-deep-tissue')::uuid, 'en-US', 'demo-deep-tissue-massage',
            'Deep Tissue Massage', 'Focused work for persistent tension.',
            'Firm, progressive techniques focus on specific areas.',
            'Accumulated muscular tension and a preference for firm pressure.',
            'The session begins with a short comfort assessment.'
        ),
        (
            md5('demo-service-lymphatic')::uuid, 'pt-PT', 'demo-drenagem-linfatica',
            'Drenagem Linfática', 'Toque leve, preciso e ritmado.',
            'Manobras suaves acompanham o ritmo natural do corpo.',
            'Quem procura uma sessão muito leve e relaxante.',
            'A sessão decorre com pressão suave e constante.'
        ),
        (
            md5('demo-service-lymphatic')::uuid, 'en-US', 'demo-lymphatic-drainage',
            'Lymphatic Drainage', 'Light, precise, rhythmic touch.',
            'Gentle movements follow the body’s natural rhythm.',
            'Anyone looking for a very light and relaxing session.',
            'The session uses consistently gentle pressure.'
        ),
        (
            md5('demo-service-prenatal')::uuid, 'pt-PT', 'demo-massagem-pre-natal',
            'Massagem Pré-natal', 'Conforto adaptado a cada fase da gravidez.',
            'Posicionamento e pressão são adaptados para maior conforto.',
            'Grávidas com autorização adequada para receber massagem.',
            'A posição é ajustada com almofadas de apoio.'
        ),
        (
            md5('demo-service-prenatal')::uuid, 'en-US', 'demo-prenatal-massage',
            'Prenatal Massage', 'Comfort adapted to each stage of pregnancy.',
            'Positioning and pressure are adapted for comfort.',
            'Pregnant clients with appropriate clearance for massage.',
            'Support cushions are used to adjust positioning.'
        )
)
insert into service_translations (
    service_id, locale, slug, name, description,
    treatment_description, suitable_for, session_description
)
select
    service_id, locale, slug, name, description,
    treatment_description, suitable_for, session_description
from translation_seed;

with customer_seed as (
    select
        n,
        md5('demo-customer-' || n)::uuid as id,
        (array[
            'Ana', 'Beatriz', 'Carla', 'Diana', 'Eva', 'Filipa',
            'Inês', 'Joana', 'Leonor', 'Mafalda', 'Mariana', 'Rita'
        ])[1 + ((n - 1) % 12)]
        || ' ' ||
        (array[
            'Almeida', 'Cardoso', 'Correia', 'Costa', 'Fernandes',
            'Gomes', 'Martins', 'Oliveira', 'Pereira', 'Rodrigues'
        ])[1 + ((n - 1) % 10)] as name
    from generate_series(1, 60) as n
)
insert into customers (id, name, email, phone, created_at, updated_at)
select
    id,
    name,
    'demo+' || lpad(n::text, 3, '0') || '@example.com',
    '+351 910 ' || lpad((100000 + n)::text, 6, '0'),
    current_timestamp - ((150 - n)::text || ' days')::interval,
    current_timestamp - ((n % 14)::text || ' days')::interval
from customer_seed;

with reservation_seed as (
    select
        n,
        md5('demo-reservation-' || n)::uuid as id,
        md5('demo-customer-' || (1 + ((n - 1) % 60)))::uuid as customer_id,
        floor((n - 1) / 3.0)::integer - 40 as day_offset,
        9 + (((n - 1) % 3) * 3) as hour_of_day,
        case ((n - 1) % 4)
            when 0 then md5('demo-service-relaxing')::uuid
            when 1 then md5('demo-service-deep-tissue')::uuid
            when 2 then md5('demo-service-lymphatic')::uuid
            else md5('demo-service-prenatal')::uuid
        end as service_id,
        case ((n - 1) % 4)
            when 0 then md5('demo-variant-relaxing-60')::uuid
            when 1 then md5('demo-variant-deep-tissue-60')::uuid
            when 2 then md5('demo-variant-lymphatic-60')::uuid
            else md5('demo-variant-prenatal-60')::uuid
        end as variant_id,
        case ((n - 1) % 4)
            when 0 then 'Massagem Relaxante'
            when 1 then 'Massagem de Tecido Profundo'
            when 2 then 'Drenagem Linfática'
            else 'Massagem Pré-natal'
        end as service_name,
        case ((n - 1) % 4)
            when 0 then 5000::bigint
            when 1 then 6000::bigint
            else 5500::bigint
        end as price_cents
    from generate_series(1, 180) as n
), normalized as (
    select
        seed.*,
        date_trunc('day', current_timestamp)
            + (seed.day_offset::text || ' days')::interval
            + (seed.hour_of_day::text || ' hours')::interval as starts_at,
        case
            when seed.day_offset < 0 and seed.n % 13 = 0 then 'NO_SHOW'
            when seed.day_offset < 0 and seed.n % 11 = 0 then 'CANCELLED'
            when seed.day_offset < 0 and seed.n % 17 = 0 then 'REJECTED'
            when seed.day_offset < 0 then 'COMPLETED'
            when seed.n % 9 = 0 then 'CANCELLED'
            when seed.n % 7 in (0, 3) then 'PENDING'
            else 'CONFIRMED'
        end as status
    from reservation_seed seed
)
insert into reservations (
    id, customer_id, service_id, service_variant_id,
    service_name, duration_minutes, price_cents, currency,
    starts_at, ends_at, status, notes, locale,
    rejection_reason_code, rejection_message, decided_at,
    cancellation_reason_code, cancellation_message,
    created_at, updated_at
)
select
    id,
    customer_id,
    service_id,
    variant_id,
    service_name,
    60,
    price_cents,
    'EUR',
    starts_at,
    starts_at + interval '60 minutes',
    status,
    case
        when n % 10 = 0 then 'Prefere o final da tarde, se houver alteração de horário.'
        when n % 7 = 0 then 'Primeira visita ao espaço.'
        else null
    end,
    case when n % 4 = 0 then 'en' else 'pt' end,
    case when status = 'REJECTED' then 'TIME_UNAVAILABLE' else null end,
    case when status = 'REJECTED' then 'O horário deixou de estar disponível.' else null end,
    case when status <> 'PENDING' then starts_at - interval '10 days' else null end,
    case when status = 'CANCELLED' then 'CUSTOMER_REQUEST' else null end,
    case when status = 'CANCELLED' then 'Cliente pediu reagendamento.' else null end,
    starts_at - interval '14 days',
    case when status = 'PENDING' then starts_at - interval '2 days' else starts_at - interval '10 days' end
from normalized;

insert into reservation_payments (
    id, reservation_id, amount_cents, currency, method, status,
    paid_at, reference, created_at, updated_at
)
select
    md5('demo-payment-primary-' || n)::uuid,
    reservation.id,
    case
        when n % 14 = 0 then reservation.price_cents / 2
        when n % 7 = 0 then reservation.price_cents / 2
        else reservation.price_cents
    end,
    'EUR',
    case n % 4
        when 0 then 'CASH'
        when 1 then 'BANK_TRANSFER'
        when 2 then 'CARD'
        else 'OTHER'
    end,
    'PAID',
    reservation.ends_at + interval '5 minutes',
    case when n % 4 = 1 then 'DEMO-TRF-' || lpad(n::text, 4, '0') else null end,
    reservation.ends_at + interval '5 minutes',
    reservation.ends_at + interval '5 minutes'
from generate_series(1, 180) as n
join reservations reservation
    on reservation.id = md5('demo-reservation-' || n)::uuid
where reservation.status = 'COMPLETED'
  and n % 6 <> 0;

insert into reservation_payments (
    id, reservation_id, amount_cents, currency, method, status,
    paid_at, reference, created_at, updated_at
)
select
    md5('demo-payment-secondary-' || n)::uuid,
    reservation.id,
    reservation.price_cents - (reservation.price_cents / 2),
    'EUR',
    'CASH',
    'PAID',
    reservation.ends_at + interval '10 minutes',
    null,
    reservation.ends_at + interval '10 minutes',
    reservation.ends_at + interval '10 minutes'
from generate_series(1, 180) as n
join reservations reservation
    on reservation.id = md5('demo-reservation-' || n)::uuid
where reservation.status = 'COMPLETED'
  and n % 14 = 0
  and n % 6 <> 0;

insert into email_logs (
    id, reservation_id, recipient, email_type, status, error_message, created_at
)
select
    md5('demo-email-log-' || n)::uuid,
    reservation.id,
    customer.email,
    case reservation.status
        when 'CONFIRMED' then 'RESERVATION_CONFIRMED'
        when 'REJECTED' then 'RESERVATION_REJECTED'
        when 'CANCELLED' then 'RESERVATION_CANCELLED'
        else 'RESERVATION_REQUEST_RECEIVED'
    end,
    case when n % 29 = 0 then 'FAILED' else 'SENT' end,
    case when n % 29 = 0 then '[DEMO] Temporary SMTP rejection' else null end,
    reservation.created_at + interval '2 minutes'
from generate_series(1, 180) as n
join reservations reservation
    on reservation.id = md5('demo-reservation-' || n)::uuid
join customers customer on customer.id = reservation.customer_id;

with expense_seed as (
    select
        n,
        (array[
            'RENT_UTILITIES', 'SUPPLIES', 'SOFTWARE', 'MARKETING',
            'PAYMENT_FEES', 'INSURANCE_LICENSES', 'TRAVEL', 'CONTRACTORS', 'OTHER'
        ])[1 + ((n - 1) % 9)] as category,
        (array[
            'Estúdio Lisboa', 'Makro', 'Hetzner', 'Meta Ads',
            'Banco', 'Seguradora', 'CP', 'Fotografia Studio', 'Loja Local'
        ])[1 + ((n - 1) % 9)] as vendor
    from generate_series(1, 60) as n
)
insert into expenses (
    id, category, amount_cents, currency, incurred_at, vendor,
    description, status, voided_at, created_at, updated_at
)
select
    md5('demo-expense-' || n)::uuid,
    category,
    (1200 + ((n * 173) % 18000))::bigint,
    'EUR',
    current_timestamp - ((n * 3)::text || ' days')::interval,
    vendor,
    '[DEMO] ' ||
        (array[
            'Renda e utilidades', 'Óleos e consumíveis', 'Alojamento e software',
            'Campanha promocional', 'Taxas de pagamento', 'Seguro profissional',
            'Deslocação', 'Produção de conteúdos', 'Despesa operacional'
        ])[1 + ((n - 1) % 9)],
    case when n % 19 = 0 then 'VOIDED' else 'ACTIVE' end,
    case
        when n % 19 = 0 then current_timestamp - ((n * 3 - 1)::text || ' days')::interval
        else null
    end,
    current_timestamp - ((n * 3)::text || ' days')::interval,
    current_timestamp - ((n * 3 - 1)::text || ' days')::interval
from expense_seed;

with offer_seed(id, service_id, duration_minutes, session_count, price_cents, sort_order) as (
    values
        (
            md5('demo-pack-offer-1')::uuid,
            md5('demo-service-relaxing')::uuid,
            60, 5, 22500::bigint, 10
        ),
        (
            md5('demo-pack-offer-2')::uuid,
            md5('demo-service-deep-tissue')::uuid,
            60, 5, 27000::bigint, 20
        ),
        (
            md5('demo-pack-offer-3')::uuid,
            md5('demo-service-lymphatic')::uuid,
            60, 5, 25000::bigint, 30
        ),
        (
            md5('demo-pack-offer-4')::uuid,
            md5('demo-service-prenatal')::uuid,
            60, 5, 25000::bigint, 40
        )
)
insert into pack_offers (
    id, service_id, duration_minutes, session_count, price_cents,
    currency, validity_days, active, sort_order
)
select
    id, service_id, duration_minutes, session_count, price_cents,
    'EUR', 180, true, sort_order
from offer_seed;

with eligible as (
    select
        reservation.*,
        row_number() over (order by reservation.starts_at desc, reservation.id) as seed_number
    from reservations reservation
    where reservation.id in (
        select md5('demo-reservation-' || n)::uuid
        from generate_series(1, 180) as n
    )
      and reservation.status = 'COMPLETED'
), selected as (
    select * from eligible where seed_number <= 16
)
insert into customer_packs (
    id, customer_id, pack_offer_id, originating_reservation_id,
    status, service_id, service_name, duration_minutes, total_sessions,
    validity_days, price_cents, currency, activated_at, expires_at,
    created_at, updated_at
)
select
    md5('demo-customer-pack-' || seed_number)::uuid,
    customer_id,
    case service_id
        when md5('demo-service-relaxing')::uuid then md5('demo-pack-offer-1')::uuid
        when md5('demo-service-deep-tissue')::uuid then md5('demo-pack-offer-2')::uuid
        when md5('demo-service-lymphatic')::uuid then md5('demo-pack-offer-3')::uuid
        else md5('demo-pack-offer-4')::uuid
    end,
    id,
    case
        when seed_number % 7 = 0 then 'EXHAUSTED'
        when seed_number % 11 = 0 then 'EXPIRED'
        else 'ACTIVE'
    end,
    service_id,
    service_name,
    duration_minutes,
    5,
    180,
    case service_id
        when md5('demo-service-relaxing')::uuid then 22500
        when md5('demo-service-deep-tissue')::uuid then 27000
        else 25000
    end,
    'EUR',
    starts_at,
    starts_at + interval '180 days',
    starts_at,
    starts_at
from selected;

insert into pack_redemptions (
    id, customer_pack_id, reservation_id, status,
    reserved_at, consumed_at, released_at, created_at, updated_at
)
select
    md5('demo-pack-redemption-' || seed_number)::uuid,
    customer_pack.id,
    redeemed_reservation.id,
    'CONSUMED',
    redeemed_reservation.created_at,
    redeemed_reservation.ends_at,
    null,
    redeemed_reservation.created_at,
    redeemed_reservation.ends_at
from generate_series(1, 16) as seed_number
join customer_packs customer_pack
    on customer_pack.id = md5('demo-customer-pack-' || seed_number)::uuid
cross join lateral (
    select reservation.*
    from reservations reservation
    where reservation.customer_id = customer_pack.customer_id
      and reservation.service_id = customer_pack.service_id
      and reservation.id <> customer_pack.originating_reservation_id
      and reservation.status = 'COMPLETED'
    order by reservation.starts_at desc
    limit 1
) redeemed_reservation;

with public_discounts(
    id, name, value_type, value_amount, currency, code, featured, starts_at, ends_at
) as (
    values
        (
            md5('demo-discount-1')::uuid, '[DEMO] Boas-vindas 10%',
            'PERCENTAGE', 10::bigint, null::varchar, 'DEMO10', true,
            current_timestamp - interval '30 days', current_timestamp + interval '120 days'
        ),
        (
            md5('demo-discount-2')::uuid, '[DEMO] Verão €5',
            'FIXED_AMOUNT', 500::bigint, 'EUR', 'VERAO5', false,
            current_timestamp - interval '15 days', current_timestamp + interval '60 days'
        ),
        (
            md5('demo-discount-3')::uuid, '[DEMO] Cliente frequente 15%',
            'PERCENTAGE', 15::bigint, null::varchar, 'FREQUENTE15', false,
            current_timestamp - interval '90 days', current_timestamp - interval '5 days'
        )
)
insert into discounts (
    id, name, audience, scope, value_type, value_amount, currency,
    starts_at, ends_at, max_unique_clients, max_uses_per_customer,
    code_hash, code_hint, customer_id, status, public_code, featured
)
select
    id,
    name,
    'PUBLIC',
    'ALL_SERVICES',
    value_type,
    value_amount,
    currency,
    starts_at,
    ends_at,
    100,
    1,
    encode(digest(code, 'sha256'), 'hex'),
    right(code, 4),
    null,
    case when ends_at < current_timestamp then 'ARCHIVED' else 'ACTIVE' end,
    code,
    featured
from public_discounts;

insert into reservation_discounts (
    id, reservation_id, discount_id, customer_id,
    discount_name, code_hint, value_type, value_amount,
    original_price_cents, discount_amount_cents, final_price_cents,
    currency, status, reserved_at, consumed_at, released_at,
    updated_at, customer_identity_key
)
select
    md5('demo-reservation-discount-' || n)::uuid,
    reservation.id,
    md5('demo-discount-1')::uuid,
    reservation.customer_id,
    '[DEMO] Boas-vindas 10%',
    'MO10',
    'PERCENTAGE',
    10,
    reservation.price_cents,
    reservation.price_cents / 10,
    reservation.price_cents - (reservation.price_cents / 10),
    'EUR',
    'CONSUMED',
    reservation.created_at,
    reservation.ends_at,
    null,
    reservation.ends_at,
    customer.email
from generate_series(1, 180) as n
join reservations reservation
    on reservation.id = md5('demo-reservation-' || n)::uuid
join customers customer on customer.id = reservation.customer_id
where reservation.status = 'COMPLETED'
  and n % 10 = 0;

commit;

\echo 'Demo data seeded successfully.'
