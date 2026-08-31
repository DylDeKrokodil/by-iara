update service_translations
set description = 'Uma massagem suave e envolvente para aliviar a tensão, acalmar o ritmo e proporcionar um descanso profundo.'
where locale = 'pt-PT'
  and slug = 'massagem-relaxante';

update service_translations
set description = 'A gentle, comforting massage designed to ease tension, slow the pace and support deep rest.'
where locale = 'en-US'
  and slug = 'relaxing-massage';

update services service
set description = translation.description,
    updated_at = now()
from service_translations translation
where translation.service_id = service.id
  and translation.locale = 'pt-PT'
  and translation.slug = 'massagem-relaxante';
