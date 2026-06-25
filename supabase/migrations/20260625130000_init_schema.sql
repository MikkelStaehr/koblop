-- ============================================================================
-- Driwe — kerneschema (multi-tenant SaaS)
-- ============================================================================
-- Modellen følger den MODERNISEREDE køreuddannelse, gældende fra 1.7.2026
-- (Bek. 1150/1151 af 26/09/2025 + Færdselsstyrelsens undervisningsplan):
--   * Kategori B = 5 moduler, 30 teori + 24 praksis = 54 obligatoriske lektioner.
--   * Moduler gennemføres SEKVENTIELT (modul N+1 åbner når N er godkendt).
--   * Inden for et modul: teori-før-praksis (praksis kan først bookes når
--     modulets teori er gennemført).
--
-- Tabeller:
--   schools (tenant) -> profiles (admin/instructor/student), resources
--   categories -> modules, additional_requirements           (central læreplan)
--   enrollments -> module_progress, lesson_progress, enrollment_requirements
--   availability_rules/_exceptions, bookings                 (booking-motoren)
-- ============================================================================

-- ---------- Enums ----------------------------------------------------------
create type user_role        as enum ('admin', 'instructor', 'student');
create type lesson_type      as enum ('teori', 'praksis');
create type practical_venue  as enum ('teorilokale', 'vej', 'lukket_oevelsesplads', 'koereteknisk_anlaeg');
create type lesson_status    as enum ('ikke_planlagt', 'planlagt', 'gennemfoert', 'godkendt');
create type module_status    as enum ('laast', 'i_gang', 'afventer_godkendelse', 'gennemfoert');
create type enrollment_status as enum ('active', 'completed', 'paused');
create type booking_status   as enum ('booked', 'completed', 'cancelled');
create type exception_type   as enum ('block', 'extra');
create type requirement_type as enum ('kursus', 'proeve');

-- ---------- Tenant & brugere ----------------------------------------------
create table schools (
  id                        uuid primary key default gen_random_uuid(),
  name                      text not null,
  cancellation_window_hours int  not null default 24,
  created_at                timestamptz not null default now()
);

create table profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  school_id  uuid references schools(id) on delete cascade,
  role       user_role not null,
  full_name  text,
  email      text,
  phone      text,
  created_at timestamptz not null default now()
);
create index profiles_school_idx on profiles(school_id);

-- ---------- Læreplan (central — ingen school_id) ---------------------------
create table categories (
  id                           uuid primary key default gen_random_uuid(),
  code                         text not null unique,        -- 'B', 'A', ...
  name                         text not null,
  -- Regler fra bekendtgørelsen (kan variere pr. kategori)
  max_selvstudium_lessons      int  not null default 7,     -- §25 (kat. B)
  max_lessons_per_day          int  not null default 8,     -- §21-22
  max_practical_lessons_per_day int not null default 3,
  valid_from                   date,                         -- fx 2026-07-01
  created_at                   timestamptz not null default now()
);

create table modules (
  id                      uuid primary key default gen_random_uuid(),
  category_id             uuid not null references categories(id) on delete cascade,
  order_index             int not null,                     -- sekventiel rækkefølge
  title                   text not null,
  description             text,
  min_theory_lessons      int not null default 0,
  min_practical_lessons   int not null default 0,
  -- Standard-lokation for praksislektioner i modulet (kan ændres pr. lektion).
  default_practical_venue practical_venue,
  practical_venues        practical_venue[] not null default '{}',
  -- Delmål/emner fra undervisningsplanen (checklist-UI). Udfyldes løbende.
  topics                  text[] not null default '{}',
  created_at              timestamptz not null default now(),
  unique (category_id, order_index)
);
create index modules_category_idx on modules(category_id);

-- Krav uden for modulerne, men betingelser for at indstille til prøve.
create table additional_requirements (
  id          uuid primary key default gen_random_uuid(),
  category_id uuid not null references categories(id) on delete cascade,
  code        text not null,
  title       text not null,
  description text,
  type        requirement_type not null,
  order_index int not null default 0,
  unique (category_id, code)
);

