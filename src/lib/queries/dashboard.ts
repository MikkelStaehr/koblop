import { createClient } from "@/lib/supabase/server";
import { addDays } from "@/lib/dates";
import type {
  LessonType,
  LessonStatus,
  ModuleStatus,
  PracticalVenue,
  EnrollmentStatus,
  RequirementType,
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

export interface Notice {
  id: string;
  tone: "info" | "success" | "warning";
  title: string;
  body?: string;
  from?: string;
}

export interface Person {
  name: string;
  initials: string;
}

export interface AgendaItem {
  id: string;
  start: string;
  end: string;
  venueLabel: string;
  title: string;
  people: Person[];
  tone: EventTone;
  bookingId?: string; // sat for rigtige bookinger → kan aflyses
}

export interface MessageItem {
  id: string;
  sender: string;
  initials: string;
  body: string;
  createdAt: string;
}

export function initials(name?: string | null): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  const a = parts[0]?.[0] ?? "";
  const b = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (a + b).toUpperCase() || "?";
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
  status: EnrollmentStatus;
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

// ── Næste 7 dage (agenda til forsiden) ────────────────────────────────────

interface RawAgendaBooking {
  id: string;
  start_at: string;
  end_at: string;
  status: string;
  enrollment: { student: { full_name: string | null } | null } | null;
  instructor: { full_name: string | null } | null;
  lesson: {
    type: LessonType;
    venue: PracticalVenue;
    module: { title: string } | null;
  } | null;
}

export async function getAgenda(
  userId: string,
  role: "student" | "instructor" | "admin",
): Promise<AgendaItem[]> {
  const supabase = await createClient();
  const now = new Date();
  const in7 = new Date(now);
  in7.setDate(in7.getDate() + 7);

  let q = supabase
    .from("bookings")
    .select(
      `id, start_at, end_at, status,
       enrollment:enrollments!enrollment_id(student:profiles!student_id(full_name)),
       instructor:profiles!instructor_id(full_name),
       lesson:lesson_progress!lesson_id(type, venue, module:modules!module_id(title))`,
    )
    .neq("status", "cancelled")
    .gte("start_at", now.toISOString())
    .lt("start_at", in7.toISOString())
    .order("start_at", { ascending: true });

  // Kørelærer: kun egne bookinger. Elev: RLS begrænser allerede til egne.
  if (role !== "student") q = q.eq("instructor_id", userId);

  const { data } = await q;
  const bookings = (data ?? []) as unknown as RawAgendaBooking[];
  return bookings.map((b) => {
    const venueLabel = b.lesson ? venueShort(b.lesson.venue) : "Køretime";
    const tone: EventTone = b.status === "completed" ? "green" : "blue";
    if (role === "student") {
      const inst = b.instructor?.full_name ?? null;
      return {
        id: b.id,
        start: b.start_at,
        end: b.end_at,
        venueLabel,
        title: b.lesson?.module?.title ?? "Køretime",
        people: inst ? [{ name: inst, initials: initials(inst) }] : [],
        tone,
        bookingId: b.status === "booked" ? b.id : undefined,
      };
    }
    const stud = b.enrollment?.student?.full_name ?? "Elev";
    return {
      id: b.id,
      start: b.start_at,
      end: b.end_at,
      venueLabel,
      title: stud,
      people: [{ name: stud, initials: initials(stud) }],
      tone,
      bookingId: b.status === "booked" ? b.id : undefined,
    };
  });
}

export async function getMessages(): Promise<MessageItem[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("messages")
    .select(`id, body, created_at, sender:profiles!sender_id(full_name)`)
    .order("created_at", { ascending: false })
    .limit(6);
  const rows = (data ?? []) as unknown as {
    id: string;
    body: string;
    created_at: string;
    sender: { full_name: string | null } | null;
  }[];
  return rows.map((m) => ({
    id: m.id,
    sender: m.sender?.full_name ?? "Ukendt",
    initials: initials(m.sender?.full_name),
    body: m.body,
    createdAt: m.created_at,
  }));
}

// ── Kørelærerens dashboard ────────────────────────────────────────────────

interface RawEnrollment {
  id: string;
  started_at: string;
  status: EnrollmentStatus;
  student: { id: string; full_name: string | null; email: string | null } | null;
  module_progress: { order_index: number; status: ModuleStatus; module: { title: string } | null }[];
  lesson_progress: { type: LessonType; status: LessonStatus }[];
}

const ROSTER_SELECT = `id, started_at, status,
   student:profiles!student_id(id, full_name, email),
   module_progress(order_index, status, module:modules!module_id(title)),
   lesson_progress(type, status)`;

function mapStudentRow(e: RawEnrollment): StudentRow {
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
    status: e.status,
  };
}

