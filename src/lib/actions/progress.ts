"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

type Result = { ok: boolean; error?: string };

async function requireStaff() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null as null, error: "Du er ikke logget ind." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile || (profile.role !== "instructor" && profile.role !== "admin"))
    return { supabase, user: null as null, error: "Kun kørelærere kan krydse af." };
  return { supabase, user, error: undefined };
}

function revalidate(enrollmentId: string) {
  revalidatePath(`/elever/${enrollmentId}`);
  revalidatePath("/elever");
  revalidatePath("/");
}

// Kryds en lektion af (godkend) eller fortryd. RLS sikrer at det er egen skole.
export async function toggleLesson(
  lessonId: string,
  done: boolean,
  enrollmentId: string,
): Promise<Result> {
  const { supabase, user, error } = await requireStaff();
  if (error || !user) return { ok: false, error };

  const patch = done
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
    .eq("id", lessonId);
  if (upErr) return { ok: false, error: upErr.message };

  revalidate(enrollmentId);
  return { ok: true };
}

// Godkend et helt modul → DB-trigger låser næste modul op (laast → i_gang).
export async function approveModule(
  moduleProgressId: string,
  enrollmentId: string,
): Promise<Result> {
  const { supabase, user, error } = await requireStaff();
  if (error || !user) return { ok: false, error };

  const { error: upErr } = await supabase
    .from("module_progress")
    .update({
      status: "gennemfoert",
      signed_off_by: user.id,
      signed_off_at: new Date().toISOString(),
    })
    .eq("id", moduleProgressId)
    .in("status", ["i_gang", "afventer_godkendelse"]);
  if (upErr) return { ok: false, error: upErr.message };

  revalidate(enrollmentId);
  return { ok: true };
}

// Genåbn et godkendt modul (fortryd). Låser ikke næste modul igen.
export async function reopenModule(
  moduleProgressId: string,
  enrollmentId: string,
): Promise<Result> {
  const { supabase, user, error } = await requireStaff();
  if (error || !user) return { ok: false, error };

  const { error: upErr } = await supabase
    .from("module_progress")
    .update({ status: "i_gang", signed_off_by: null, signed_off_at: null })
    .eq("id", moduleProgressId)
    .eq("status", "gennemfoert");
  if (upErr) return { ok: false, error: upErr.message };

  revalidate(enrollmentId);
  return { ok: true };
}
