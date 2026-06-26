import { createClient } from "@/lib/supabase/server";
import type { LessonStatus } from "@/lib/database.types";
import { initials } from "@/lib/queries/dashboard";

export interface ClassRow {
  id: string;
  name: string;
  instructorName: string | null;
  memberCount: number;
  sessionCount: number;
}

export interface ClassMember {
  memberId: string;
  enrollmentId: string;
  studentId: string;
  name: string;
}

export interface ClassSession {
  id: string;
  moduleTitle: string;
  moduleOrder: number;
  lessonNo: number;
  startsAt: string;
  endsAt: string;
  topic: string | null;
  presentCount: number;
}

export interface ModuleOption {
  id: string;
  order: number;
  title: string;
  theoryLessons: number;
}

export interface ClassDetail {
  id: string;
  name: string;
  instructorName: string | null;
  members: ClassMember[];
  sessions: ClassSession[];
}

// ── Liste over hold (til /hold) ────────────────────────────────────────────
export async function listClasses(): Promise<ClassRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("classes")
    .select(
      `id, name,
       instructor:profiles!instructor_id(full_name),
       class_members(count),
       class_sessions(count)`,
    )
    .order("created_at", { ascending: true });

  const rows = (data ?? []) as unknown as {
    id: string;
    name: string;
    instructor: { full_name: string | null } | null;
    class_members: { count: number }[];
    class_sessions: { count: number }[];
  }[];

  return rows.map((c) => ({
    id: c.id,
    name: c.name,
    instructorName: c.instructor?.full_name ?? null,
    memberCount: c.class_members[0]?.count ?? 0,
    sessionCount: c.class_sessions[0]?.count ?? 0,
  }));
}

// ── Ét hold med medlemmer + teorigange (til /hold/[id]) ─────────────────────
export async function getClassDetail(
  classId: string,
): Promise<ClassDetail | null> {
  const supabase = await createClient();

  const { data: raw } = await supabase
    .from("classes")
    .select(
      `id, name,
       instructor:profiles!instructor_id(full_name),
       class_members(
         id, enrollment_id,
         enrollment:enrollments!enrollment_id(student:profiles!student_id(id, full_name))
       ),
       class_sessions(
         id, lesson_no, starts_at, ends_at, topic,
         module:modules!module_id(order_index, title),
         session_attendance(present)
       )`,
    )
    .eq("id", classId)
    .maybeSingle();

  if (!raw) return null;
  const c = raw as unknown as {
    id: string;
    name: string;
    instructor: { full_name: string | null } | null;
    class_members: {
      id: string;
      enrollment_id: string;
      enrollment: {
        student: { id: string; full_name: string | null } | null;
      } | null;
    }[];
    class_sessions: {
      id: string;
      lesson_no: number;
      starts_at: string;
      ends_at: string;
      topic: string | null;
      module: { order_index: number; title: string } | null;
      session_attendance: { present: boolean }[];
    }[];
  };

  const members: ClassMember[] = c.class_members
    .map((m) => ({
      memberId: m.id,
      enrollmentId: m.enrollment_id,
      studentId: m.enrollment?.student?.id ?? "",
      name: m.enrollment?.student?.full_name ?? "Ukendt elev",
    }))
    .sort((a, b) => a.name.localeCompare(b.name, "da"));

  const sessions: ClassSession[] = c.class_sessions
    .map((s) => ({
      id: s.id,
      moduleTitle: s.module?.title ?? "Modul",
      moduleOrder: s.module?.order_index ?? 0,
      lessonNo: s.lesson_no,
      startsAt: s.starts_at,
      endsAt: s.ends_at,
      topic: s.topic,
      presentCount: s.session_attendance.filter((a) => a.present).length,
    }))
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt));

  return {
    id: c.id,
    name: c.name,
    instructorName: c.instructor?.full_name ?? null,
    members,
    sessions,
  };
}

// ── Aktive forløb i skolen der IKKE allerede er på holdet ──────────────────
export async function getAssignableEnrollments(
  classId: string,
): Promise<ClassMember[]> {
  const supabase = await createClient();

  const { data: memberRows } = await supabase
    .from("class_members")
    .select("enrollment_id")
    .eq("class_id", classId);
  const taken = new Set((memberRows ?? []).map((m) => m.enrollment_id));

  const { data } = await supabase
    .from("enrollments")
    .select(`id, student:profiles!student_id(id, full_name)`)
    .eq("status", "active");

  const rows = (data ?? []) as unknown as {
    id: string;
    student: { id: string; full_name: string | null } | null;
  }[];

  return rows
    .filter((e) => !taken.has(e.id))
    .map((e) => ({
      memberId: "",
      enrollmentId: e.id,
      studentId: e.student?.id ?? "",
      name: e.student?.full_name ?? "Ukendt elev",
    }))
    .sort((a, b) => a.name.localeCompare(b.name, "da"));
}

