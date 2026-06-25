-- ============================================================================
-- Læreplan: Kategori B (personbil) — central reference-data
-- ============================================================================
-- ⚠️  UDKAST: rækkefølge, varigheder og porte er en realistisk men FORELØBIG
--     model. Skal verificeres mod den officielle undervisningsplan til kat. B
--     før produktion. Strukturen (parallelle spor + porte) er den endelige.
--
-- Spor:
--   theory    -> afkrydses af lærer (typisk hold)
--   practical -> eleven booker køretime (1-til-1)
--   event     -> lærer opretter event (manøvrebane / glatbane / førstehjælp)
--
-- Porte (prerequisites): et modul åbner først når ALLE dets forudsætninger er
--   afkrydset. Teori-sporet løber sekventielt; hver køretime er gated af både
--   forrige køretime og et teorimodul -> "parallelle spor med porte".
-- ============================================================================

insert into categories (code, name)
values ('B', 'Kategori B – Personbil')
on conflict (code) do nothing;

-- ---------- Moduler --------------------------------------------------------
with cat as (select id from categories where code = 'B')
insert into modules (category_id, track, type, name, description, duration_minutes, order_index)
select cat.id, v.track::module_track, v.mtype::module_type, v.name, v.descr, v.dur, v.ord
from cat, (values
  (1,  'theory',    'theory',   'Teori 1 – Grundregler og ansvar',              'Trafikkens grundregler, førerens ansvar og pligter.',        90),
  (2,  'event',     'firstaid', 'Førstehjælp (lovpligtigt kursus)',             'Eksternt 8-timers færdselsrelateret førstehjælpskursus.',    480),
  (3,  'theory',    'theory',   'Teori 2 – Bilens indretning og betjening',     'Betjeningsudstyr, kontrol af bilen, lys og syn.',            90),
  (4,  'event',     'maneuver', 'Manøvrebane (lukket øvelsesplads)',            'Grundlæggende manøvrer på lukket bane før kørsel på vej.',    180),
  (5,  'theory',    'theory',   'Teori 3 – Igangsætning og standsning',         'Manøvrer, placering og hastighed i teori.',                  90),
  (6,  'practical', 'driving',  'Køretime 1 – Grundlæggende manøvrer',          'Første kørsel på vej i lidt trafikeret område.',             45),
  (7,  'theory',    'theory',   'Teori 4 – Vejkryds og vigepligt',              'Kryds, vigepligt, svingning og samspil.',                    90),
  (8,  'practical', 'driving',  'Køretime 2 – Kørsel i mindre trafik',          'Kryds og vigepligt i praksis.',                              45),
  (9,  'theory',    'theory',   'Teori 5 – Manøvrer på vej',                    'Overhaling, vognbaneskift og placering.',                    90),
  (10, 'practical', 'driving',  'Køretime 3 – Manøvrer og placering',           'Overhaling og placering i praksis.',                         45),
  (11, 'theory',    'theory',   'Teori 6 – Kørsel i større trafik',             'Kørsel i tættere trafik og bymæssig kørsel.',                90),
  (12, 'practical', 'driving',  'Køretime 4 – Større trafik',                   'Kørsel i mere trafikeret område.',                           45),
  (13, 'event',     'skidpad',  'Køreteknisk anlæg (glatbane)',                 'Eksternt køreteknisk kursus – manøvrering under risiko.',    240),
  (14, 'theory',    'theory',   'Teori 7 – Særlige risici, mørke og motorvej',  'Mørke, motorvej, vejr og særlige risikoforhold.',            90),
  (15, 'practical', 'driving',  'Køretime 5 – Mørke og motorvej',               'Kørsel i mørke og på motorvej.',                             45),
  (16, 'theory',    'theory',   'Teori 8 – Repetition og prøveforberedelse',    'Samlet repetition før teoriprøve.',                          90),
  (17, 'practical', 'driving',  'Køretime 6 – Eksamensforberedelse',            'Afsluttende kørsel før praktisk prøve.',                     45)
) as v(ord, track, mtype, name, descr, dur);

-- ---------- Porte (prerequisites) ------------------------------------------
with m as (
  select mo.id, mo.order_index
  from modules mo
  join categories c on c.id = mo.category_id and c.code = 'B'
)
insert into module_prerequisites (module_id, prerequisite_module_id)
select child.id, parent.id
from (values
  -- (modul, forudsætning) via order_index
  (3,1),                       -- Teori 2 efter Teori 1
  (4,3),                       -- Manøvrebane efter Teori 2
  (5,3),                       -- Teori 3 efter Teori 2
  (6,4),(6,5),                 -- Køretime 1: manøvrebane + Teori 3  (porten til vej)
  (7,5),                       -- Teori 4 efter Teori 3
  (8,6),(8,7),                 -- Køretime 2: køretime 1 + Teori 4
  (9,7),                       -- Teori 5 efter Teori 4
  (10,8),(10,9),               -- Køretime 3: køretime 2 + Teori 5
  (11,9),                      -- Teori 6 efter Teori 5
  (12,10),(12,11),             -- Køretime 4: køretime 3 + Teori 6
  (13,12),                     -- Glatbane efter køretime 4
  (14,11),                     -- Teori 7 efter Teori 6
  (15,13),(15,14),             -- Køretime 5: glatbane + Teori 7
  (16,14),                     -- Teori 8 efter Teori 7
  (17,15),(17,16)              -- Køretime 6: køretime 5 + Teori 8
) as e(child_ord, parent_ord)
join m child  on child.order_index  = e.child_ord
join m parent on parent.order_index = e.parent_ord;
