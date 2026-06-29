"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { PRAKSIS_DURATION_MIN } from "@/lib/domain";

// Ledige 45-min slots for den indloggede kørelærer på en given dato.
export async function getDaySlots(dateISO: string): Promise<string[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];
  const { data: prof } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (!prof || prof.role === "student") return [];

  const day = new Date(dateISO);
  day.setHours(0, 0, 0, 0);
  const weekday = day.getDay();
  const { data: rules } = await supabase
    .from("availability_rules")
    .select("start_time, end_time")
    .eq("instructor_id", user.id)
    .eq("weekday", weekday);
  if (!rules || rules.length === 0) return [];

  const dayEnd = new Date(day);
  dayEnd.setDate(dayEnd.getDate() + 1);
  const { data: busyRaw } = await supabase.rpc("instructor_busy", {
    p_instructor: user.id,
    p_from: day.toISOString(),
    p_to: dayEnd.toISOString(),
  });
  const busy = ((busyRaw ?? []) as { start_at: string; end_at: string }[]).map(
    (b) => [new Date(b.start_at).getTime(), new Date(b.end_at).getTime()] as const,
  );

  const durMs = PRAKSIS_DURATION_MIN * 60000;
  const now = Date.now();
  const slots: string[] = [];
  for (const r of rules) {
    const [sh, sm] = (r.start_time as string).split(":").map(Number);
    const [eh, em] = (r.end_time as string).split(":").map(Number);
    const ws = new Date(day);
    ws.setHours(sh, sm, 0, 0);
    const we = new Date(day);
    we.setHours(eh, em, 0, 0);
    for (let t = ws.getTime(); t + durMs <= we.getTime(); t += durMs) {
      if (t < now) continue;
      const end = t + durMs;
      if (busy.some(([bs, be]) => t < be && end > bs)) continue;
      slots.push(new Date(t).toISOString());
    }
  }
  return slots;
}

interface RawLesson {
  id: string;
  type: string;
  status: string;
  module_id: string;
  enrollment: {
    id: string;
    school_id: string;
    module_progress: { module_id: string; status: string }[];
  } | null;
}

// Kørelærer-initieret booking af en elevs næste køretime.
export async function staffScheduleBooking(
  lessonId: string,
  startISO: string,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Ikke logget ind." };
  const { data: prof } = await supabase
    .from("profiles")
    .select("role, school_id")
    .eq("id", user.id)
    .maybeSingle();
  if (!prof || prof.role === "student")
    return { ok: false, error: "Kun kørelærer kan planlægge." };

  const { data: lraw } = await supabase
    .from("lesson_progress")
    .select(
      `id, type, status, module_id,
       enrollment:enrollments!enrollment_id(id, school_id, module_progress(module_id, status))`,
    )
    .eq("id", lessonId)
    .maybeSingle();
  const l = lraw as unknown as RawLesson | null;
  if (!l || !l.enrollment) return { ok: false, error: "Lektion ikke fundet." };
  if (l.enrollment.school_id !== prof.school_id)
    return { ok: false, error: "Eleven hører til en anden skole." };
  if (l.type !== "praksis")
    return { ok: false, error: "Kun køretimer kan planlægges." };
  if (l.status !== "ikke_planlagt")
    return { ok: false, error: "Lektionen er allerede booket." };
  const mod = l.enrollment.module_progress.find(
    (m) => m.module_id === l.module_id,
  );
  if (mod?.status !== "i_gang")
    return { ok: false, error: "Modulet er ikke aktivt endnu." };

  const start = new Date(startISO);
  if (Number.isNaN(start.getTime()) || start < new Date())
    return { ok: false, error: "Vælg et gyldigt tidspunkt i fremtiden." };
  const end = new Date(start.getTime() + PRAKSIS_DURATION_MIN * 60000);

  const { data: busy } = await supabase.rpc("instructor_busy", {
    p_instructor: user.id,
    p_from: start.toISOString(),
    p_to: end.toISOString(),
  });
  if (((busy ?? []) as unknown[]).length > 0)
    return { ok: false, error: "Tidspunktet er allerede optaget." };

  const { error } = await supabase.from("bookings").insert({
    school_id: l.enrollment.school_id,
    enrollment_id: l.enrollment.id,
    lesson_id: l.id,
    instructor_id: user.id,
    start_at: start.toISOString(),
    end_at: end.toISOString(),
  });
  if (error) return { ok: false, error: error.message };

  revalidatePath("/kalender");
  revalidatePath("/");
  return { ok: true };
}
