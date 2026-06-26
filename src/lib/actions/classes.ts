"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

type Result = { ok: boolean; error?: string };

async function requireStaff() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return { supabase, user: null as null, schoolId: null, error: "Du er ikke logget ind." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, school_id")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile || (profile.role !== "instructor" && profile.role !== "admin"))
    return { supabase, user: null as null, schoolId: null, error: "Kun kørelærere kan styre hold." };
  return { supabase, user, schoolId: profile.school_id, error: undefined };
}

// ── Hold ────────────────────────────────────────────────────────────────
export async function createClass(
  name: string,
  instructorId: string | null,
): Promise<{ ok: boolean; error?: string; id?: string }> {
  const { supabase, user, schoolId, error } = await requireStaff();
  if (error || !user) return { ok: false, error };
  if (!schoolId) return { ok: false, error: "Din profil mangler en skole." };
  const trimmed = name.trim();
  if (!trimmed) return { ok: false, error: "Holdet skal have et navn." };

  const { data, error: insErr } = await supabase
    .from("classes")
    .insert({
      school_id: schoolId,
      name: trimmed,
      instructor_id: instructorId ?? user.id,
    })
    .select("id")
    .single();
  if (insErr) return { ok: false, error: insErr.message };

  revalidatePath("/hold");
  return { ok: true, id: data.id };
}

export async function renameClass(
  classId: string,
  name: string,
): Promise<Result> {
  const { supabase, user, error } = await requireStaff();
  if (error || !user) return { ok: false, error };
  const trimmed = name.trim();
  if (!trimmed) return { ok: false, error: "Holdet skal have et navn." };

  const { error: upErr } = await supabase
    .from("classes")
    .update({ name: trimmed })
    .eq("id", classId);
  if (upErr) return { ok: false, error: upErr.message };

  revalidatePath("/hold");
  revalidatePath(`/hold/${classId}`);
  return { ok: true };
}

export async function deleteClass(classId: string): Promise<Result> {
  const { supabase, user, error } = await requireStaff();
  if (error || !user) return { ok: false, error };

  const { error: delErr } = await supabase
    .from("classes")
    .delete()
    .eq("id", classId);
  if (delErr) return { ok: false, error: delErr.message };

  revalidatePath("/hold");
  return { ok: true };
}

// ── Medlemmer ─────────────────────────────────────────────────────────────
export async function addMember(
  classId: string,
  enrollmentId: string,
): Promise<Result> {
  const { supabase, user, error } = await requireStaff();
  if (error || !user) return { ok: false, error };

  const { error: insErr } = await supabase
    .from("class_members")
    .insert({ class_id: classId, enrollment_id: enrollmentId });
  if (insErr) return { ok: false, error: insErr.message };

  revalidatePath(`/hold/${classId}`);
  revalidatePath("/hold");
  return { ok: true };
}

export async function removeMember(
  memberId: string,
  classId: string,
): Promise<Result> {
  const { supabase, user, error } = await requireStaff();
  if (error || !user) return { ok: false, error };

  const { error: delErr } = await supabase
    .from("class_members")
    .delete()
    .eq("id", memberId);
  if (delErr) return { ok: false, error: delErr.message };

  revalidatePath(`/hold/${classId}`);
  revalidatePath("/hold");
  return { ok: true };
}

// ── Teorigange ─────────────────────────────────────────────────────────────
export async function createSession(input: {
  classId: string;
  moduleId: string;
  lessonNo: number;
  startsAt: string; // ISO
  durationMin: number;
  topic: string | null;
}): Promise<Result> {
  const { supabase, user, error } = await requireStaff();
  if (error || !user) return { ok: false, error };

  const start = new Date(input.startsAt);
  if (Number.isNaN(start.getTime()))
    return { ok: false, error: "Ugyldigt tidspunkt." };
  if (!Number.isFinite(input.lessonNo) || input.lessonNo < 1)
    return { ok: false, error: "Vælg en teorilektion." };
  const end = new Date(start.getTime() + input.durationMin * 60000);

  const { error: insErr } = await supabase.from("class_sessions").insert({
    class_id: input.classId,
    module_id: input.moduleId,
    lesson_no: input.lessonNo,
    starts_at: start.toISOString(),
    ends_at: end.toISOString(),
    topic: input.topic?.trim() || null,
  });
  if (insErr) return { ok: false, error: insErr.message };

  revalidatePath(`/hold/${input.classId}`);
  return { ok: true };
}

export async function deleteSession(
  sessionId: string,
  classId: string,
): Promise<Result> {
  const { supabase, user, error } = await requireStaff();
  if (error || !user) return { ok: false, error };

  const { error: delErr } = await supabase
    .from("class_sessions")
    .delete()
    .eq("id", sessionId);
  if (delErr) return { ok: false, error: delErr.message };

  revalidatePath(`/hold/${classId}`);
  return { ok: true };
}

// ── Fremmøde: markér til stede → gennemfør (godkend) elevens teorilektion ──
export async function setAttendance(input: {
  sessionId: string;
  classId: string;
  enrollmentId: string;
  moduleId: string;
  lessonNo: number;
  present: boolean;
}): Promise<Result> {
  const { supabase, user, error } = await requireStaff();
  if (error || !user) return { ok: false, error };

  // 1) Opdatér/indsæt fremmøde-rækken.
  const { error: attErr } = await supabase
    .from("session_attendance")
    .upsert(
      {
        session_id: input.sessionId,
        enrollment_id: input.enrollmentId,
        present: input.present,
      },
      { onConflict: "session_id,enrollment_id" },
    );
  if (attErr) return { ok: false, error: attErr.message };

  // 2) Synk teori-lektionen for denne elev (godkend ved fremmøde, fortryd ellers).
  const patch = input.present
    ? {
        status: "godkendt" as const,
        approved_by: user.id,
        completed_at: new Date().toISOString(),
      }
    : {
        status: "ikke_planlagt" as const,
        approved_by: null,
        completed_at: null,
      };

  const { error: upErr } = await supabase
    .from("lesson_progress")
    .update(patch)
    .eq("enrollment_id", input.enrollmentId)
    .eq("module_id", input.moduleId)
    .eq("type", "teori")
    .eq("lesson_no", input.lessonNo);
  if (upErr) return { ok: false, error: upErr.message };

  revalidatePath(`/hold/${input.classId}`);
  revalidatePath("/elever");
  revalidatePath("/");
  return { ok: true };
}
