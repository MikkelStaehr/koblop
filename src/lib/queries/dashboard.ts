import { createClient } from "@/lib/supabase/server";
import { addDays } from "@/lib/dates";
import type {
  LessonType,
  LessonStatus,
  ModuleStatus,
  PracticalVenue,
} from "@/lib/database.types";

export type EventTone = "blue" | "green" | "amber" | "slate";

export interface CalEvent {
  id: string;
  start: string; // ISO
  end: string; // ISO
  title: string;
  subtitle?: string;
  tone: EventTone;
}

export interface AvailabilityBand {
  weekday: number; // DB: 0 = søndag
  start: string; // "HH:MM"
  end: string;
}

export interface StudentRow {
  enrollmentId: string;
  studentId: string;
  name: string;
  email: string | null;
  startedAt: string;
  currentModule: string | null;
  currentModuleOrder: number | null;
  lessonsDone: number;
  lessonsTotal: number;
}

const DONE: LessonStatus[] = ["gennemfoert", "godkendt"];

function venueShort(v: PracticalVenue): string {
  return v === "lukket_oevelsesplads"
    ? "Manøvrebane"
    : v === "koereteknisk_anlaeg"
      ? "Glatbane"
      : v === "vej"
        ? "Vej"
        : "Teori";
}

// ── Kørelærerens dashboard ────────────────────────────────────────────────

interface RawEnrollment {
  id: string;
  started_at: string;
  student: { id: string; full_name: string | null; email: string | null } | null;
  module_progress: { order_index: number; status: ModuleStatus; module: { title: string } | null }[];
  lesson_progress: { type: LessonType; status: LessonStatus }[];
}

interface RawBooking {
  id: string;
  start_at: string;
  end_at: string;
  status: string;
  enrollment: { student: { full_name: string | null } | null } | null;
  lesson: { type: LessonType; venue: PracticalVenue; module: { title: string } | null } | null;
}

export interface InstructorDashboard {
  students: StudentRow[];
  events: CalEvent[];
  availability: AvailabilityBand[];
}