-- ---------- Elevforløb -----------------------------------------------------
create table enrollments (
  id                    uuid primary key default gen_random_uuid(),
  school_id             uuid not null references schools(id) on delete cascade,
  student_id            uuid not null references profiles(id) on delete cascade,
  category_id           uuid not null references categories(id),
  primary_instructor_id uuid references profiles(id),
  status                enrollment_status not null default 'active',
  -- Styrer overgangsordning (elever startet før 1.7.2026 = gamle regler).
  started_at            timestamptz not null default now(),
  unique (student_id, category_id)
);
create index enrollments_school_idx     on enrollments(school_id);
create index enrollments_student_idx    on enrollments(student_id);
create index enrollments_instructor_idx on enrollments(primary_instructor_id);

create table module_progress (
  id             uuid primary key default gen_random_uuid(),
  enrollment_id  uuid not null references enrollments(id) on delete cascade,
  module_id      uuid not null references modules(id),
  order_index    int  not null,                              -- denormaliseret for advance-trigger
  status         module_status not null default 'laast',
  -- Kun kørelæreren underskriver modulet (modulplan-dokumentation).
  signed_off_by  uuid references profiles(id),
  signed_off_at  timestamptz,
  unique (enrollment_id, module_id)
);
create index module_progress_enrollment_idx on module_progress(enrollment_id);

create table lesson_progress (
  id            uuid primary key default gen_random_uuid(),
  enrollment_id uuid not null references enrollments(id) on delete cascade,
  module_id     uuid not null references modules(id),
  lesson_no     int  not null,                               -- nr. inden for type i modulet
  type          lesson_type not null,
  venue         practical_venue not null,
  status        lesson_status not null default 'ikke_planlagt',
  scheduled_at  timestamptz,
  completed_at  timestamptz,
  -- Kun kørelæreren godkender — elev kan ikke selv godkende.
  approved_by   uuid references profiles(id),
  selvstudium   boolean not null default false,
  note          text,
  unique (enrollment_id, module_id, type, lesson_no)
);
create index lesson_progress_enrollment_idx on lesson_progress(enrollment_id);
create index lesson_progress_module_idx     on lesson_progress(enrollment_id, module_id);

create table enrollment_requirements (
  id             uuid primary key default gen_random_uuid(),
  enrollment_id  uuid not null references enrollments(id) on delete cascade,
  requirement_id uuid not null references additional_requirements(id),
  completed      boolean not null default false,
  completed_at   timestamptz,
  unique (enrollment_id, requirement_id)
);

-- ---------- Ressourcer & tilgængelighed ------------------------------------
create table resources (
  id        uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools(id) on delete cascade,
  name      text not null,
  type      text not null default 'car',
  active    boolean not null default true
);
create index resources_school_idx on resources(school_id);

create table availability_rules (
  id            uuid primary key default gen_random_uuid(),
  school_id     uuid not null references schools(id) on delete cascade,
  instructor_id uuid not null references profiles(id) on delete cascade,
  weekday       int  not null check (weekday between 0 and 6),  -- 0 = søndag
  start_time    time not null,
  end_time      time not null,
  valid_from    date,
  valid_to      date,
  check (start_time < end_time)
);
create index availability_rules_instructor_idx on availability_rules(instructor_id);

create table availability_exceptions (
  id            uuid primary key default gen_random_uuid(),
  school_id     uuid not null references schools(id) on delete cascade,
  instructor_id uuid not null references profiles(id) on delete cascade,
  date          date not null,
  type          exception_type not null,
  start_time    time,
  end_time      time
);
create index availability_exceptions_instructor_idx on availability_exceptions(instructor_id, date);