// ── Moduler med teorilektioner (til at oprette en teorigang) ───────────────
export async function getTheoryModules(): Promise<ModuleOption[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("modules")
    .select("id, order_index, title, min_theory_lessons")
    .gt("min_theory_lessons", 0)
    .order("order_index", { ascending: true });

  return (data ?? []).map((m) => ({
    id: m.id,
    order: m.order_index,
    title: m.title,
    theoryLessons: m.min_theory_lessons,
  }));
}

// ── Fremmøde for én teorigang (medlemmer + til stede + teori-lektionsstatus) ─
export interface AttendanceRow {
  enrollmentId: string;
  name: string;
  present: boolean;
  lessonStatus: LessonStatus | null;
}

export interface SessionAttendance {
  sessionId: string;
  classId: string;
  moduleId: string;
  moduleTitle: string;
  lessonNo: number;
  startsAt: string;
  rows: AttendanceRow[];
}

// ── Elevens hold + teorigange (til elev-dashboard/kalender) ────────────────
export interface StudentSession {
  id: string;
  className: string;
  moduleTitle: string;
  moduleOrder: number;
  lessonNo: number;
  startsAt: string;
  endsAt: string;
  topic: string | null;
  instructorName: string | null;
  instructorInitials: string | null;
}

export interface StudentClasses {
  holds: { id: string; name: string; instructorName: string | null }[];
  sessions: StudentSession[]; // alle sessioner, sorteret efter tid
}

export async function getStudentClasses(
  userId: string,
): Promise<StudentClasses> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("enrollments")
    .select(
      `id,
       class_members(
         class:classes!class_id(
           id, name,
           instructor:profiles!instructor_id(full_name),
           class_sessions(
             id, lesson_no, starts_at, ends_at, topic,
             module:modules!module_id(order_index, title)
           )
         )
       )`,
    )
    .eq("student_id", userId)
    .eq("status", "active");

  const rows = (data ?? []) as unknown as {
    class_members: {
      class: {
        id: string;
        name: string;
        instructor: { full_name: string | null } | null;
        class_sessions: {
          id: string;
          lesson_no: number;
          starts_at: string;
          ends_at: string;
          topic: string | null;
          module: { order_index: number; title: string } | null;
        }[];
      } | null;
    }[];
  }[];

  const holds: StudentClasses["holds"] = [];
  const sessions: StudentSession[] = [];

  for (const enr of rows) {
    for (const cm of enr.class_members) {
      const c = cm.class;
      if (!c) continue;
      const instructorName = c.instructor?.full_name ?? null;
      holds.push({ id: c.id, name: c.name, instructorName });
      for (const s of c.class_sessions) {
        sessions.push({
          id: s.id,
          className: c.name,
          moduleTitle: s.module?.title ?? "Modul",
          moduleOrder: s.module?.order_index ?? 0,
          lessonNo: s.lesson_no,
          startsAt: s.starts_at,
          endsAt: s.ends_at,
          topic: s.topic,
          instructorName,
          instructorInitials: instructorName ? initials(instructorName) : null,
        });
      }
    }
  }

  sessions.sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  return { holds, sessions };
}

export async function getSessionAttendance(
  sessionId: string,
): Promise<SessionAttendance | null> {
  const supabase = await createClient();

  const { data: sRaw } = await supabase
    .from("class_sessions")
    .select(
      `id, class_id, module_id, lesson_no, starts_at,
       module:modules!module_id(title)`,
    )
    .eq("id", sessionId)
    .maybeSingle();
  if (!sRaw) return null;
  const s = sRaw as unknown as {
    id: string;
    class_id: string;
    module_id: string;
    lesson_no: number;
    starts_at: string;
    module: { title: string } | null;
  };

  const detail = await getClassDetail(s.class_id);
  const members = detail?.members ?? [];

  const { data: attRows } = await supabase
    .from("session_attendance")
    .select("enrollment_id, present")
    .eq("session_id", sessionId);
  const presentMap = new Map(
    (attRows ?? []).map((a) => [a.enrollment_id, a.present]),
  );

  // Teori-lektionsstatus pr. medlem for præcis denne lektion.
  const enrollmentIds = members.map((m) => m.enrollmentId);
  const statusMap = new Map<string, LessonStatus>();
  if (enrollmentIds.length > 0) {
    const { data: lessons } = await supabase
      .from("lesson_progress")
      .select("enrollment_id, status")
      .in("enrollment_id", enrollmentIds)
      .eq("module_id", s.module_id)
      .eq("type", "teori")
      .eq("lesson_no", s.lesson_no);
    for (const l of lessons ?? [])
      statusMap.set(l.enrollment_id, l.status as LessonStatus);
  }

  return {
    sessionId: s.id,
    classId: s.class_id,
    moduleId: s.module_id,
    moduleTitle: s.module?.title ?? "Modul",
    lessonNo: s.lesson_no,
    startsAt: s.starts_at,
    rows: members.map((m) => ({
      enrollmentId: m.enrollmentId,
      name: m.name,
      present: presentMap.get(m.enrollmentId) ?? false,
      lessonStatus: statusMap.get(m.enrollmentId) ?? null,
    })),
  };
}
