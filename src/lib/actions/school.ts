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
    return { supabase, schoolId: null, error: "Du er ikke logget ind." };
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, school_id")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile || (profile.role !== "instructor" && profile.role !== "admin"))
    return { supabase, schoolId: null, error: "Kun kørelærere kan ændre indstillinger." };
  return { supabase, schoolId: profile.school_id, error: undefined };
}

// ── Skoleoplysninger + afbudsfrist ─────────────────────────────────────────
export async function updateSchool(input: {
  name: string;
  cancellationWindowHours: number;
}): Promise<Result> {
  const { supabase, schoolId, error } = await requireStaff();
  if (error) return { ok: false, error };
  if (!schoolId) return { ok: false, error: "Din profil mangler en skole." };

  const name = input.name.trim();
  if (!name) return { ok: false, error: "Skolen skal have et navn." };
  const hours = Math.round(input.cancellationWindowHours);
  if (!Number.isFinite(hours) || hours < 0 || hours > 168)
    return { ok: false, error: "Afbudsfrist skal være mellem 0 og 168 timer." };

  const { error: upErr } = await supabase
    .from("schools")
    .update({ name, cancellation_window_hours: hours })
    .eq("id", schoolId);
  if (upErr) return { ok: false, error: upErr.message };

  revalidatePath("/indstillinger");
  return { ok: true };
}

// ── Ressourcer (skolevogne) ────────────────────────────────────────────────
export async function createResource(
  name: string,
  type: string,
): Promise<Result> {
  const { supabase, schoolId, error } = await requireStaff();
  if (error) return { ok: false, error };
  if (!schoolId) return { ok: false, error: "Din profil mangler en skole." };
  const trimmed = name.trim();
  if (!trimmed) return { ok: false, error: "Ressourcen skal have et navn." };

  const { error: insErr } = await supabase.from("resources").insert({
    school_id: schoolId,
    name: trimmed,
    type: type.trim() || "car",
  });
  if (insErr) return { ok: false, error: insErr.message };

  revalidatePath("/indstillinger");
  return { ok: true };
}

export async function setResourceActive(
  resourceId: string,
  active: boolean,
): Promise<Result> {
  const { supabase, error } = await requireStaff();
  if (error) return { ok: false, error };

  const { error: upErr } = await supabase
    .from("resources")
    .update({ active })
    .eq("id", resourceId);
  if (upErr) return { ok: false, error: upErr.message };

  revalidatePath("/indstillinger");
  return { ok: true };
}

export async function deleteResource(resourceId: string): Promise<Result> {
  const { supabase, error } = await requireStaff();
  if (error) return { ok: false, error };

  const { error: delErr } = await supabase
    .from("resources")
    .delete()
    .eq("id", resourceId);
  if (delErr) return { ok: false, error: delErr.message };

  revalidatePath("/indstillinger");
  return { ok: true };
}
