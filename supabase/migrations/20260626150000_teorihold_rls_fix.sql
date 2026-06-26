-- ============================================================================
-- Fix: uendelig rekursion i teorihold-RLS.
--
-- Problemet: classes-policyen læste class_members, og class_members-policyen
-- læste classes (begge under RLS) → policyerne kaldte hinanden i ring
-- (Postgres-fejl 42P17). Samme mønster for class_sessions/session_attendance.
--
-- Løsning: flyt alle "parent"-opslag (skole via hold, hold-medlemskab) ind i
-- SECURITY DEFINER-funktioner, der ikke selv udløser RLS. Så krydser policyerne
-- ikke længere hinandens tabeller under RLS.
-- ============================================================================

-- Skole-id for et hold (uden RLS).
create or replace function public.class_school_id(p_class uuid)
returns uuid language sql stable security definer set search_path = public as $$
  select school_id from classes where id = p_class;
$$;

-- Skole-id for en teorigang via dens hold (uden RLS).
create or replace function public.session_school_id(p_session uuid)
returns uuid language sql stable security definer set search_path = public as $$
  select c.school_id
  from class_sessions s join classes c on c.id = s.class_id
  where s.id = p_session;
$$;

-- Er den indloggede elev medlem af holdet? (uden RLS).
create or replace function public.is_class_member(p_class uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from class_members cm
    join enrollments e on e.id = cm.enrollment_id
    where cm.class_id = p_class and e.student_id = auth.uid()
  );
$$;

-- ---------- classes --------------------------------------------------------
drop policy if exists "classes_student_read" on classes;
create policy "classes_student_read" on classes
  for select to authenticated
  using (is_class_member(id));

-- ---------- class_members --------------------------------------------------
drop policy if exists "class_members_staff_all" on class_members;
create policy "class_members_staff_all" on class_members
  for all to authenticated
  using (
    class_school_id(class_id) = current_school_id()
    and current_user_role() in ('admin','instructor')
  )
  with check (
    class_school_id(class_id) = current_school_id()
    and current_user_role() in ('admin','instructor')
  );

-- ---------- class_sessions -------------------------------------------------
drop policy if exists "class_sessions_staff_all" on class_sessions;
create policy "class_sessions_staff_all" on class_sessions
  for all to authenticated
  using (
    class_school_id(class_id) = current_school_id()
    and current_user_role() in ('admin','instructor')
  )
  with check (
    class_school_id(class_id) = current_school_id()
    and current_user_role() in ('admin','instructor')
  );

drop policy if exists "class_sessions_student_read" on class_sessions;
create policy "class_sessions_student_read" on class_sessions
  for select to authenticated
  using (is_class_member(class_id));

-- ---------- session_attendance ---------------------------------------------
drop policy if exists "session_attendance_staff_all" on session_attendance;
create policy "session_attendance_staff_all" on session_attendance
  for all to authenticated
  using (
    session_school_id(session_id) = current_school_id()
    and current_user_role() in ('admin','instructor')
  )
  with check (
    session_school_id(session_id) = current_school_id()
    and current_user_role() in ('admin','instructor')
  );
