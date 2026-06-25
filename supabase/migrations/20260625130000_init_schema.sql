-- ============================================================================
-- Driwe — kerneschema
-- Planlægningsværktøj til kørelærere (multi-tenant SaaS)
-- ============================================================================
-- Modeller:
--   schools (tenant) -> profiles (admin/instructor/student), resources, events
--   categories -> modules -> module_prerequisites   (central, lovbestemt læreplan)
--   enrollments -> module_progress                  (elevens forløb)
--   availability_rules/_exceptions, bookings        (booking-motoren)
-- ============================================================================

-- ---------- Enums ----------------------------------------------------------
create type user_role            as enum ('admin', 'instructor', 'student');
create type module_track         as enum ('theory', 'practical', 'event');
create type module_type          as enum ('theory', 'driving', 'maneuver', 'skidpad', 'firstaid');
create type progress_status      as enum ('locked', 'available', 'booked', 'completed');
create type enrollment_status    as enum ('active', 'completed', 'paused');
create type booking_status       as enum ('booked', 'completed', 'cancelled');
create type exception_type       as enum ('block', 'extra');
create type signup_status        as enum ('signed_up', 'attended', 'cancelled');

-- ---------- Tenant & brugere ----------------------------------------------
create table schools (
  id                        uuid primary key default gen_random_uuid(),
  name                      text not null,
  cancellation_window_hours int  not null default 24,
  created_at                timestamptz not null default now()
);

-- En profil hænger på en Supabase auth-bruger og hører til præcis én skole.
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
  id         uuid primary key default gen_random_uuid(),
  code       text not null unique,         -- 'B', 'A', ...
  name       text not null,
  created_at timestamptz not null default now()
);

create table modules (
  id               uuid primary key default gen_random_uuid(),
  category_id      uuid not null references categories(id) on delete cascade,
  track            module_track not null,
  type             module_type  not null,
  name             text not null,
  description      text,
  duration_minutes int,                     -- lovbestemt varighed
  order_index      int not null,
  created_at       timestamptz not null default now(),
  unique (category_id, order_index)
);
create index modules_category_idx on modules(category_id);

-- Et modul bliver "available" når ALLE dets prerequisites er completed.
-- Det modellerer parallelle spor med porte: teori- og praktik-sporet løber
-- samtidigt, men en kant fra teori->køretime er "porten".
create table module_prerequisites (
  module_id              uuid not null references modules(id) on delete cascade,
  prerequisite_module_id uuid not null references modules(id) on delete cascade,
  primary key (module_id, prerequisite_module_id),
  check (module_id <> prerequisite_module_id)
);

-- ---------- Elevforløb -----------------------------------------------------
create table enrollments (
  id                    uuid primary key default gen_random_uuid(),
  school_id             uuid not null references schools(id) on delete cascade,
  student_id            uuid not null references profiles(id) on delete cascade,
  category_id           uuid not null references categories(id),
  primary_instructor_id uuid references profiles(id),
  status                enrollment_status not null default 'active',
  started_at            timestamptz not null default now(),
  unique (student_id, category_id)
);
create index enrollments_school_idx     on enrollments(school_id);
create index enrollments_student_idx    on enrollments(student_id);
create index enrollments_instructor_idx on enrollments(primary_instructor_id);

create table module_progress (
  id            uuid primary key default gen_random_uuid(),
  enrollment_id uuid not null references enrollments(id) on delete cascade,
  module_id     uuid not null references modules(id),
  status        progress_status not null default 'locked',
  completed_at  timestamptz,
  completed_by  uuid references profiles(id),
  unique (enrollment_id, module_id)
);
create index module_progress_enrollment_idx on module_progress(enrollment_id);

-- ---------- Ressourcer & tilgængelighed ------------------------------------
create table resources (
  id        uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools(id) on delete cascade,
  name      text not null,
  type      text not null default 'car',
  active    boolean not null default true
);
create index resources_school_idx on resources(school_id);

-- Fast ugeskema for en lærer (recurring).
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

-- Undtagelser: bloker en dag (ferie) eller åbn ekstra tid.
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
create table bookings (
  id            uuid primary key default gen_random_uuid(),
  school_id     uuid not null references schools(id) on delete cascade,
  enrollment_id uuid not null references enrollments(id) on delete cascade,
  module_id     uuid not null references modules(id),
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

-- ---------- Events (manøvrebane / glatbane / førstehjælp) ------------------
create table events (
  id            uuid primary key default gen_random_uuid(),
  school_id     uuid not null references schools(id) on delete cascade,
  instructor_id uuid not null references profiles(id),
  type          module_type not null,   -- maneuver / skidpad / firstaid
  title         text not null,
  location      text,
  start_at      timestamptz not null,
  end_at        timestamptz not null,
  capacity      int,
  created_at    timestamptz not null default now(),
  check (start_at < end_at)
);
create index events_school_idx on events(school_id);

create table event_signups (
  id            uuid primary key default gen_random_uuid(),
  event_id      uuid not null references events(id) on delete cascade,
  enrollment_id uuid not null references enrollments(id) on delete cascade,
  status        signup_status not null default 'signed_up',
  created_at    timestamptz not null default now(),
  unique (event_id, enrollment_id)
);

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
-- Forretningslogik: automatisk forløb + oplåsning af porte
-- ============================================================================

-- Ved oprettelse af et enrollment: generér module_progress for alle moduler i
-- kategorien. Moduler uden prerequisites starter 'available', resten 'locked'.
create or replace function public.seed_enrollment_progress()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into module_progress (enrollment_id, module_id, status)
  select new.id, m.id,
    case when not exists (
      select 1 from module_prerequisites mp where mp.module_id = m.id
    ) then 'available'::progress_status
      else 'locked'::progress_status end
  from modules m
  where m.category_id = new.category_id;
  return new;
end;
$$;

create trigger trg_enrollment_seed
after insert on enrollments
for each row execute function public.seed_enrollment_progress();

-- Når et modul markeres 'completed': lås de moduler op, hvis ALLE prerequisites
-- nu er completed. Kører kun ved overgangen til completed.
create or replace function public.recompute_progress_unlocks()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'completed' and new.status is distinct from old.status then
    update module_progress mp
    set status = 'available'
    where mp.enrollment_id = new.enrollment_id
      and mp.status = 'locked'
      and mp.module_id in (
        select pre.module_id
        from module_prerequisites pre
        where pre.prerequisite_module_id = new.module_id
      )
      and not exists (
        select 1
        from module_prerequisites req
        join module_progress p2
          on p2.module_id = req.prerequisite_module_id
         and p2.enrollment_id = new.enrollment_id
        where req.module_id = mp.module_id
          and p2.status <> 'completed'
      );
  end if;
  return new;
end;
$$;

create trigger trg_progress_unlock
after update on module_progress
for each row execute function public.recompute_progress_unlocks();