-- ---------- Bookinger ------------------------------------------------------
-- En booking planlægger ÉN lektion (typisk praksis, 1-til-1). Booking-triggeren
-- nedenfor synker lektionens status (planlagt/gennemført/aflyst).
create table bookings (
  id            uuid primary key default gen_random_uuid(),
  school_id     uuid not null references schools(id) on delete cascade,
  enrollment_id uuid not null references enrollments(id) on delete cascade,
  lesson_id     uuid not null references lesson_progress(id) on delete cascade,
  instructor_id uuid not null references profiles(id),
  resource_id   uuid references resources(id),
  start_at      timestamptz not null,
  end_at        timestamptz not null,
  status        booking_status not null default 'booked',
  cancelled_by  uuid references profiles(id),
  cancelled_at  timestamptz,
  created_at    timestamptz not null default now(),
  check (start_at < end_at)
);
create index bookings_instructor_time_idx on bookings(instructor_id, start_at);
create index bookings_resource_time_idx   on bookings(resource_id, start_at);
create index bookings_enrollment_idx      on bookings(enrollment_id);
create index bookings_lesson_idx          on bookings(lesson_id);

-- ============================================================================
-- Hjælpefunktioner (security definer → omgår RLS, bruges af politikker)
-- ============================================================================
create or replace function public.current_school_id()
returns uuid language sql stable security definer set search_path = public as $$
  select school_id from profiles where id = auth.uid()
$$;

create or replace function public.current_user_role()
returns user_role language sql stable security definer set search_path = public as $$
  select role from profiles where id = auth.uid()
$$;

-- ============================================================================
-- Forretningslogik
-- ============================================================================

-- Ved oprettelse af enrollment: generér modul- og lektions-placeholders for
-- hele kategorien. Modul 1 -> 'i_gang', resten 'laast'. Plus krav-rækker.
create or replace function public.seed_enrollment_progress()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  m record;
  i int;
begin
  for m in
    select * from modules where category_id = new.category_id order by order_index
  loop
    insert into module_progress (enrollment_id, module_id, order_index, status)
    values (
      new.id, m.id, m.order_index,
      case when m.order_index = 1 then 'i_gang' else 'laast' end::module_status
    );

    for i in 1..coalesce(m.min_theory_lessons, 0) loop
      insert into lesson_progress (enrollment_id, module_id, lesson_no, type, venue)
      values (new.id, m.id, i, 'teori', 'teorilokale');
    end loop;

    for i in 1..coalesce(m.min_practical_lessons, 0) loop
      insert into lesson_progress (enrollment_id, module_id, lesson_no, type, venue)
      values (new.id, m.id, i, 'praksis', coalesce(m.default_practical_venue, 'vej'));
    end loop;
  end loop;

  insert into enrollment_requirements (enrollment_id, requirement_id)
  select new.id, ar.id
  from additional_requirements ar
  where ar.category_id = new.category_id;

  return new;
end;
$$;

create trigger trg_enrollment_seed
after insert on enrollments
for each row execute function public.seed_enrollment_progress();

-- Når et modul markeres 'gennemfoert': åbn næste modul (order+1) fra 'laast'.
create or replace function public.advance_modules()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'gennemfoert' and new.status is distinct from old.status then
    update module_progress
    set status = 'i_gang'
    where enrollment_id = new.enrollment_id
      and status = 'laast'
      and order_index = new.order_index + 1;
  end if;
  return new;
end;
$$;

create trigger trg_module_advance
after update on module_progress
for each row execute function public.advance_modules();

-- Synk lektionsstatus ud fra booking-livscyklus (security definer → eleven kan
-- booke uden direkte skriveadgang til lesson_progress).
create or replace function public.sync_lesson_on_booking()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    update lesson_progress
    set status = 'planlagt', scheduled_at = new.start_at
    where id = new.lesson_id and status = 'ikke_planlagt';
  elsif tg_op = 'UPDATE' then
    if new.status = 'cancelled' and old.status is distinct from 'cancelled' then
      update lesson_progress
      set status = 'ikke_planlagt', scheduled_at = null
      where id = new.lesson_id and status = 'planlagt';
    elsif new.status = 'completed' and old.status is distinct from 'completed' then
      update lesson_progress
      set status = 'gennemfoert', completed_at = now()
      where id = new.lesson_id;
    end if;
  end if;
  return new;
end;
$$;

create trigger trg_booking_sync
after insert or update on bookings
for each row execute function public.sync_lesson_on_booking();