// Elevliste til /elever — inkluderer pauserede så de kan findes/genaktiveres.
// Aktive først, derefter pauserede; alfabetisk inden for hver gruppe.
export async function getStudentRoster(): Promise<StudentRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("enrollments")
    .select(ROSTER_SELECT)
    .in("status", ["active", "paused"]);
  const rows = (data ?? []) as unknown as RawEnrollment[];
  return rows.map(mapStudentRow).sort((a, b) => {
    if (a.status !== b.status) return a.status === "active" ? -1 : 1;
    return a.name.localeCompare(b.name, "da");
  });
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
  notices: Notice[];
}

export async function getInstructorDashboard(
  userId: string,
  weekStart: Date,
): Promise<InstructorDashboard> {
  const supabase = await createClient();
  const weekEnd = addDays(weekStart, 7);

  const { data: enrollRaw } = await supabase
    .from("enrollments")
    .select(ROSTER_SELECT)
    .eq("status", "active");

  const enrollments = (enrollRaw ?? []) as unknown as RawEnrollment[];

  const students: StudentRow[] = enrollments
    .map(mapStudentRow)
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

  const { data: cancelledRaw } = await supabase
    .from("bookings")
    .select(
      `start_at, enrollment:enrollments!enrollment_id(student:profiles!student_id(full_name))`,
    )
    .eq("instructor_id", userId)
    .eq("status", "cancelled")
    .order("cancelled_at", { ascending: false })
    .limit(3);
  const cancelled = (cancelledRaw ?? []) as unknown as {
    start_at: string;
    enrollment: { student: { full_name: string | null } | null } | null;
  }[];

  const awaiting = enrollments.filter((e) =>
    e.module_progress.some((m) => m.status === "afventer_godkendelse"),
  ).length;

  const notices: Notice[] = [];
  for (const c of cancelled) {
    notices.push({
      id: `cancel-${c.start_at}`,
      tone: "warning",
      title: `${c.enrollment?.student?.full_name ?? "En elev"} har aflyst en køretime`,
      body: new Date(c.start_at).toLocaleString("da-DK", {
        weekday: "long",
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      }),
    });
  }
  if (awaiting > 0)
    notices.push({
      id: "await",
      tone: "warning",
      title: `${awaiting} elev${awaiting === 1 ? "" : "er"} afventer din godkendelse`,
    });
  notices.push({
    id: "week",
    tone: "info",
    title: `${events.length} booking${events.length === 1 ? "" : "er"} denne uge`,
  });

  return { students, events, availability, notices };
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

export interface StudentRequirement {
  title: string;
  type: RequirementType;
  completed: boolean;
}

export interface StudentDashboard {
  modules: StudentModuleRow[];
  requirements: StudentRequirement[];
  events: CalEvent[];
  availability: AvailabilityBand[];
  notices: Notice[];
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
  enrollment_requirements: {
    completed: boolean;
    requirement: {
      title: string;
      type: RequirementType;
      order_index: number;
    } | null;
  }[];
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
       lesson_progress(module_id, type, status),
       enrollment_requirements(completed, requirement:additional_requirements!requirement_id(title, type, order_index))`,
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

  const requirements: StudentRequirement[] = e.enrollment_requirements
    .filter((r) => r.requirement)
    .sort((a, b) => a.requirement!.order_index - b.requirement!.order_index)
    .map((r) => ({
      title: r.requirement!.title,
      type: r.requirement!.type,
      completed: r.completed,
    }));

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

  // Næste kommende køretime (også ud over denne uge) til feed-påmindelse.
  const { data: nextRaw } = await supabase
    .from("bookings")
    .select(
      `start_at, lesson:lesson_progress!lesson_id(venue, module:modules!module_id(title))`,
    )
    .eq("enrollment_id", e.id)
    .neq("status", "cancelled")
    .gte("start_at", new Date().toISOString())
    .order("start_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  const next = nextRaw as unknown as {
    start_at: string;
    lesson: { venue: PracticalVenue; module: { title: string } | null } | null;
  } | null;

  const notices: Notice[] = [];
  if (next) {
    const when = new Date(next.start_at).toLocaleString("da-DK", {
      weekday: "long",
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
    notices.push({
      id: "next",
      tone: "success",
      title: "Din næste køretime",
      body: `${when}${next.lesson ? ` · ${venueShort(next.lesson.venue)}` : ""}`,
    });
  }
  const current = modules.find((m) => m.status === "i_gang");
  if (current) {
    notices.push({
      id: "current",
      tone: "info",
      title: `Du er i gang med ${current.title}`,
      body: `Teori ${current.theoryDone}/${current.theoryTotal} · Køretimer ${current.praksisDone}/${current.praksisTotal}`,
    });
  }
  return { modules, requirements, events, availability, notices };
}
