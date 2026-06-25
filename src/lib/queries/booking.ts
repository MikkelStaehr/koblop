import { createClient } from "@/lib/supabase/server";
import { PRAKSIS_DURATION_MIN } from "@/lib/domain";
import type { LessonType, LessonStatus, ModuleStatus } from "@/lib/database.types";

export interface BookSlot {
  startISO: string;
  endISO: string;
}
export interface BookDay {
  dateISO: string;
  label: string;
  slots: BookSlot[];
}
export interface BookingOptions {
  lesson: { id: string; moduleTitle: string; lessonNo: number } | null;
  reason: string | null;
  days: BookDay[];
}

const DONE: LessonStatus[] = ["gennemfoert", "godkendt"];
const DAYS_AHEAD = 14;

interface RawEnrollment {
  id: string;
  primary_instructor_id: string | null;
  module_progress: {
    order_index: number;
    status: ModuleStatus;
    module_id: string;
    module: { title: string } | null;
  }[];
  lesson_progress: {
    id: string;
    module_id: string;
    type: LessonType;
    status: LessonStatus;
    lesson_no: number;
  }[];
}

function dayLabel(d: Date): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dd = new Date(d);
  dd.setHours(0, 0, 0, 0);
  const diff = Math.round((dd.getTime() - today.getTime()) / 86400000);
  if (diff === 0) return "I dag";
  if (diff === 1) return "I morgen";
  return dd.toLocaleDateString("da-DK", {
    weekday: "long",
    day: "numeric",
    month: "short",
  });
}

function parseHM(t: string): [number, number] {
  const [h, m] = t.split(":").map(Number);
  return [h, m];
}

export async function getBookingOptions(userId: string): Promise<BookingOptions> {
  const supabase = await createClient();

  const { data: raw } = await supabase
    .from("enrollments")
    .select(
      `id, primary_instructor_id,
       module_progress(order_index, status, module_id, module:modules!module_id(title)),
       lesson_progress(id, module_id, type, status, lesson_no)`,
    )
    .eq("student_id", userId)
    .eq("status", "active")
    .maybeSingle();

  const e = raw as unknown as RawEnrollment | null;
  if (!e) return { lesson: null, reason: "Du har ikke et aktivt forløb.", days: [] };

  const activeModule = e.module_progress
    .filter((m) => m.status === "i_gang")
    .sort((a, b) => a.order_index - b.order_index)[0];
  if (!activeModule)
    return { lesson: null, reason: "Du har ingen aktive moduler lige nu.", days: [] };

  const moduleLessons = e.lesson_progress.filter(
    (l) => l.module_id === activeModule.module_id,
  );
  const praksis = moduleLessons.filter((l) => l.type === "praksis");
  if (praksis.length === 0)
    return {
      lesson: null,
      reason: "Dette modul har ingen køretimer at booke.",
      days: [],
    };

  const theoryDone = moduleLessons
    .filter((l) => l.type === "teori")
    .every((l) => DONE.includes(l.status));
  if (!theoryDone)
    return {
      lesson: null,
      reason: "Tag modulets teori først — så åbner køretimerne.",
      days: [],
    };

  const next = praksis
    .filter((l) => l.status === "ikke_planlagt")
    .sort((a, b) => a.lesson_no - b.lesson_no)[0];
  if (!next)
    return {
      lesson: null,
      reason: "Alle køretimer i dette modul er booket.",
      days: [],
    };

  if (!e.primary_instructor_id)
    return {
      lesson: null,
      reason: "Der er ingen kørelærer tilknyttet dit forløb.",
      days: [],
    };

  // ── Generér ledige slots fra lærerens tilgængelighed minus optaget ──────
  const now = new Date();
  const horizon = new Date(now);
  horizon.setDate(horizon.getDate() + DAYS_AHEAD);

  const { data: rules } = await supabase
    .from("availability_rules")
    .select("weekday, start_time, end_time")
    .eq("instructor_id", e.primary_instructor_id);

  const { data: busyRaw } = await supabase.rpc("instructor_busy", {
    p_instructor: e.primary_instructor_id,
    p_from: now.toISOString(),
    p_to: horizon.toISOString(),
  });
  const busy = ((busyRaw ?? []) as { start_at: string; end_at: string }[]).map(
    (b) => [new Date(b.start_at).getTime(), new Date(b.end_at).getTime()] as const,
  );

  const durMs = PRAKSIS_DURATION_MIN * 60000;
  const days: BookDay[] = [];

  for (let i = 0; i < DAYS_AHEAD; i++) {
    const date = new Date(now);
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() + i);
    const weekday = date.getDay(); // 0 = søndag (matcher DB)
    const dayRules = (rules ?? []).filter((r) => r.weekday === weekday);
    const slots: BookSlot[] = [];

    for (const r of dayRules) {
      const [sh, sm] = parseHM(r.start_time as string);
      const [eh, em] = parseHM(r.end_time as string);
      const winStart = new Date(date);
      winStart.setHours(sh, sm, 0, 0);
      const winEnd = new Date(date);
      winEnd.setHours(eh, em, 0, 0);

      for (let t = winStart.getTime(); t + durMs <= winEnd.getTime(); t += durMs) {
        const end = t + durMs;
        if (t < now.getTime()) continue; // ikke i fortiden
        const clash = busy.some(([bs, be]) => t < be && end > bs);
        if (clash) continue;
        slots.push({
          startISO: new Date(t).toISOString(),
          endISO: new Date(end).toISOString(),
        });
      }
    }

    if (slots.length > 0)
      days.push({ dateISO: date.toISOString(), label: dayLabel(date), slots });
  }

  return {
    lesson: {
      id: next.id,
      moduleTitle: activeModule.module?.title ?? "Modul",
      lessonNo: next.lesson_no,
    },
    reason: null,
    days,
  };
}
