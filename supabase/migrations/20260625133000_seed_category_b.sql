-- ============================================================================
-- Læreplan: Kategori B (personbil) — central reference-data
-- ============================================================================
-- Gældende fra 1.7.2026 (Bek. 1150/1151 af 26/09/2025 + Færdselsstyrelsens
-- undervisningsplan for kategori B). 5 moduler: 30 teori + 24 praksis = 54.
--
-- Lektionstal pr. modul er fra de officielle kilder. Modultitler/-beskrivelser
-- er vejledende; `topics` (delmål) udfyldes fra undervisningsplan-PDF'en senere.
-- ============================================================================

insert into categories
  (code, name, max_selvstudium_lessons, max_lessons_per_day, max_practical_lessons_per_day, valid_from)
values
  ('B', 'Kategori B – Personbil', 7, 8, 3, date '2026-07-01')
on conflict (code) do nothing;

-- ---------- Moduler --------------------------------------------------------
with cat as (select id from categories where code = 'B')
insert into modules
  (category_id, order_index, title, description,
   min_theory_lessons, min_practical_lessons, default_practical_venue, practical_venues)
select cat.id, v.ord, v.title, v.descr, v.teori, v.praksis,
       v.def_venue::practical_venue, v.venues::practical_venue[]
from cat, (values
  (1, 'Modul 1 – Grundlæggende trafikforståelse',
      'Fundamentet: trafikkens grundregler, ansvar, holdning og adfærd. Ren teori før eleven kommer bag rattet.',
      7, 0, null, array['teorilokale']),
  (2, 'Modul 2 – Bilen og grundlæggende manøvrer',
      'Bilens indretning, betjening og udstyr + første praktiske manøvrer på lukket øvelsesplads (manøvrebane).',
      5, 3, 'lukket_oevelsesplads', array['teorilokale','lukket_oevelsesplads']),
  (3, 'Modul 3 – Kørsel i trafik',
      'Køretøjers manøvreegenskaber, trafikantadfærd og de første manøvrer på vej i mindre kompleks trafik.',
      8, 6, 'vej', array['teorilokale','vej']),
  (4, 'Modul 4 – Kompleks trafik',
      'Vejforhold og kørsel i mere krævende trafik: tæt bytrafik, vognbaneskift, komplekse kryds, landevej/motorvej.',
      9, 6, 'vej', array['teorilokale','vej']),
  (5, 'Modul 5 – Køreteknik og prøveforberedelse',
      'Øvelser på køreteknisk anlæg (glatbane) + samling af alle færdigheder og forberedelse til praktisk prøve.',
      1, 9, 'koereteknisk_anlaeg', array['teorilokale','koereteknisk_anlaeg','vej'])
) as v(ord, title, descr, teori, praksis, def_venue, venues);

-- ---------- Krav uden for modulerne ----------------------------------------
with cat as (select id from categories where code = 'B')
insert into additional_requirements (category_id, code, title, description, type, order_index)
select cat.id, v.code, v.title, v.descr, v.rtype::requirement_type, v.ord
from cat, (values
  ('foerstehjaelp', 'Færdselsrelateret førstehjælp',
   'Lovpligtigt førstehjælpskursus. Skal være gennemført før indstilling til praktisk prøve. Typisk ekstern udbyder.',
   'kursus', 1),
  ('teoriproeve', 'Teoriprøve',
   'Bestås hos politiet/prøvesagkyndig.', 'proeve', 2),
  ('praktisk-proeve', 'Praktisk prøve',
   'Aflægges efter alle moduler er godkendt af kørelæreren.', 'proeve', 3)
) as v(code, title, descr, rtype, ord);
