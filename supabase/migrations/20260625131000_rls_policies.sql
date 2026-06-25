-- ============================================================================
-- Row Level Security — multi-tenant isolation
-- ============================================================================
-- Princip:
--   * Læreplan (categories/modules/module_prerequisites) er central reference-
--     data: alle indloggede må læse, ingen må skrive (kun service_role/migration).
--   * Tenant-data scopes på school_id = current_school_id().
--   * Elever ser kun egne forløb/bookinger; admin+instructor ser hele skolen.
-- ============================================================================

alter table schools                 enable row level security;
alter table profiles                enable row level security;
alter table categories              enable row level security;
alter table modules                 enable row level security;
alter table module_prerequisites    enable row level security;
alter table enrollments             enable row level security;
alter table module_progress         enable row level security;
alter table resources               enable row level security;
alter table availability_rules      enable row level security;
alter table availability_exceptions enable row level security;
alter table bookings                enable row level security;
alter table events                  enable row level security;
alter table event_signups           enable row level security;

-- ---------- Central læreplan: læsbar for alle indloggede --------------------
create policy "curriculum_read_categories" on categories
  for select to authenticated using (true);
create policy "curriculum_read_modules" on modules
  for select to authenticated using (true);
create policy "curriculum_read_prereqs" on module_prerequisites
  for select to authenticated using (true);

-- ---------- schools --------------------------------------------------------
create policy "school_select_own" on schools
  for select to authenticated
  using (id = current_school_id());

create policy "school_update_admin" on schools
  for update to authenticated
  using (id = current_school_id() and current_user_role() = 'admin')
  with check (id = current_school_id() and current_user_role() = 'admin');

-- ---------- profiles -------------------------------------------------------
create policy "profile_select_school_or_self" on profiles
  for select to authenticated
  using (school_id = current_school_id() or id = auth.uid());

create policy "profile_insert" on profiles
  for insert to authenticated
  with check (
    id = auth.uid()
    or (current_user_role() in ('admin','instructor') and school_id = current_school_id())
  );

create policy "profile_update" on profiles
  for update to authenticated
  using (id = auth.uid() or (current_user_role() = 'admin' and school_id = current_school_id()))
  with check (id = auth.uid() or (current_user_role() = 'admin' and school_id = current_school_id()));

-- ---------- enrollments ----------------------------------------------------
create policy "enrollment_select" on enrollments
  for select to authenticated
  using (
    (school_id = current_school_id() and current_user_role() in ('admin','instructor'))
    or student_id = auth.uid()
  );

create policy "enrollment_write_staff" on enrollments
  for all to authenticated
  using (school_id = current_school_id() and current_user_role() in ('admin','instructor'))
  with check (school_id = current_school_id() and current_user_role() in ('admin','instructor'));

-- ---------- module_progress ------------------------------------------------
create policy "progress_select" on module_progress
  for select to authenticated
  using (
    exists (
      select 1 from enrollments e
      where e.id = module_progress.enrollment_id
        and (
          (e.school_id = current_school_id() and current_user_role() in ('admin','instructor'))
          or e.student_id = auth.uid()
        )
    )
  );

-- Kun staff må ændre status (afkrydsning). Trigger-seed kører som security definer.
create policy "progress_write_staff" on module_progress
  for all to authenticated
  using (
    exists (
      select 1 from enrollments e
      where e.id = module_progress.enrollment_id
        and e.school_id = current_school_id()
        and current_user_role() in ('admin','instructor')
    )
  )
  with check (
    exists (
      select 1 from enrollments e
      where e.id = module_progress.enrollment_id
        and e.school_id = current_school_id()
        and current_user_role() in ('admin','instructor')
    )
  );

-- ---------- resources ------------------------------------------------------
create policy "resource_select" on resources
  for select to authenticated
  using (school_id = current_school_id());

create policy "resource_write_staff" on resources
  for all to authenticated
  using (school_id = current_school_id() and current_user_role() in ('admin','instructor'))
  with check (school_id = current_school_id() and current_user_role() in ('admin','instructor'));

-- ---------- availability ---------------------------------------------------
-- Hele skolen må læse tilgængelighed (elever skal kunne se ledige tider).
create policy "availability_rules_select" on availability_rules
  for select to authenticated
  using (school_id = current_school_id());

create policy "availability_rules_write" on availability_rules
  for all to authenticated
  using (
    school_id = current_school_id()
    and (current_user_role() = 'admin' or instructor_id = auth.uid())
  )
  with check (
    school_id = current_school_id()
    and (current_user_role() = 'admin' or instructor_id = auth.uid())
  );

create policy "availability_exceptions_select" on availability_exceptions
  for select to authenticated
  using (school_id = current_school_id());

create policy "availability_exceptions_write" on availability_exceptions
  for all to authenticated
  using (
    school_id = current_school_id()
    and (current_user_role() = 'admin' or instructor_id = auth.uid())
  )
  with check (
    school_id = current_school_id()
    and (current_user_role() = 'admin' or instructor_id = auth.uid())
  );

-- ---------- bookings -------------------------------------------------------
create policy "booking_select" on bookings
  for select to authenticated
  using (
    (school_id = current_school_id() and current_user_role() in ('admin','instructor'))
    or exists (
      select 1 from enrollments e
      where e.id = bookings.enrollment_id and e.student_id = auth.uid()
    )
  );

-- Elev må oprette booking på eget forløb; staff må oprette for skolen.
create policy "booking_insert" on bookings
  for insert to authenticated
  with check (
    school_id = current_school_id()
    and (
      current_user_role() in ('admin','instructor')
      or exists (
        select 1 from enrollments e
        where e.id = bookings.enrollment_id and e.student_id = auth.uid()
      )
    )
  );

-- Både elev (eget forløb) og staff må ændre/aflyse.
create policy "booking_update" on bookings
  for update to authenticated
  using (
    (school_id = current_school_id() and current_user_role() in ('admin','instructor'))
    or exists (
      select 1 from enrollments e
      where e.id = bookings.enrollment_id and e.student_id = auth.uid()
    )
  )
  with check (school_id = current_school_id());

-- ---------- events ---------------------------------------------------------
create policy "event_select" on events
  for select to authenticated
  using (school_id = current_school_id());

create policy "event_write_staff" on events
  for all to authenticated
  using (school_id = current_school_id() and current_user_role() in ('admin','instructor'))
  with check (school_id = current_school_id() and current_user_role() in ('admin','instructor'));

-- ---------- event_signups --------------------------------------------------
create policy "event_signup_select" on event_signups
  for select to authenticated
  using (
    exists (
      select 1 from events ev
      where ev.id = event_signups.event_id
        and ev.school_id = current_school_id()
        and current_user_role() in ('admin','instructor')
    )
    or exists (
      select 1 from enrollments e
      where e.id = event_signups.enrollment_id and e.student_id = auth.uid()
    )
  );

create policy "event_signup_write" on event_signups
  for all to authenticated
  using (
    exists (
      select 1 from events ev
      where ev.id = event_signups.event_id and ev.school_id = current_school_id()
        and current_user_role() in ('admin','instructor')
    )
    or exists (
      select 1 from enrollments e
      where e.id = event_signups.enrollment_id and e.student_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from events ev
      where ev.id = event_signups.event_id and ev.school_id = current_school_id()
    )
  );