export async function getInstructorDashboard(
  userId: string,
  weekStart: Date,
): Promise<InstructorDashboard> {
  const supabase = await createClient();
  const weekEnd = addDays(weekStart, 7);

  const { data: enrollRaw } = await supabase
    .from("enrollments")
    .select(
      `id, started_at,
       student:profiles!student_id(id, full_name, email),
       module_progress(order_index, status, module:modules!module_id(title)),
       lesson_progress(type, status)`,
    )
    .eq("status", "active");

  const enrollments = (enrollRaw ?? []) as unknown as RawEnrollment[];

  const students: StudentRow[] = enrollments
    .map((e) => {
      const current = e.module_progress
        .filter((m) => m.status === "i_gang")
        .sort((a, b) => a.order_index - b.order_index)[0];
      const done = e.lesson_progress.filter((l) => DONE.includes(l.status)).length;
      return {
        enrollmentId: e.id,
        studentId: e.student?.id ?? "",
        name: e.student?.full_name ?? "Ukendt elev",
        email: e.student?.email ?? null,
        startedAt: e.started_at,
        currentModule: current?.module?.title ?? null,
        currentModuleOrder: current?.order_index ?? null,
        lessonsDone: done,
        lessonsTotal: e.lesson_progress.length,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name, "da"));

  const { data: bookingRaw } = await supabase
    .from("bookings")
    .select(
      `id, start_at, end_at, status,
       enrollment:enrollments!enrollment_id(student:profiles!student_id(full_name)),
       lesson:lesson_progress!lesson_id(type, venue, module:modules!module_id(title))`,
    )
    .eq("instructor_id", userId)
    .neq("status", "cancelled")
    .gte("start_at", weekStart.toISOString())
    .lt("start_at", weekEnd.toISOString());

  const bookings = (bookingRaw ?? []) as unknown as RawBooking[];
  const events: CalEvent[] = bookings.map((b) => ({
    id: b.id,
    start: b.start_at,
    end: b.end_at,
    title: b.enrollment?.student?.full_name ?? "Elev",
    subtitle: b.lesson
      ? `${venueShort(b.lesson.venue)} · ${b.lesson.module?.title ?? ""}`
      : undefined,
    tone: b.status === "completed" ? "green" : "blue",
  }));

  const { data: rules } = await supabase
    .from("availability_rules")
    .select("weekday, start_time, end_time")
    .eq("instructor_id", userId);

  const availability: AvailabilityBand[] = (rules ?? []).map((r) => ({
    weekday: r.weekday,
    start: (r.start_time as string).slice(0, 5),
    end: (r.end_time as string).slice(0, 5),
  }));

  return { students, events, availability };
}

// ── Elevens dashboard ─────────────────────────────────────────────────────

export interface StudentModuleRow {
  order: number;
  title: string;
  status: ModuleStatus;
  theoryDone: number;
  theoryTotal: number;
  praksisDone: number;
  praksisTotal: number;
}

export interface StudentDashboard {
  modules: StudentModuleRow[];
  events: CalEvent[];
  availability: AvailabilityBand[];
}

interface RawStudentEnrollment {
  id: string;
  primary_instructor_id: string | null;
  module_progress: {
    order_index: number;
    status: ModuleStatus;
    module_id: string;
    module: { title: string } | null;
  }[];
  lesson_progress: { module_id: string; type: LessonType; status: LessonStatus }[];
}

export async function getStudentDashboard(
  userId: string,
  weekStart: Date,
): Promise<StudentDashboard | null> {
  const supabase = await createClient();
  const weekEnd = addDays(weekStart, 7);

  const { data: raw } = await supabase
    .from("enrollments")
    .select(
      `id, primary_instructor_id,
       module_progress(order_index, status, module:modules!module_id(title), module_id),
       lesson_progress(module_id, type, status)`,
    )
    .eq("student_id", userId)
    .eq("status", "active")
    .maybeSingle();

  if (!raw) return null;
  const e = raw as unknown as RawStudentEnrollment;

  const modules: StudentModuleRow[] = e.module_progress
    .sort((a, b) => a.order_index - b.order_index)
    .map((m) => {
      const lessons = e.lesson_progress.filter((l) => l.module_id === m.module_id);
      const theory = lessons.filter((l) => l.type === "teori");
      const praksis = lessons.filter((l) => l.type === "praksis");
      return {
        order: m.order_index,
        title: m.module?.title ?? `Modul ${m.order_index}`,
        status: m.status,
        theoryDone: theory.filter((l) => DONE.includes(l.status)).length,
        theoryTotal: theory.length,
        praksisDone: praksis.filter((l) => DONE.includes(l.status)).length,
        praksisTotal: praksis.length,
      };
    });

  const { data: bookingRaw } = await supabase
    .from("bookings")
    .select(
      `id, start_at, end_at, status,
       lesson:lesson_progress!lesson_id(type, venue, module:modules!module_id(title))`,
    )
    .eq("enrollment_id", e.id)
    .neq("status", "cancelled")
    .gte("start_at", weekStart.toISOString())
    .lt("start_at", weekEnd.toISOString());

  const bookings = (bookingRaw ?? []) as unknown as RawBooking[];
  const events: CalEvent[] = bookings.map((b) => ({
    id: b.id,
    start: b.start_at,
    end: b.end_at,
    title: b.lesson ? venueShort(b.lesson.venue) : "Køretime",
    subtitle: b.lesson?.module?.title ?? undefined,
    tone: b.status === "completed" ? "green" : "blue",
  }));

  let availability: AvailabilityBand[] = [];
  if (e.primary_instructor_id) {
    const { data: rules } = await supabase
      .from("availability_rules")
      .select("weekday, start_time, end_time")
      .eq("instructor_id", e.primary_instructor_id);
    availability = (rules ?? []).map((r) => ({
      weekday: r.weekday,
      start: (r.start_time as string).slice(0, 5),
      end: (r.end_time as string).slice(0, 5),
    }));
  }

  return { modules, events, availability };
}
