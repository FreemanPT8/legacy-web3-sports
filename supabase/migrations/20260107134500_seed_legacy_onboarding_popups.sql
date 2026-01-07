-- Seed default onboarding popups for the main Legacy House
WITH upsert_popup AS (
  INSERT INTO public.onboarding_popups (
    id,
    house_key,
    title,
    body,
    highlights,
    badge_label,
    primary_cta,
    secondary_cta,
    status,
    priority,
    copy_i18n
  )
  VALUES
    (
      'legacy-popup-1',
      'LEGACY',
      'Bem-vindo à House of Legacy',
      'Fazes agora parte da House of Legacy — criada para orientar, não para pressionar.',
      ARRAY['Começa com clareza', '3 passos essenciais'],
      'XP 0',
      jsonb_build_object('label', '👉 Começar pelo essencial', 'href', '/education/xp'),
      jsonb_build_object('label', 'Conhecer a House', 'href', '/education/houses'),
      'published',
      0,
      jsonb_build_object(
        'pt', jsonb_build_object(
          'title', 'Bem-vindo à House of {{SPORT}}',
          'body', 'Parabéns pela tua entrada no Legacy. Fazes agora parte da House of {{SPORT}} — um espaço criado para orientar, não para pressionar.',
          'highlights', jsonb_build_array('Não precisas de saber tudo agora.', 'Começa com 3 passos essenciais.'),
          'badgeLabel', 'XP 0',
          'primaryCtaLabel', '👉 Começar pelo essencial',
          'secondaryCtaLabel', 'Conhecer a House'
        ),
        'en', jsonb_build_object(
          'title', 'Welcome to the House of {{SPORT}}',
          'body', 'You are now part of the House of {{SPORT}}, created to guide — not to pressure.',
          'highlights', jsonb_build_array('You don’t need to know everything yet.', 'Start with 3 curated steps.'),
          'badgeLabel', 'XP 0',
          'primaryCtaLabel', '👉 Start with the essentials',
          'secondaryCtaLabel', 'Explore the House'
        ),
        'es', jsonb_build_object(
          'title', 'Bienvenido a la House of {{SPORT}}',
          'body', 'Ahora formas parte de la House of {{SPORT}}, un espacio creado para orientar, no para presionar.',
          'highlights', jsonb_build_array('No necesitas saberlo todo ahora.', 'Empieza con 3 pasos esenciales.'),
          'badgeLabel', 'XP 0',
          'primaryCtaLabel', '👉 Empezar por lo esencial',
          'secondaryCtaLabel', 'Conocer la House'
        )
      )
    ),
    (
      'legacy-popup-2',
      'LEGACY',
      'Evita o erro mais comum',
      'No Legacy, o progresso vem da sequência, não da pressa.',
      ARRAY['Completa o perfil', 'Explora o Glossário', 'Curso “Começa Aqui”'],
      'XP 30',
      jsonb_build_object('label', 'Seguir o caminho recomendado', 'href', '/education/start'),
      jsonb_build_object('label', 'Abrir Glossário', 'href', '/education/glossary'),
      'published',
      1,
      jsonb_build_object(
        'pt', jsonb_build_object(
          'title', 'Antes de continuares, evita este erro comum',
          'body', 'Muitos utilizadores tentam explorar tudo ao mesmo tempo — e acabam perdidos.',
          'highlights', jsonb_build_array('Completa o perfil.', 'Explora o Glossário.', 'Faz o curso “Começa Aqui”.'),
          'badgeLabel', 'XP 30',
          'primaryCtaLabel', 'Seguir o caminho recomendado',
          'secondaryCtaLabel', 'Abrir Glossário'
        ),
        'en', jsonb_build_object(
          'title', 'Before moving on, avoid this common mistake',
          'body', 'Many users try to explore everything at once — and end up lost.',
          'highlights', jsonb_build_array('Complete your profile.', 'Explore the Glossary.', 'Start the “Start Here” course.'),
          'badgeLabel', 'XP 30',
          'primaryCtaLabel', 'Follow the recommended path',
          'secondaryCtaLabel', 'Open Glossary'
        ),
        'es', jsonb_build_object(
          'title', 'Antes de continuar, evita este error común',
          'body', 'Muchos usuarios intentan explorar todo a la vez — y terminan perdidos.',
          'highlights', jsonb_build_array('Completa el perfil.', 'Explora el Glosario.', 'Haz el curso “Empieza Aquí”.'),
          'badgeLabel', 'XP 30',
          'primaryCtaLabel', 'Seguir el camino recomendado',
          'secondaryCtaLabel', 'Abrir Glosario'
        )
      )
    ),
    (
      'legacy-popup-3',
      'LEGACY',
      'Hora de ganhar autonomia',
      'Para aproveitares o Legacy a sério, precisas do mínimo técnico.',
      ARRAY['Tutorial Metamask passo-a-passo', 'Base segura e auditada'],
      'XP 120',
      jsonb_build_object('label', 'Tutorial Metamask', 'href', '/education/tutorials/metamask'),
      jsonb_build_object('label', 'Ver fundamentos Web3', 'href', '/education/courses'),
      'published',
      2,
      jsonb_build_object(
        'pt', jsonb_build_object(
          'title', 'Está na hora de ganhares autonomia',
          'body', 'Sem autonomia técnica, ficas dependente de terceiros.',
          'highlights', jsonb_build_array('Tutorial Metamask seguro e guiado.', 'Sem jargão, sem confusão.'),
          'badgeLabel', 'XP 120',
          'primaryCtaLabel', 'Tutorial Metamask',
          'secondaryCtaLabel', 'Ver fundamentos Web3'
        ),
        'en', jsonb_build_object(
          'title', 'It’s time to gain autonomy',
          'body', 'Without basic technical autonomy, you depend on others.',
          'highlights', jsonb_build_array('Metamask tutorial (safe & guided).', 'No jargon, no confusion.'),
          'badgeLabel', 'XP 120',
          'primaryCtaLabel', 'Metamask tutorial',
          'secondaryCtaLabel', 'See Web3 fundamentals'
        ),
        'es', jsonb_build_object(
          'title', 'Es momento de ganar autonomía',
          'body', 'Sin autonomía técnica, dependes de otros.',
          'highlights', jsonb_build_array('Tutorial Metamask seguro y guiado.', 'Sin jerga, sin confusión.'),
          'badgeLabel', 'XP 120',
          'primaryCtaLabel', 'Tutorial Metamask',
          'secondaryCtaLabel', 'Ver fundamentos Web3'
        )
      )
    ),
    (
      'legacy-popup-4',
      'LEGACY',
      'Ecossistema & DAO1',
      'A DAO1 é uma das portas de entrada — com riscos e responsabilidade.',
      ARRAY['Acede apenas se fizer sentido', 'Caminho oficial da House'],
      'XP 250',
      jsonb_build_object('label', 'Acesso oficial DAO1', 'href', '/education/dao1'),
      jsonb_build_object('label', 'Ver ecossistema Apertum', 'href', '/education/ecosystem'),
      'published',
      3,
      jsonb_build_object(
        'pt', jsonb_build_object(
          'title', 'Se quiseres ir mais longe, este é o próximo passo',
          'body', 'O Legacy faz parte do ecossistema Apertum. Avança apenas se fizer sentido para ti.',
          'highlights', jsonb_build_array('DAO1 com riscos e oportunidades.', 'Caminho oficial, auditado pela House.'),
          'badgeLabel', 'XP 250',
          'primaryCtaLabel', 'Acesso oficial da House à DAO1',
          'secondaryCtaLabel', 'Ver ecossistema Apertum'
        ),
        'en', jsonb_build_object(
          'title', 'If you want to go further, this is the next step',
          'body', 'Legacy is part of the Apertum ecosystem. Proceed only if it makes sense to you.',
          'highlights', jsonb_build_array('DAO1: risks, opportunities, responsibility.', 'Official House path.'),
          'badgeLabel', 'XP 250',
          'primaryCtaLabel', 'Official House access to DAO1',
          'secondaryCtaLabel', 'View Apertum ecosystem'
        ),
        'es', jsonb_build_object(
          'title', 'Si quieres ir más lejos, este es el siguiente paso',
          'body', 'Legacy forma parte del ecosistema Apertum. Avanza solo si tiene sentido para ti.',
          'highlights', jsonb_build_array('DAO1: riesgos, oportunidades y responsabilidad.', 'Camino oficial de la House.'),
          'badgeLabel', 'XP 250',
          'primaryCtaLabel', 'Acceso oficial a la DAO1',
          'secondaryCtaLabel', 'Ver ecosistema Apertum'
        )
      )
    ),
    (
      'legacy-popup-5',
      'LEGACY',
      'Pronto para interagir com a House',
      'Já tens base suficiente para trocar ideias e contribuir.',
      ARRAY['Contacto humano opcional', 'Ritmo decidido por ti'],
      'XP 500',
      jsonb_build_object('label', 'Abrir House Hub', 'href', '/education/hub'),
      jsonb_build_object('label', 'Ver Houses ativas', 'href', '/education/houses'),
      'published',
      4,
      jsonb_build_object(
        'pt', jsonb_build_object(
          'title', 'Estás pronto para interagir com a House',
          'body', 'O contacto humano é opcional. O ritmo é teu.',
          'highlights', jsonb_build_array('Base sólida para contribuir.', 'Começa no House Hub.'),
          'badgeLabel', 'XP 500',
          'primaryCtaLabel', 'Abrir House Hub',
          'secondaryCtaLabel', 'Ver Houses ativas'
        ),
        'en', jsonb_build_object(
          'title', 'You’re ready to engage with the House',
          'body', 'Human contact is optional. The pace is yours.',
          'highlights', jsonb_build_array('Solid foundation to contribute.', 'Open the House Hub.'),
          'badgeLabel', 'XP 500',
          'primaryCtaLabel', 'Open House Hub',
          'secondaryCtaLabel', 'See active Houses'
        ),
        'es', jsonb_build_object(
          'title', 'Estás listo para interactuar con la House',
          'body', 'El contacto humano es opcional. El ritmo es tuyo.',
          'highlights', jsonb_build_array('Base sólida para contribuir.', 'Empieza en el House Hub.'),
          'badgeLabel', 'XP 500',
          'primaryCtaLabel', 'Abrir House Hub',
          'secondaryCtaLabel', 'Ver Houses activas'
        )
      )
    )
  ON CONFLICT (id) DO UPDATE SET
    house_key = EXCLUDED.house_key,
    title = EXCLUDED.title,
    body = EXCLUDED.body,
    highlights = EXCLUDED.highlights,
    badge_label = EXCLUDED.badge_label,
    primary_cta = EXCLUDED.primary_cta,
    secondary_cta = EXCLUDED.secondary_cta,
    status = EXCLUDED.status,
    priority = EXCLUDED.priority,
    copy_i18n = EXCLUDED.copy_i18n
  RETURNING id
)
INSERT INTO public.onboarding_triggers (popup_id, trigger_type, xp_min, metadata)
SELECT
  popup_id,
  'xp' AS trigger_type,
  xp_min,
  jsonb_build_object('label', label)
FROM (
  VALUES
    ('legacy-popup-1', 0, 'XP 0 - primeiro login'),
    ('legacy-popup-2', 30, 'XP 30 - orientação inicial'),
    ('legacy-popup-3', 120, 'XP 120 - autonomia técnica'),
    ('legacy-popup-4', 250, 'XP 250 - ecossistema Apertum'),
    ('legacy-popup-5', 500, 'XP 500 - integração na House')
) as data(popup_id, xp_min, label)
ON CONFLICT (popup_id) DO UPDATE SET
  xp_min = EXCLUDED.xp_min,
  metadata = EXCLUDED.metadata;
