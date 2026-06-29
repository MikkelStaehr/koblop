-- ============================================================================
-- Gruppe-events: manøvrebane / glatbane / førstehjælp
-- ============================================================================
-- Én session med tid+sted hvor flere elever tilmeldes. Fremmøde (attended)
-- markeres senere i en server-action, der så gennemfører elevens matchende
-- praksislektion (manøvrebane/glatbane) eller lovkrav (førstehjælp).
-- Mønsteret følger teorihold (class_sessions/session_attendance).
-- ============================================================================

create type event_type as enum ('manoevrebane', 'glatbane', 'foerstehjaelp');

create table school_events (
  id            uuid primary key default gen_random_uuid(),
  school_id     uuid not null references schools(id) on delete cascade,
  instructor_id uuid references profiles(id),
  type          event_type not null,
  title         text,
  location      text,
  starts_at     timestamptz not null,
  ends_at       timestamptz not null,
  capacity      int,
  created_at    timestamptz not null default now(),
  check (starts_at < ends_at)
);
create index school_events_school_idx on school_events(school_id, starts_at);

create table event_attendees (
  id            uuid primary key default gen_random_uuid(),
  event_id      uuid not null references school_events(id) on delete cascade,
  enrollment_id uuid not null references enrollments(id) on delete cascade,
  attended      boolean not null default false,
  created_at    timestamptz not null default now(),
  unique (event_id, enrollment_id)
);
create index event_attendees_event_idx      on event_attendees(event_id);
create index event_attendees_enrollment_idx on event_attendees(enrollment_id);

-- Skole-id for et event (uden RLS) — bryder policy-rekursion på attendees.
create or replace function public.event_school_id(p_event uuid)
returns uuid language sql stable security definer set search_path = public as $$
  select school_id from school_events where id = p_event;
$$;

alter table school_events   enable row level security;
alter table event_attendees enable row level security;

create policy "school_events_staff_all" on school_events
  for all to authenticated
  using (school_id = current_school_id() and current_user_role() in ('admin','instructor'))
  with check (school_id = current_school_id() and current_user_role() in ('admin','instructor'));

create policy "school_events_student_read" on school_events
  for select to authenticated
  using (
    exists (
      select 1 from event_attendees ea
      join enrollments e on e.id = ea.enrollment_id
      where ea.event_id = school_events.id and e.student_id = auth.uid()
    )
  );

create policy "event_attendees_staff_all" on event_attendees
  for all to authenticated
  using (
    event_school_id(event_id) = current_school_id()
    and current_user_role() in ('admin','instructor')
  )
  with check (
    event_school_id(event_id) = current_school_id()
    and current_user_role() in ('admin','instructor')
  );

create policy "event_attendees_student_read" on event_attendees
  for select to authenticated
  using (
    exists (
      select 1 from enrollments e
      where e.id = event_attendees.enrollment_id and e.student_id = auth.uid()
    )
  );
