"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { PRAKSIS_DURATION_MIN } from "@/lib/domain";

interface RawLesson {
  id: string;
  type: string;
  status: string;
  module_id: string;
  enrollment: {
    id: string;
    school_id: string;
    student_id: string;
    primary_instructor_id: string | null;
    module_progress: { module_id: string; status: string }[];
  } | null;
}

export async function bookSlot(
  lessonId: string,
  startISO: string,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Du er ikke logget ind." };

  const { data: lessonRaw } = await supabase
    .from("lesson_progress")
    .select(
      `id, type, status, module_id,
       enrollment:enrollments!enrollment_id(
         id, school_id, student_id, primary_instructor_id,
         module_progress(module_id, status))`,
    )
    .eq("id", lessonId)
    .maybeSingle();

  const l = lessonRaw as unknown as RawLesson | null;
  if (!l || !l.enrollment) return { ok: false, error: "Lektion ikke fundet." };

  const enr = l.enrollment;
  if (enr.student_id !== user.id)
    return { ok: false, error: "Det er ikke din lektion." };
  if (l.type !== "praksis")
    return { ok: false, error: "Kun køretimer kan bookes." };
  if (l.status !== "ikke_planlagt")
    return { ok: false, error: "Lektionen er allerede booket." };

  const mod = enr.module_progress.find((m) => m.module_id === l.module_id);
  if (mod?.status !== "i_gang")
    return { ok: false, error: "Modulet er ikke aktivt endnu." };
  if (!enr.primary_instructor_id)
    return { ok: false, error: "Ingen kørelærer tilknyttet." };

  const start = new Date(startISO);
  if (Number.isNaN(start.getTime()) || start < new Date())
    return { ok: false, error: "Vælg et gyldigt tidspunkt i fremtiden." };
  const end = new Date(start.getTime() + PRAKSIS_DURATION_MIN * 60000);

  // Tjek at læreren ikke allerede er optaget (security-definer RPC).
  const { data: busy } = await supabase.rpc("instructor_busy", {
    p_instructor: enr.primary_instructor_id,
    p_from: start.toISOString(),
    p_to: end.toISOString(),
  });
  if (((busy ?? []) as unknown[]).length > 0)
    return { ok: false, error: "Tidspunktet er allerede optaget." };

  const { error } = await supabase.from("bookings").insert({
    school_id: enr.school_id,
    enrollment_id: enr.id,
    lesson_id: l.id,
    instructor_id: enr.primary_instructor_id,
    start_at: start.toISOString(),
    end_at: end.toISOString(),
  });
  if (error) return { ok: false, error: error.message };

  revalidatePath("/book");
  revalidatePath("/");
  revalidatePath("/kalender");
  return { ok: true };
}

interface RawCancelBooking {
  id: string;
  start_at: string;
  status: string;
  enrollment: { student_id: string } | null;
  school: { cancellation_window_hours: number } | null;
}

// Aflys en booking. Elev kan kun aflyse uden for skolens frist; staff når som
// helst. Booking-triggeren sætter lektionen tilbage til 'ikke_planlagt'.
export async function cancelBooking(
  bookingId: string,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Du er ikke logget ind." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  const isStaff = profile?.role === "instructor" || profile?.role === "admin";

  const { data: raw } = await supabase
    .from("bookings")
    .select(
      `id, start_at, status,
       enrollment:enrollments!enrollment_id(student_id),
       school:schools!school_id(cancellation_window_hours)`,
    )
    .eq("id", bookingId)
    .maybeSingle();

  const b = raw as unknown as RawCancelBooking | null;
  if (!b) return { ok: false, error: "Booking ikke fundet." };
  if (b.status !== "booked")
    return { ok: false, error: "Bookingen kan ikke aflyses." };

  const isOwner = b.enrollment?.student_id === user.id;
  if (!isStaff && !isOwner)
    return { ok: false, error: "Du kan ikke aflyse denne booking." };

  // Frist gælder kun elever — staff kan aflyse når som helst.
  if (!isStaff) {
    const windowH = b.school?.cancellation_window_hours ?? 24;
    const deadline = new Date(b.start_at).getTime() - windowH * 3600_000;
    if (new Date().getTime() > deadline)
      return {
        ok: false,
        error: `For sent at aflyse online — fristen er ${windowH} timer før. Kontakt din kørelærer.`,
      };
  }

  const { error } = await supabase
    .from("bookings")
    .update({
      status: "cancelled",
      cancelled_by: user.id,
      cancelled_at: new Date().toISOString(),
    })
    .eq("id", bookingId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/");
  revalidatePath("/kalender");
  revalidatePath("/book");
  return { ok: true };
}
