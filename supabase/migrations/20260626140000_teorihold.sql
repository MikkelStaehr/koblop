-- ============================================================================
-- Teorihold: kohorte (gruppe eleven hører til) + planlagte teorigange +
-- fremmøde-afkrydsning. Hold er et organiserings-lag oven på elever der
-- allerede hører til skolen (profiles.school_id / enrollments.school_id).
--
-- Fremmøde gennemføres i server-action (ikke trigger): når en elev markeres
-- til stede på en teorigang, sættes den matchende teori-lektion til 'godkendt'.
-- ============================================================================

-- ---------- Hold (kohorte) -------------------------------------------------
create table classes (
  id            uuid primary key default gen_random_uuid(),
  school_id     uuid not null references schools(id) on delete cascade,
  name          text not null,
  instructor_id uuid references profiles(id),
  created_at    timestamptz not null default now()
);
create index classes_school_idx on classes(school_id);

-- ---------- Medlemskab (eleven knyttes til holdet via sit forløb) ----------
create table class_members (
  id            uuid primary key default gen_random_uuid(),
  class_id      uuid not null references classes(id) on delete cascade,
  enrollment_id uuid not null references enrollments(id) on delete cascade,
  created_at    timestamptz not null default now(),
  unique (class_id, enrollment_id)
);
create index class_members_class_idx      on class_members(class_id);
create index class_members_enrollment_idx on class_members(enrollment_id);

-- ---------- Teorigange (planlagt session for holdet) -----------------------
-- Dækker ÉN teorilektion i et modul (module_id + lesson_no), så fremmøde
-- præcist kan gennemføre den rigtige lesson_progress-række.
create table class_sessions (
  id         uuid primary key default gen_random_uuid(),
  class_id   uuid not null references classes(id) on delete cascade,
  module_id  uuid not null references modules(id),
  lesson_no  int  not null,
  starts_at  timestamptz not null,
  ends_at    timestamptz not null,
  topic      text,
  created_at timestamptz not null default now(),
  check (starts_at < ends_at)
);
create index class_sessions_class_idx on class_sessions(class_id, starts_at);

-- ---------- Fremmøde -------------------------------------------------------
create table session_attendance (
  id            uuid primary key default gen_random_uuid(),
  session_id    uuid not null references class_sessions(id) on delete cascade,
  enrollment_id uuid not null references enrollments(id) on delete cascade,
  present       boolean not null default false,
  created_at    timestamptz not null default now(),
  unique (session_id, enrollment_id)
);
create index session_attendance_session_idx on session_attendance(session_id);

-- ============================================================================
-- RLS: staff (admin/instructor) styrer egen skoles hold; elever læser egne.
-- ============================================================================
alter table classes            enable row level security;
alter table class_members      enable row level security;
alter table class_sessions     enable row level security;
alter table session_attendance enable row level security;

-- ---------- classes --------------------------------------------------------
create policy "classes_staff_all" on classes
  for all to authenticated
  using (school_id = current_school_id() and current_user_role() in ('admin','instructor'))
  with check (school_id = current_school_id() and current_user_role() in ('admin','instructor'));
create policy "classes_student_read" on classes
  for select to authenticated
  using (
    exists (
      select 1 from class_members cm
      join enrollments e on e.id = cm.enrollment_id
      where cm.class_id = classes.id and e.student_id = auth.uid()
    )
  );

-- ---------- class_members --------------------------------------------------
create policy "class_members_staff_all" on class_members
  for all to authenticated
  using (
    exists (select 1 from classes c
            where c.id = class_members.class_id
              and c.school_id = current_school_id()
              and current_user_role() in ('admin','instructor'))
  )
  with check (
    exists (select 1 from classes c
            where c.id = class_members.class_id
              and c.school_id = current_school_id()
              and current_user_role() in ('admin','instructor'))
  );
create policy "class_members_student_read" on class_members
  for select to authenticated
  using (
    exists (select 1 from enrollments e
            where e.id = class_members.enrollment_id and e.student_id = auth.uid())
  );

-- ---------- class_sessions -------------------------------------------------
create policy "class_sessions_staff_all" on class_sessions
  for all to authenticated
  using (
    exists (select 1 from classes c
            where c.id = class_sessions.class_id
              and c.school_id = current_school_id()
              and current_user_role() in ('admin','instructor'))
  )
  with check (
    exists (select 1 from classes c
            where c.id = class_sessions.class_id
              and c.school_id = current_school_id()
              and current_user_role() in ('admin','instructor'))
  );
create policy "class_sessions_student_read" on class_sessions
  for select to authenticated
  using (
    exists (
      select 1 from class_members cm
      join enrollments e on e.id = cm.enrollment_id
      where cm.class_id = class_sessions.class_id and e.student_id = auth.uid()
    )
  );

-- ---------- session_attendance ---------------------------------------------
create policy "session_attendance_staff_all" on session_attendance
  for all to authenticated
  using (
    exists (select 1 from class_sessions s
            join classes c on c.id = s.class_id
            where s.id = session_attendance.session_id
              and c.school_id = current_school_id()
              and current_user_role() in ('admin','instructor'))
  )
  with check (
    exists (select 1 from class_sessions s
            join classes c on c.id = s.class_id
            where s.id = session_attendance.session_id
              and c.school_id = current_school_id()
              and current_user_role() in ('admin','instructor'))
  );
create policy "session_attendance_student_read" on session_attendance
  for select to authenticated
  using (
    exists (select 1 from enrollments e
            where e.id = session_attendance.enrollment_id and e.student_id = auth.uid())
  );
